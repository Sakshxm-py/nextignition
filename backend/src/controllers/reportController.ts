import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';

const VALID_TARGET_TYPES = ['user', 'post', 'startup', 'comment', 'message', 'community', 'event', 'podcast'];

/**
 * Create a moderation report. Used by the "Report Profile" action and any
 * future report-content flows. Stored in the `reports` table as a pending
 * item for admin review.
 */
export const createReport = async (req: AuthRequest, res: Response) => {
    try {
        const reporter = req.user?.id;
        if (!reporter) return res.status(401).json({ message: 'Unauthorized' });

        const { targetType, targetId, reason, details } = req.body || {};
        if (!targetType || !targetId) {
            return res.status(400).json({ message: 'targetType and targetId are required' });
        }
        if (!VALID_TARGET_TYPES.includes(String(targetType))) {
            return res.status(400).json({ message: 'Invalid targetType' });
        }
        if (String(targetType) === 'user' && String(targetId) === String(reporter)) {
            return res.status(400).json({ message: 'You cannot report yourself' });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const reasonText = String(reason || 'unspecified').slice(0, 200);
        const detailsText = typeof details === 'string' ? details.slice(0, 2000) : null;
        const data = {
            id,
            _id: id,
            reporter: String(reporter),
            targetType: String(targetType),
            targetId: String(targetId),
            reason: reasonText,
            details: detailsText ?? undefined,
            status: 'pending',
            createdAt: now,
        };

        // Populate BOTH the typed columns (read by adminController.getReports/resolveReport
        // + the admin moderation UI) and the generic `data` jsonb (read by getMyReports).
        // See migration 013 — the reports table is a superset of both shapes.
        const { error } = await supabase.from('reports').insert([{
            id,
            reporter_id: String(reporter),
            content_id: String(targetId),
            content_type: String(targetType),
            reason: reasonText,
            details: detailsText,
            status: 'pending',
            data,
            created_at: now,
        }]);
        if (error) {
            console.error('createReport insert failed:', error);
            return res.status(500).json({ message: 'Failed to submit report', error: error.message });
        }

        return res.status(201).json({ ok: true, id });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to submit report', error: error?.message });
    }
};

/** Reports submitted by the current user (lets the UI reflect "already reported"). */
export const getMyReports = async (req: AuthRequest, res: Response) => {
    try {
        const reporter = req.user?.id;
        if (!reporter) return res.status(401).json({ message: 'Unauthorized' });

        const { data, error } = await supabase
            .from('reports')
            .select('data')
            .eq('data->>reporter', String(reporter))
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return res.json((data || []).map(r => r.data));
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to fetch reports', error: error?.message });
    }
};
