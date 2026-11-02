import jwt from 'jsonwebtoken';
import axios from 'axios';
import { gunzipSync } from 'zlib';

/**
 * Apple App Store download statistics, read from the App Store Connect API
 * (Sales and Trends reports). Mirrors services/playStoreStats.ts.
 *
 * Required env vars (set these on the backend host, e.g. Render):
 *   APPSTORE_ISSUER_ID           - App Store Connect -> Users and Access -> Integrations
 *                                  -> App Store Connect API -> Issuer ID
 *   APPSTORE_KEY_ID              - the API key's Key ID (create a key with the
 *                                  "Sales and Reports" role)
 *   APPSTORE_PRIVATE_KEY_BASE64  - base64 of the downloaded AuthKey_<KEYID>.p8 file
 *                                  (or APPSTORE_PRIVATE_KEY with literal \n newlines)
 *   APPSTORE_VENDOR_NUMBER       - App Store Connect -> Payments and Financial Reports
 *                                  (top-left, e.g. 87654321)
 *
 * Returns null (never throws) when unconfigured or on any failure, so the admin
 * dashboard keeps working even if the integration isn't set up.
 */

export interface AppStoreStats {
    /** App units (first-time downloads) on the latest reported day. */
    dailyDownloads: number;
    /** App units for the latest complete monthly report. */
    monthlyDownloads: number;
    /** Month the monthly figure covers (YYYY-MM). */
    monthOf: string | null;
    /** Date of the latest daily report (YYYY-MM-DD). */
    asOf: string | null;
}

const API_BASE = 'https://api.appstoreconnect.apple.com/v1/salesReports';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — sales reports update at most daily

let cache: { data: AppStoreStats | null; expires: number } | null = null;

const loadConfig = () => {
    const issuerId = process.env.APPSTORE_ISSUER_ID;
    const keyId = process.env.APPSTORE_KEY_ID;
    const vendorNumber = process.env.APPSTORE_VENDOR_NUMBER;
    const b64 = process.env.APPSTORE_PRIVATE_KEY_BASE64;
    const raw = process.env.APPSTORE_PRIVATE_KEY;
    const privateKey = b64 ? Buffer.from(b64, 'base64').toString('utf8') : raw?.replace(/\\n/g, '\n');
    if (!issuerId || !keyId || !vendorNumber || !privateKey) return null;
    return { issuerId, keyId, vendorNumber, privateKey };
};

/** Short-lived ES256 JWT for the App Store Connect API. */
const makeToken = (cfg: NonNullable<ReturnType<typeof loadConfig>>) =>
    jwt.sign(
        { iss: cfg.issuerId, aud: 'appstoreconnect-v1', exp: Math.floor(Date.now() / 1000) + 10 * 60 },
        cfg.privateKey,
        { algorithm: 'ES256', keyid: cfg.keyId },
    );

/**
 * Sum app-download units from a gzipped TSV sales report.
 * Product Type Identifiers starting with "1" are app downloads
 * (1 / 1F / 1T / 1E...), "7*" are updates and excluded, "F1" is a re-download.
 */
const sumDownloadUnits = (gzipped: Buffer): number => {
    const text = gunzipSync(gzipped).toString('utf8');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return 0;

    const header = lines[0].split('\t').map(h => h.trim());
    const iType = header.findIndex(h => h.toLowerCase() === 'product type identifier');
    const iUnits = header.findIndex(h => h.toLowerCase() === 'units');
    if (iType === -1 || iUnits === -1) return 0;

    let total = 0;
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const ptid = (cols[iType] || '').trim();
        if (ptid.startsWith('1') || ptid === 'F1') {
            const units = parseInt((cols[iUnits] || '').trim(), 10);
            if (Number.isFinite(units)) total += units;
        }
    }
    return total;
};

/** Fetch one sales report; returns null on 404 (report not yet available). */
const fetchReport = async (
    cfg: NonNullable<ReturnType<typeof loadConfig>>,
    frequency: 'DAILY' | 'MONTHLY',
    reportDate: string,
): Promise<number | null> => {
    try {
        const res = await axios.get(API_BASE, {
            params: {
                'filter[frequency]': frequency,
                'filter[reportType]': 'SALES',
                'filter[reportSubType]': 'SUMMARY',
                'filter[vendorNumber]': cfg.vendorNumber,
                'filter[reportDate]': reportDate,
            },
            headers: { Authorization: `Bearer ${makeToken(cfg)}`, Accept: 'application/a-gzip' },
            responseType: 'arraybuffer',
            timeout: 20000,
        });
        return sumDownloadUnits(Buffer.from(res.data));
    } catch (e: any) {
        if (e?.response?.status === 404) return null; // report for that date doesn't exist (yet)
        throw e;
    }
};

const fmtDay = (d: Date) => d.toISOString().slice(0, 10);
const fmtMonth = (d: Date) => d.toISOString().slice(0, 7);

const fetchStats = async (): Promise<AppStoreStats | null> => {
    const cfg = loadConfig();
    if (!cfg) return null;

    // 1. Latest daily report — Apple publishes with ~1 day lag; walk back up to 5 days.
    let dailyDownloads = 0;
    let asOf: string | null = null;
    for (let back = 1; back <= 5; back++) {
        const d = new Date(Date.now() - back * 24 * 60 * 60 * 1000);
        const units = await fetchReport(cfg, 'DAILY', fmtDay(d));
        if (units !== null) {
            dailyDownloads = units;
            asOf = fmtDay(d);
            break;
        }
    }

    // 2. Latest monthly report — try last month, then the month before.
    let monthlyDownloads = 0;
    let monthOf: string | null = null;
    for (let back = 1; back <= 2; back++) {
        const d = new Date();
        d.setUTCMonth(d.getUTCMonth() - back);
        const units = await fetchReport(cfg, 'MONTHLY', fmtMonth(d));
        if (units !== null) {
            monthlyDownloads = units;
            monthOf = fmtMonth(d);
            break;
        }
    }

    if (asOf === null && monthOf === null) return null;
    return { dailyDownloads, monthlyDownloads, monthOf, asOf };
};

/** Cached, fault-tolerant accessor used by the admin dashboard. */
export const getAppStoreStats = async (): Promise<AppStoreStats | null> => {
    const now = Date.now();
    if (cache && cache.expires > now) return cache.data;
    try {
        const data = await fetchStats();
        cache = { data, expires: now + CACHE_TTL_MS };
        return data;
    } catch (e: any) {
        console.error('[appStoreStats] failed to fetch download stats:', e?.message || e);
        // Cache the failure briefly so a misconfig/outage doesn't slow every dashboard load.
        cache = { data: null, expires: now + 30 * 60 * 1000 };
        return null;
    }
};
