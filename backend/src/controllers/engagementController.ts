import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

// ---------------------------------------------------------------------------
// Account engagement (LinkedIn-style): profile views, post impressions,
// search appearances + follower growth. Backed by `engagement_events`
// (migration 014). All recording is fire-and-forget and never blocks the
// request it piggybacks on; reads degrade to zeros if the table is missing.
// ---------------------------------------------------------------------------

type EngagementType = 'profile_view' | 'post_impression' | 'search_appearance';

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** Deterministic id => one unique (type, owner, actor, post, day) row. */
const eventId = (type: EngagementType, owner: string, actor: string, post: string, day: string) =>
    `${type}|${owner}|${post}|${actor}|${day}`;

const makeRow = (type: EngagementType, owner: string, actor: string, post = '') => {
    const day = dayKey();
    return {
        id: eventId(type, owner, actor, post, day),
        data: { type, owner, actor, post: post || undefined, day, createdAt: new Date().toISOString() },
    };
};

/**
 * Record a single profile view. Exported so the public profile endpoint
 * (auth/profile/:id) can call it directly — the one chokepoint every profile
 * view passes through. Self-views are ignored. Never throws.
 */
export const recordProfileViewEvent = async (viewerId?: string, ownerId?: string): Promise<void> => {
    try {
        if (!viewerId || !ownerId || String(viewerId) === String(ownerId)) return;
        const row = makeRow('profile_view', String(ownerId), String(viewerId));
        await supabase.from('engagement_events').upsert([row], { onConflict: 'id', ignoreDuplicates: true });
    } catch (e: any) {
        // engagement is best-effort; a logging table issue must not break profiles
        console.debug('[engagement] recordProfileViewEvent skipped:', e?.message || e);
    }
};

/**
 * Record that a set of users appeared in `actorId`'s search/discover results.
 * Exported so list endpoints (getUsersByRole, searchUsers, listCofounders) can
 * record server-side — one chokepoint per endpoint covers every consumer.
 * Self-appearances are skipped. Never throws.
 */
