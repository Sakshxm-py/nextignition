import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { io } from '../utils/socket';
import crypto from 'crypto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mapRow = (e: any) => ({
    ...e.data,
    _id: e.id,
    id: e.id,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
});

// ─── Episodes ────────────────────────────────────────────────────────────────

export const listPodcastEpisodes = async (req: Request, res: Response) => {
    try {
        const { contentType, sessionType, featured, limit = '50' } = req.query;

        let query = supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('data->>isPublished', 'true')
            .neq('data->>sessionType', 'live'); // recorded only via this endpoint

        if (contentType && contentType !== 'all')
            query = query.eq('data->>contentType', String(contentType));
        if (sessionType && sessionType !== 'all')
            query = query.eq('data->>sessionType', String(sessionType));
        if (featured === 'true')
            query = query.eq('data->>featured', 'true');

        const { data: rows, error } = await query;
        if (error) throw error;

        let episodes = (rows || []).sort(
            (a, b) =>
                new Date(b.data?.publishDate || 0).getTime() -
                new Date(a.data?.publishDate || 0).getTime()
        );
        episodes = episodes.slice(0, parseInt(String(limit), 10));

        res.json(episodes.map(mapRow));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPodcastEpisode = async (req: Request, res: Response) => {
    try {
        const { data: row, error } = await supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('id', req.params.id)
            .single();

        if (error || !row) return res.status(404).json({ message: 'Episode not found' });

        const newPlays = (row.data?.plays || 0) + 1;
        await supabase
            .from('podcast_episodes')
            .update({ data: { ...row.data, plays: newPlays }, updated_at: new Date().toISOString() })
            .eq('id', req.params.id);

        res.json({ ...row.data, plays: newPlays, _id: row.id, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

// ✅ NEW: Check eligibility for podcast upload
const checkPodcastEligibility = async (userId: string) => {
    const { data: row, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (userError || !row) {
        return { eligible: false, reason: 'User not found' };
    }

    // Most user fields live in the JSONB `data` column (some mirror to top-level).
    const data: any = (row as any).data || {};

    // Premium bypass: paid users (iOS StoreKit IAP sets data.iapPremium; web
    // uses a pro/elite plan) skip the maturity gate, since the paywall promises
    // podcast publishing. Admin approval still screens every upload for spam.
    const isPremium =
        data.iapPremium === true ||
        [(row as any).founder_plan, (row as any).expert_plan, (row as any).investor_plan,
         data.founder_plan, data.expert_plan, data.investor_plan]
            .map((p: any) => String(p || '').toLowerCase())
            .some((p: string) => p === 'pro' || p === 'elite');
    if (isPremium) {
        return { eligible: true };
    }

    // Requirement 1: Profile age >= 30 days
    const createdAtVal = data.createdAt || (row as any).created_at || (row as any).createdAt;
    const profileAge = Math.floor(
        (new Date().getTime() - new Date(createdAtVal).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (profileAge < 30) {
        return { eligible: false, reason: `Profile must be 30+ days old (${profileAge} days)` };
    }

    // Requirement 2: Connections >= 50
    const connectionCount = ((data.connections || (row as any).connections) || []).length;
    if (connectionCount < 50) {
        return { eligible: false, reason: `Need 50+ connections (${connectionCount} connections)` };
    }

    // Requirement 3: Engagement score >= 30%
    const { data: userStats } = await supabase
        .from('user_engagement')
        .select('engagementScore')
        .eq('userId', userId)
        .single();

    const engagementScore = userStats?.engagementScore || 0;
    if (engagementScore < 30) {
        return { eligible: false, reason: `Engagement score must be 30%+ (${engagementScore}%)` };
    }

    return { eligible: true };
};

export const createPodcastEpisode = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Authentication required' });

        // ✅ NEW: Check podcast upload eligibility
        const eligibility = await checkPodcastEligibility(userId);
        if (!eligibility.eligible) {
            return res.status(403).json({
                error: 'Podcast upload restricted',
                reason: eligibility.reason,
                message: 'You do not meet the requirements to upload podcasts',
                requirements: {
                    minProfileAge: '30 days',
                    minConnections: 50,
                    minEngagement: '30%'
                }
            });
        }

        const newId = crypto.randomUUID();
        const epData = {
            ...req.body,
            uploadedBy: userId,
            uploaderName: req.user?.name || req.user?.email || 'Expert',
            publishDate: new Date().toISOString(),
            isPublished: req.body.requiresApproval ? false : true,  // ✅ NEW: Require approval for NextIgnition section
            plays: 0,
            sessionType: req.body.sessionType || 'recorded',
            contentType: req.body.contentType || 'original',
            section: req.body.section || 'general',  // ✅ NEW: 'nextignition' or 'general'
            approvalStatus: req.body.section === 'nextignition' ? 'pending' : 'auto_approved',  // ✅ NEW
        };

        const { data: row, error } = await supabase
            .from('podcast_episodes')
            .insert({ id: newId, data: epData })
            .select()
            .single();

        if (error) throw error;

        console.log(`[PODCAST] User ${userId} uploaded episode "${epData.title || 'Untitled'}" to ${epData.section}`);

        res.status(201).json({
            ...mapRow(row),
            message: epData.section === 'nextignition'
                ? 'Podcast submitted for admin review (NextIgnition section)'
                : 'Podcast published successfully!'
        });
    } catch (error) {
        console.error('Error creating podcast:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updatePodcastEpisode = async (req: AuthRequest, res: Response) => {
    try {
        const { data: existing, error: fetchErr } = await supabase
            .from('podcast_episodes')
            .select('id, data')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ message: 'Episode not found' });

        // Only allow the uploader or admin to update
        if (existing.data?.uploadedBy !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updated = { ...existing.data, ...req.body, updated_at: new Date().toISOString() };
        const { data: row, error } = await supabase
            .from('podcast_episodes')
            .update({ data: updated, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(mapRow(row));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deletePodcastEpisode = async (req: AuthRequest, res: Response) => {
    try {
        const { data: existing, error: fetchErr } = await supabase
            .from('podcast_episodes')
            .select('id, data')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ message: 'Episode not found' });

        if (existing.data?.uploadedBy !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await supabase.from('podcast_episodes').delete().eq('id', req.params.id);
        res.json({ message: 'Deleted' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Live Sessions ────────────────────────────────────────────────────────────

export const createLiveSession = async (req: AuthRequest, res: Response) => {
    try {
        const newId = crypto.randomUUID();
        const sessionData = {
            title: req.body.title || 'Live Session',
            description: req.body.description || '',
            streamUrl: req.body.streamUrl || '',
            thumbnailUrl: req.body.thumbnailUrl || '',
            uploadedBy: req.user?.id,
            uploaderName: req.user?.name || req.user?.email || 'Expert',
            publishDate: new Date().toISOString(),
            isPublished: true,
            isLive: true,
            sessionType: 'live',
            contentType: 'original',
            viewerCount: 0,
            plays: 0,
        };

        const { data: row, error } = await supabase
            .from('podcast_episodes')
            .insert({ id: newId, data: sessionData })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(mapRow(row));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const endLiveSession = async (req: AuthRequest, res: Response) => {
    try {
        const { data: existing, error: fetchErr } = await supabase
            .from('podcast_episodes')
            .select('id, data')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ message: 'Session not found' });

        if (existing.data?.uploadedBy !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Auto-save the live session as a recorded episode
        const updated = { 
            ...existing.data, 
            isLive: false, 
            endedAt: new Date().toISOString(),
            sessionType: 'recorded', // automatically becomes a recorded episode
            contentType: 'original',
            wasLive: true, // Track that this was originally a live session
            autoSavedAt: new Date().toISOString(), // Track when it was auto-saved
            publishDate: new Date().toISOString() // refresh date for "latest" feed
        };

        const { data: row, error } = await supabase
            .from('podcast_episodes')
            .update({ data: updated, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        const mappedEpisode = mapRow(row);

        // Emit real-time notification about the live session ending and auto-save
        io.emit('live_session_ended_auto_saved', {
            episodeId: mappedEpisode.id,
            title: mappedEpisode.title,
            uploaderName: mappedEpisode.uploaderName,
            recordingUrl: mappedEpisode.videoUrl || mappedEpisode.streamUrl,
            duration: mappedEpisode.duration,
            viewers: mappedEpisode.viewerCount || 0,
            autoSavedAt: updated.autoSavedAt,
            uploadedBy: mappedEpisode.uploadedBy
        });

        // Also emit to the home feed to show the new recorded episode
        io.emit('feed_episode_available', {
            episodeId: mappedEpisode.id,
            episode: mappedEpisode,
            type: 'auto_saved_recording'
        });

        res.json(mappedEpisode);
    } catch (err) {
        console.error('endLiveSession error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const listLiveSessions = async (_req: Request, res: Response) => {
    try {
        const { data: rows, error } = await supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('data->>sessionType', 'live')
            .eq('data->>isLive', 'true');

        if (error) throw error;
        res.json((rows || []).map(mapRow));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Legacy helpers (kept for compatibility) ──────────────────────────────────

export const getFeaturedEpisodes = async (_req: Request, res: Response) => {
    try {
        const { data: rows, error } = await supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('data->>isPublished', 'true')
            .eq('data->>featured', 'true');

        if (error) throw error;
        let episodes = (rows || []).sort(
            (a, b) =>
                new Date(b.data?.publishDate || 0).getTime() -
                new Date(a.data?.publishDate || 0).getTime()
        );
        res.json(episodes.slice(0, 5).map(mapRow));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRecentlyPlayed = async (_req: AuthRequest, res: Response) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: rows, error } = await supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('data->>isPublished', 'true')
            .gte('updated_at', thirtyDaysAgo.toISOString());

        if (error) throw error;
        let episodes = (rows || []).sort((a, b) => (b.data?.plays || 0) - (a.data?.plays || 0));
        res.json(episodes.slice(0, 5).map(mapRow));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }

};

export const getRecommendedEpisodes = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        let favoriteCategory: string | null = null;

        if (userId) {
            const { data: userRow } = await supabase
                .from('users')
                .select('data')
                .eq('id', userId)
                .single();
            const pref = (userRow as any)?.data?.profile?.preferences;
            if (pref && typeof pref.favoritePodcastCategory === 'string') {
                favoriteCategory = pref.favoritePodcastCategory;
            }
        }

        // Fetch all published recorded episodes
        const { data: rows, error } = await supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('data->>isPublished', 'true')
            .neq('data->>sessionType', 'live');

        if (error) throw error;

        // Score by engagement (plays + likes count)
        let episodes = (rows || []).sort((a, b) => {
            const scoreA = (a.data?.plays || 0) + (a.data?.likes?.length || 0) * 2;
            const scoreB = (b.data?.plays || 0) + (b.data?.likes?.length || 0) * 2;
            return scoreB - scoreA;
        });

        // Filter by favorite category if set
        if (favoriteCategory && favoriteCategory !== 'All') {
            const filtered = episodes.filter((r: any) => {
                const tags = r?.data?.tags || [];
                return Array.isArray(tags) && tags.includes(favoriteCategory);
            });
            // Only apply category filter if it actually returns results
            if (filtered.length > 0) episodes = filtered;
        }

        res.json(episodes.slice(0, 6).map(mapRow));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};
export const toggleLikePodcast = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { data: row, error: fetchErr } = await supabase
            .from('podcast_episodes')
            .select('id, data')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !row) return res.status(404).json({ message: 'Episode not found' });

        let likes = row.data?.likes || [];
        if (likes.includes(userId)) {
            likes = likes.filter((id: string) => id !== userId);
        } else {
            likes.push(userId);
        }

        const { data: updated, error } = await supabase
            .from('podcast_episodes')
            .update({ data: { ...row.data, likes }, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(mapRow(updated));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// ✅ NEW: Admin Podcast Approval (NextIgnition Section)
// ============================================================================

export const getPendingPodcasts = async (req: AuthRequest, res: Response) => {
    try {
        // ✅ Admin only
        if ((req.user?.roles as any)?.some((r: any) => r.type === 'admin') !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { data: rows, error } = await supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('data->>section', 'nextignition')
            .eq('data->>approvalStatus', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            pending: (rows || []).map(mapRow),
            total: rows?.length || 0
        });
    } catch (error) {
        console.error('Error fetching pending podcasts:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const approvePodcast = async (req: AuthRequest, res: Response) => {
    try {
        // ✅ Admin only
        if ((req.user?.roles as any)?.some((r: any) => r.type === 'admin') !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { id } = req.params;
        const { feedback } = req.body;

        const { data: row, error: fetchErr } = await supabase
            .from('podcast_episodes')
            .select('id, data')
            .eq('id', id)
            .single();

        if (fetchErr || !row) return res.status(404).json({ message: 'Podcast not found' });

        const updated = {
            ...row.data,
            approvalStatus: 'approved',
            isPublished: true,
            approvedBy: req.user?.id,
            approvedAt: new Date().toISOString(),
            adminFeedback: feedback || ''
        };

        const { data: result, error } = await supabase
            .from('podcast_episodes')
            .update({ data: updated, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log(`[PODCAST] Admin ${req.user?.id} approved podcast "${updated.title || 'Untitled'}"`);

        res.json({
            success: true,
            message: 'Podcast approved and published!',
            podcast: mapRow(result)
        });
    } catch (error) {
        console.error('Error approving podcast:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const rejectPodcast = async (req: AuthRequest, res: Response) => {
    try {
        // ✅ Admin only
        if ((req.user?.roles as any)?.some((r: any) => r.type === 'admin') !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Rejection reason required' });
        }

        const { data: row, error: fetchErr } = await supabase
            .from('podcast_episodes')
            .select('id, data')
            .eq('id', id)
            .single();

        if (fetchErr || !row) return res.status(404).json({ message: 'Podcast not found' });

        const updated = {
            ...row.data,
            approvalStatus: 'rejected',
            isPublished: false,
            rejectedBy: req.user?.id,
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason
        };

        const { data: result, error } = await supabase
            .from('podcast_episodes')
            .update({ data: updated, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log(`[PODCAST] Admin ${req.user?.id} rejected podcast: "${reason}"`);

        res.json({
            success: true,
            message: 'Podcast rejected',
            podcast: mapRow(result)
        });
    } catch (error) {
        console.error('Error rejecting podcast:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// ✅ NEW: List NextIgnition Podcasts (Public)
// ============================================================================

export const getNextIgnitionPodcasts = async (req: Request, res: Response) => {
    try {
        const { limit = '20', offset = '0' } = req.query;

        const { data: rows, error } = await supabase
            .from('podcast_episodes')
            .select('id, data, created_at, updated_at')
            .eq('data->>section', 'nextignition')
            .eq('data->>isPublished', 'true')
            .order('data->>publishDate', { ascending: false });

        if (error) throw error;

        const podcasts = (rows || [])
            .slice(parseInt(String(offset), 10), parseInt(String(offset), 10) + parseInt(String(limit), 10))
            .map(mapRow);

        res.json({
            success: true,
            podcasts,
            total: rows?.length || 0,
            section: 'NextIgnition - Curated startup & investor content'
        });
    } catch (error) {
        console.error('Error fetching NextIgnition podcasts:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
