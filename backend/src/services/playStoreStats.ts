import { JWT } from 'google-auth-library';

/**
 * Play Store install statistics, read from the Google Cloud Storage bucket that
 * Google Play Console auto-exports report CSVs to (gs://pubsite_prod_<id>).
 *
 * Required env vars (set these on the backend host, e.g. Render):
 *   PLAY_GCS_BUCKET          - bucket id WITHOUT the gs:// prefix
 *                              (Play Console -> Download reports -> "Copy Cloud Storage URI",
 *                               e.g. pubsite_prod_1234567890)
 *   PLAY_GCS_SA_JSON_BASE64  - base64 of the service-account JSON key that has
 *                              read access to that bucket (Storage Object Viewer)
 *   PLAY_APP_PACKAGE         - optional, defaults to com.nextignition.app
 *
 * Returns null (never throws) when unconfigured or on any failure, so the admin
 * dashboard keeps working even if the integration isn't set up.
 */

export interface PlayInstallStats {
    /** Cumulative unique users who have ever installed (Total User Installs). */
    totalInstalls: number;
    /** Devices that currently have the app installed (Active Device Installs). */
    activeInstalls: number;
    /** New device installs on the latest reported day. */
    dailyInstalls: number;
    /** Date of the latest row in the report (YYYY-MM-DD). */
    asOf: string | null;
    packageName: string;
}

const READ_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — install reports update at most daily

let cache: { data: PlayInstallStats | null; expires: number } | null = null;

const getPackageName = () => process.env.PLAY_APP_PACKAGE || 'com.nextignition.app';

const loadServiceAccount = (): { client_email: string; private_key: string } | null => {
    const b64 = process.env.PLAY_GCS_SA_JSON_BASE64;
    const raw = process.env.PLAY_GCS_SA_JSON;
    const json = b64 ? Buffer.from(b64, 'base64').toString('utf8') : raw;
    if (!json) return null;
    try {
        const parsed = JSON.parse(json);
        if (!parsed.client_email || !parsed.private_key) return null;
        return parsed;
    } catch (e) {
        console.error('[playStoreStats] PLAY_GCS_SA_JSON(_BASE64) is not valid JSON');
        return null;
    }
};

/** Parse the UTF-16LE "overview" CSV by header name, returning the latest data row's stats. */
const parseOverviewCsv = (buf: Buffer, packageName: string): PlayInstallStats | null => {
    // Play Console report CSVs are UTF-16LE encoded.
    let text = buf.toString('utf16le');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;

    const header = lines[0].split(',').map(h => h.trim());
    const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());
    const iDate = idx('Date');
    const iTotal = idx('Total User Installs');
    const iActive = idx('Active Device Installs');
    const iDaily = idx('Daily Device Installs');
    if (iTotal === -1 && iActive === -1) return null;

    const last = lines[lines.length - 1].split(',');
    const num = (i: number) => {
        if (i === -1) return 0;
        const v = parseInt((last[i] || '').replace(/[^0-9-]/g, ''), 10);
        return Number.isFinite(v) ? v : 0;
    };

    return {
        totalInstalls: num(iTotal),
        activeInstalls: num(iActive),
        dailyInstalls: num(iDaily),
        asOf: iDate !== -1 ? (last[iDate] || '').trim() || null : null,
        packageName,
    };
};

const fetchStats = async (): Promise<PlayInstallStats | null> => {
    const bucket = process.env.PLAY_GCS_BUCKET;
    const sa = loadServiceAccount();
    if (!bucket || !sa) return null;

    const packageName = getPackageName();
    const client = new JWT({ email: sa.client_email, key: sa.private_key, scopes: [READ_SCOPE] });

    // 1. List the monthly overview CSVs for this package and pick the most recent month.
    const prefix = `stats/installs/installs_${packageName}_`;
    const listUrl =
        `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o` +
        `?prefix=${encodeURIComponent(prefix)}&fields=items(name)`;

    const listRes = await client.request<{ items?: { name: string }[] }>({ url: listUrl });
    const items = (listRes.data.items || []).map(i => i.name).filter(n => n.endsWith('_overview.csv'));
    if (items.length === 0) {
        console.warn(`[playStoreStats] no overview reports found for ${packageName} in bucket ${bucket}`);
        return null;
    }

    // File names embed YYYYMM (installs_<pkg>_YYYYMM_overview.csv) — lexical sort == chronological.
    items.sort();
    const latest = items[items.length - 1];

    // 2. Download the latest month's report.
    const mediaUrl =
        `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/` +
        `${encodeURIComponent(latest)}?alt=media`;
    const fileRes = await client.request<ArrayBuffer>({ url: mediaUrl, responseType: 'arraybuffer' });

    return parseOverviewCsv(Buffer.from(fileRes.data), packageName);
};

/** Cached, fault-tolerant accessor used by the admin dashboard. */
export const getPlayInstallStats = async (): Promise<PlayInstallStats | null> => {
    const now = Date.now();
    if (cache && cache.expires > now) return cache.data;
    try {
        const data = await fetchStats();
        cache = { data, expires: now + CACHE_TTL_MS };
        return data;
    } catch (e: any) {
        console.error('[playStoreStats] failed to fetch install stats:', e?.message || e);
        // Cache the failure briefly so a misconfig/outage doesn't slow every dashboard load.
        cache = { data: null, expires: now + 30 * 60 * 1000 };
        return null;
    }
};