export const recordSearchAppearanceEvents = async (actorId?: string, ownerIds?: string[]): Promise<void> => {
    try {
        if (!actorId || !Array.isArray(ownerIds)) return;
        const ids = Array.from(
            new Set(ownerIds.map((x) => String(x)).filter((x) => x && x !== String(actorId)))
        ).slice(0, 200);
        if (ids.length === 0) return;
        const rows = ids.map((owner) => makeRow('search_appearance', owner, String(actorId)));
        await supabase.from('engagement_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    } catch (e: any) {
        console.debug('[engagement] recordSearchAppearanceEvents skipped:', e?.message || e);
    }
};

// POST /api/engagement/profile-view/:userId  (explicit client fallback)
export const recordProfileView = async (req: AuthRequest, res: Response) => {
    await recordProfileViewEvent(req.user?.id ? String(req.user.id) : undefined, String(req.params.userId));
    return res.json({ ok: true });
};

// POST /api/engagement/impressions   body: { postIds: string[] }
export const recordImpressions = async (req: AuthRequest, res: Response) => {
    try {
        const actor = req.user?.id;
        if (!actor) return res.status(401).json({ message: 'Unauthorized' });

        const rawPostIds: string[] = (Array.isArray(req.body?.postIds) ? req.body.postIds : [])
            .map((x: any) => String(x))
            .filter((x: string) => Boolean(x));
        const postIds: string[] = Array.from(new Set(rawPostIds)).slice(0, 200);
        if (postIds.length === 0) return res.json({ ok: true, recorded: 0 });

        // Map each post to its author so the impression counts toward the owner.
        const { data: posts } = await supabase.from('posts').select('id, data').in('id', postIds);
        const rows = (posts || [])
            .map((p: any) => ({ id: p.id, author: p.data?.author }))
            .filter((p) => p.author && String(p.author) !== String(actor))
            .map((p) => makeRow('post_impression', String(p.author), String(actor), String(p.id)));

        if (rows.length === 0) return res.json({ ok: true, recorded: 0 });
        await supabase.from('engagement_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
        return res.json({ ok: true, recorded: rows.length });
    } catch (error: any) {
        // Never surface as an error to the feed; just no-op.
        return res.json({ ok: true, recorded: 0 });
    }
};

// POST /api/engagement/search-appearances   body: { userIds: string[] }
export const recordSearchAppearances = async (req: AuthRequest, res: Response) => {
    try {
        const actor = req.user?.id;
        if (!actor) return res.status(401).json({ message: 'Unauthorized' });

        const rawUserIds: string[] = (Array.isArray(req.body?.userIds) ? req.body.userIds : [])
            .map((x: any) => String(x))
            .filter((x: string) => Boolean(x) && x !== String(actor));
        const userIds: string[] = Array.from(new Set(rawUserIds)).slice(0, 200);
        if (userIds.length === 0) return res.json({ ok: true, recorded: 0 });

        const rows = userIds.map((owner) => makeRow('search_appearance', owner, String(actor)));
        await supabase.from('engagement_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
        return res.json({ ok: true, recorded: rows.length });
    } catch (error: any) {
        return res.json({ ok: true, recorded: 0 });
    }
};

const trendPct = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;

// GET /api/engagement/me  — aggregated engagement for the current user.
export const getMyEngagement = async (req: AuthRequest, res: Response) => {
    try {
        const me = req.user?.id;
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        const since30 = new Date(now - 30 * DAY).toISOString();
        const win7 = now - 7 * DAY;
        const win14 = now - 14 * DAY;

        // All of this user's engagement events for the last 30 days (bounded).
        const { data: evRows, error: evErr } = await supabase
            .from('engagement_events')
            .select('data, created_at')
            .eq('data->>owner', String(me))
            .gte('created_at', since30);

        // Table not migrated yet (or transient error) → return a zeroed payload
        // so the dashboard card renders instead of 500-ing.
        const events = evErr ? [] : (evRows || []);

        const metricFor = (type: EngagementType) => {
            let cur = 0, prev = 0;
            for (const r of events) {
                if (r.data?.type !== type) continue;
                const t = new Date(r.created_at as any).getTime();
                if (t >= win7) cur++;
                else if (t >= win14) prev++;
            }
            return { count: cur, prevCount: prev, trendPct: trendPct(cur, prev) };
        };

        // Recent unique viewers (latest first), for the "who viewed you" list.
        const viewEvents = events
            .filter((r) => r.data?.type === 'profile_view' && r.data?.actor)
            .sort((a, b) => new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime());

        const latestByActor = new Map<string, string>(); // actorId -> viewedAt (ISO, most recent)
        for (const r of viewEvents) {
            const actor = String(r.data.actor);
            if (!latestByActor.has(actor)) latestByActor.set(actor, r.created_at as any);
        }
        const totalViewers = latestByActor.size;
        const topActorIds = Array.from(latestByActor.keys()).slice(0, 20);

        let recentViewers: any[] = [];
        if (topActorIds.length) {
            const { data: viewerRows } = await supabase.from('users').select('id, data').in('id', topActorIds);
            const byId = new Map((viewerRows || []).map((u: any) => [String(u.id), u.data || {}]));
            recentViewers = topActorIds.map((id) => {
                const d: any = byId.get(id) || {};
                return {
                    id,
                    name: d.name || 'NextIgnition member',
                    avatar: d.avatar || null,
                    role: d.role || (Array.isArray(d.roles) ? d.roles[0] : '') || '',
                    viewedAt: latestByActor.get(id) || null,
                };
            });
        }

        // Follower growth from the existing follows table.
        const [{ count: followerTotal }, { data: recentFollows }] = await Promise.all([
            supabase.from('follows').select('id', { count: 'exact', head: true }).eq('data->>following', String(me)),
            supabase.from('follows').select('created_at').eq('data->>following', String(me)).gte('created_at', new Date(now - 14 * DAY).toISOString()),
        ]);
        let fCur = 0, fPrev = 0;
        for (const r of recentFollows || []) {
            const t = new Date(r.created_at as any).getTime();
            if (t >= win7) fCur++;
            else if (t >= win14) fPrev++;
        }

        return res.json({
            periodDays: 7,
            profileViews: metricFor('profile_view'),
            postImpressions: metricFor('post_impression'),
            searchAppearances: metricFor('search_appearance'),
            followers: {
                total: followerTotal || 0,
                newThisPeriod: fCur,
                prevPeriod: fPrev,
                trendPct: trendPct(fCur, fPrev),
            },
            recentViewers,
            totalViewers,
        });
    } catch (error: any) {
        console.error('getMyEngagement error:', error?.message || error);
        return res.status(500).json({ message: 'Failed to fetch engagement', error: error?.message });
    }
};
