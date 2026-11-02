import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AdminRequest } from '../middleware/adminMiddleware';
import { supabase } from '../utils/supabase';
import { sendEmail } from '../utils/mailer';
import {
  INVESTOR_TIERS,
  TIER_NAMES,
  VERIFICATION_MESSAGES,
  VALID_PLATFORMS,
  REQUIRED_PROFILE_FIELDS,
  TIER_2_COMPLETION_THRESHOLD,
  DEFAULT_PROFILE_COMPLETION,
  DEFAULT_ADMIN_VERIFICATION,
  VERIFICATION_METHODS,
  QUEUE_STATUS,
  DEFAULT_PAGINATION,
} from '../constants';

// ============= EXISTING VERIFICATION ENDPOINTS =============

export const completeVerification = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: VERIFICATION_MESSAGES.UNAUTHORIZED });
        }

        const { data: userRow, error: fetchErr } = await supabase.from('users').select('id, data').eq('id', req.user.id).single();
        if (fetchErr || !userRow) {
            return res.status(404).json({ message: VERIFICATION_MESSAGES.USER_NOT_FOUND });
        }

        await supabase.from('users').update({
            data: { ...userRow.data, isVerified: true },
            updated_at: new Date().toISOString()
        }).eq('id', req.user.id);

        return res.json({ isVerified: true });
    } catch (error: any) {
        return res.status(500).json({ message: VERIFICATION_MESSAGES.VERIFICATION_FAILED, error: error?.message });
    }
};

export const setVerificationBannerState = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { dismissedUntil } = req.body as { dismissedUntil?: string | null };

        const { data: userRow, error: fetchErr } = await supabase.from('users').select('id, data').eq('id', req.user.id).single();
        if (fetchErr || !userRow) {
            return res.status(404).json({ message: 'User not found' });
        }

        let newDismissedUntil: string | undefined = undefined;

        if (dismissedUntil === null) {
            newDismissedUntil = undefined;
        } else if (dismissedUntil) {
            const d = new Date(dismissedUntil);
            if (Number.isNaN(d.getTime())) {
                return res.status(400).json({ message: 'Invalid dismissedUntil' });
            }
            newDismissedUntil = d.toISOString();
        } else {
            // If not provided, default to dismiss for this session/day
            newDismissedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }

        await supabase.from('users').update({
            data: { ...userRow.data, verificationBannerDismissedUntil: newDismissedUntil },
            updated_at: new Date().toISOString()
        }).eq('id', req.user.id);

        return res.json({ verificationBannerDismissedUntil: newDismissedUntil || null });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to update banner state', error: error?.message });
    }
};

// ============= INVESTOR VERIFICATION ENDPOINTS =============

/**
 * Get investor verification status
 * Returns current tier, verifications, and profile completion
 */
export const getInvestorVerificationStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: VERIFICATION_MESSAGES.UNAUTHORIZED });
        }

        const { data: userRow, error: fetchErr } = await supabase
            .from('users')
            .select('id, data')
            .eq('id', req.user.id)
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.VERIFICATION_STATUS_FAILED });
        }

        if (!userRow) {
            return res.status(404).json({ message: VERIFICATION_MESSAGES.USER_NOT_FOUND });
        }

        const userData = userRow.data || {};
        const investorTier = userData.investorTier || INVESTOR_TIERS.UNVERIFIED;
        const verifications = userData.verifications || {};
        const profileCompletion = userData.profileCompletion || DEFAULT_PROFILE_COMPLETION;
        const adminVerification = userData.adminVerification || DEFAULT_ADMIN_VERIFICATION;

        // Calculate profile completion percentage based on required fields
        const completedFields = REQUIRED_PROFILE_FIELDS.filter(field => userData[field]);
        const completionPercentage = Math.round((completedFields.length / REQUIRED_PROFILE_FIELDS.length) * 100);

        return res.json({
            investorTier,
            tierName: TIER_NAMES[investorTier],
            verifications,
            profileCompletion: {
                percentage: completionPercentage,
                completedFields: completedFields,
                requiredFields: REQUIRED_PROFILE_FIELDS
            },
            adminVerification,
            isProfileLocked: investorTier === INVESTOR_TIERS.UNVERIFIED
        });
    } catch (error: any) {
        console.error('Error in getInvestorVerificationStatus:', error);
        return res.status(500).json({ message: VERIFICATION_MESSAGES.VERIFICATION_STATUS_FAILED, error: error?.message });
    }
};

/**
 * Verify investor social account (LinkedIn, Twitter, etc)
 * Validates URL and stores verification record
 */
export const verifySocialAccount = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: VERIFICATION_MESSAGES.UNAUTHORIZED });
        }

        const { platform, profileUrl } = req.body as { platform: string; profileUrl: string };

        if (!platform || !profileUrl) {
            return res.status(400).json({ message: `Platform and profileUrl required` });
        }

        if (!VALID_PLATFORMS.includes(platform.toLowerCase() as any)) {
            return res.status(400).json({ message: `Invalid platform. Supported: ${VALID_PLATFORMS.join(', ')}` });
        }

        // Validate URL format
        try {
            new URL(profileUrl);
        } catch {
            return res.status(400).json({ message: VERIFICATION_MESSAGES.INVALID_PROFILE_URL });
        }

        // For Phase 1: Basic URL validation (Phase 2 will add API validation)
        const isValid = validateProfileUrl(platform.toLowerCase(), profileUrl);
        if (!isValid) {
            return res.status(400).json({ message: `Invalid ${platform} profile URL format` });
        }

        // Store verification record
        const verificationId = crypto.randomUUID();
        const { error: insError } = await supabase
            .from('investor_verifications')
            .insert([
                {
                    id: verificationId,
                    user_id: req.user.id,
                    platform: platform.toLowerCase(),
                    platform_url: profileUrl,
                    verification_method: VERIFICATION_METHODS.URL_VALIDATION,
                    is_valid: true,
                    verified_at: new Date().toISOString()
                }
            ]);

        if (insError) {
            console.error('Error storing verification:', insError);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.SOCIAL_VERIFICATION_FAILED });
        }

        // Update user's verifications in data column
        const { data: userRow, error: fetchErr } = await supabase
            .from('users')
            .select('id, data')
            .eq('id', req.user.id)
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.SOCIAL_VERIFICATION_FAILED });
        }

        if (!userRow) {
            return res.status(404).json({ message: VERIFICATION_MESSAGES.USER_NOT_FOUND });
        }

        const verifications = (userRow.data?.verifications || {}) as Record<string, any>;
        verifications[platform.toLowerCase()] = {
            verified: true,
            url: profileUrl,
            verifiedAt: new Date().toISOString()
        };

        // Check if should auto-promote to Tier 2
        const shouldPromote = checkShouldPromoteToTier2(userRow.data || {}, verifications);

        const { error: updateErr } = await supabase
            .from('users')
            .update({
                data: {
                    ...userRow.data,
                    verifications,
                    investorTier: shouldPromote ? INVESTOR_TIERS.VERIFIED : (userRow.data?.investorTier || INVESTOR_TIERS.UNVERIFIED)
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id);

        if (updateErr) {
            console.error('Error updating user:', updateErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.SOCIAL_VERIFICATION_FAILED });
        }

        return res.json({
            message: VERIFICATION_MESSAGES.SOCIAL_VERIFIED,
            platform: platform.toLowerCase(),
            verified: true,
            tierPromoted: shouldPromote,
            newTier: shouldPromote ? INVESTOR_TIERS.VERIFIED : (userRow.data?.investorTier || INVESTOR_TIERS.UNVERIFIED)
        });
    } catch (error: any) {
        console.error('Error in verifySocialAccount:', error);
        return res.status(500).json({ message: VERIFICATION_MESSAGES.SOCIAL_VERIFICATION_FAILED, error: error?.message });
    }
};

/**
 * Request Tier 3 (Accredited) verification
 * Submits investor for manual admin review
 */
export const requestAccreditationReview = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: VERIFICATION_MESSAGES.UNAUTHORIZED });
        }

        const { data: userRow, error: fetchErr } = await supabase
            .from('users')
            .select('id, data')
            .eq('id', req.user.id)
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchErr);
            return res.status(500).json({ message: 'Failed to fetch user' });
        }

        if (!userRow) {
            return res.status(404).json({ message: VERIFICATION_MESSAGES.USER_NOT_FOUND });
        }

        // Check if already has pending request
        const { data: existing, error: checkErr } = await supabase
            .from('admin_verification_queue')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('status', QUEUE_STATUS.PENDING)
            .single();

        if (checkErr && checkErr.code !== 'PGRST116') {
            console.error('Error checking pending request:', checkErr);
            return res.status(500).json({ message: 'Failed to check pending request' });
        }

        if (existing) {
            return res.status(400).json({ message: VERIFICATION_MESSAGES.PENDING_ACCREDITATION });
        }

        // Create verification queue entry
        const queueId = crypto.randomUUID();
        const { error: insError } = await supabase
            .from('admin_verification_queue')
            .insert([
                {
                    id: queueId,
                    user_id: req.user.id,
                    tier_requested: INVESTOR_TIERS.ACCREDITED,
                    status: QUEUE_STATUS.PENDING,
                    profile_data: userRow.data,
                    created_at: new Date().toISOString()
                }
            ]);

        if (insError) {
            console.error('Error creating verification request:', insError);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.ACCREDITATION_FAILED });
        }

        return res.json({
            message: VERIFICATION_MESSAGES.ACCREDITATION_SUBMITTED,
            queueId,
            status: QUEUE_STATUS.PENDING
        });
    } catch (error: any) {
        console.error('Error in requestAccreditationReview:', error);
        return res.status(500).json({ message: VERIFICATION_MESSAGES.ACCREDITATION_FAILED, error: error?.message });
    }
};

/**
 * Get investor's full verification profile
 */
export const getInvestorProfile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: VERIFICATION_MESSAGES.UNAUTHORIZED });
        }

        const { investorId } = req.params;
        const userId = investorId || req.user.id;

        // Check permissions: can only view own profile or if admin
        const isAdmin = req.user?.role === 'admin';
        if (userId !== req.user.id && !isAdmin) {
            return res.status(403).json({ message: VERIFICATION_MESSAGES.FORBIDDEN });
        }

        const { data: userRow, error: fetchErr } = await supabase
            .from('users')
            .select('id, data, created_at, updated_at')
            .eq('id', userId)
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.PROFILE_FETCH_FAILED });
        }

        if (!userRow) {
            return res.status(404).json({ message: VERIFICATION_MESSAGES.INVESTOR_NOT_FOUND });
        }

        const userData = userRow.data || {};

        // Get verification records
        const { data: verifications, error: verError } = await supabase
            .from('investor_verifications')
            .select('platform, is_valid, verified_at')
            .eq('user_id', userId);

        if (verError && verError.code !== 'PGRST116') {
            console.error('Error fetching verifications:', verError);
        }

        return res.json({
            investorTier: userData.investorTier || INVESTOR_TIERS.UNVERIFIED,
            tierName: TIER_NAMES[userData.investorTier || INVESTOR_TIERS.UNVERIFIED],
            profile: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                company: userData.company,
                role: userData.role,
                bio: userData.bio,
                profileImage: userData.profileImage
            },
            verifications: userData.verifications || {},
            verificationRecords: verifications || [],
            adminVerification: userData.adminVerification || DEFAULT_ADMIN_VERIFICATION,
            createdAt: userRow.created_at,
            updatedAt: userRow.updated_at
        });
    } catch (error: any) {
        console.error('Error in getInvestorProfile:', error);
        return res.status(500).json({ message: VERIFICATION_MESSAGES.PROFILE_FETCH_FAILED, error: error?.message });
    }
};

// ============= ADMIN ENDPOINTS =============

/**
 * Get pending verification queue (admin only)
 */
export const getPendingVerifications = async (req: AdminRequest, res: Response) => {
    try {
        // Admin auth + RBAC (INVESTOR_MGMT / VIEW) is enforced by route middleware
        // (protectAdmin + enforceAdminPermission), so no inline role check here.
        const { status = QUEUE_STATUS.PENDING, limit = DEFAULT_PAGINATION.LIMIT } = req.query;

        const { data: queue, error: queueErr } = await supabase
            .from('admin_verification_queue')
            .select('id, user_id, tier_requested, status, profile_data, created_at')
            .eq('status', status as string)
            .order('created_at', { ascending: true })
            .limit(parseInt(limit as string));

        if (queueErr) {
            console.error('Error fetching queue:', queueErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.QUEUE_FETCH_FAILED });
        }

        return res.json({
            total: queue?.length || 0,
            queue: queue || []
        });
    } catch (error: any) {
        console.error('Error in getPendingVerifications:', error);
        return res.status(500).json({ message: VERIFICATION_MESSAGES.QUEUE_FETCH_FAILED, error: error?.message });
    }
};

/**
 * Approve investor verification (admin only)
 */
export const approveInvestorVerification = async (req: AdminRequest, res: Response) => {
    try {
        // Admin auth + RBAC (INVESTOR_MGMT / APPROVE) is enforced by route middleware.
        const adminId = req.admin?.id;

        const { queueId } = req.params;
        const { notes } = req.body as { notes?: string };

        if (!queueId) {
            return res.status(400).json({ message: 'queueId required' });
        }

        // Get queue entry
        const { data: queueRow, error: queueErr } = await supabase
            .from('admin_verification_queue')
            .select('user_id, tier_requested')
            .eq('id', queueId)
            .single();

        if (queueErr && queueErr.code !== 'PGRST116') {
            console.error('Error fetching queue entry:', queueErr);
            return res.status(500).json({ message: 'Failed to fetch queue entry' });
        }

        if (!queueRow) {
            return res.status(404).json({ message: 'Queue entry not found' });
        }

        // Update queue status
        const { error: updateQueueErr } = await supabase
            .from('admin_verification_queue')
            .update({
                status: QUEUE_STATUS.APPROVED,
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString(),
                notes
            })
            .eq('id', queueId);

        if (updateQueueErr) {
            console.error('Error updating queue:', updateQueueErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.APPROVAL_FAILED });
        }

        // Update user tier
        const { data: userRow, error: userErr } = await supabase
            .from('users')
            .select('data')
            .eq('id', queueRow.user_id)
            .single();

        if (userErr && userErr.code !== 'PGRST116') {
            console.error('Error fetching user:', userErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.APPROVAL_FAILED });
        }

        if (!userRow) {
            return res.status(404).json({ message: VERIFICATION_MESSAGES.USER_NOT_FOUND });
        }

        const { error: updateUserErr } = await supabase
            .from('users')
            .update({
                data: {
                    ...userRow.data,
                    investorTier: queueRow.tier_requested,
                    adminVerification: {
                        status: QUEUE_STATUS.APPROVED,
                        reviewedBy: adminId,
                        approvedAt: new Date().toISOString(),
                        notes
                    }
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', queueRow.user_id);

        if (updateUserErr) {
            console.error('Error updating user:', updateUserErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.APPROVAL_FAILED });
        }

        // Send notification
        try {
            await sendEmail({
                to: userRow.data.email,
                subject: 'Investor Verification Approved: NextIgnition',
                text: `Your investor verification request has been approved. You are now promoted to ${TIER_NAMES[queueRow.tier_requested]}.`,
                html: `<p>Hello,</p><p>We are pleased to inform you that your <strong>Investor Verification</strong> request has been <strong>approved</strong>.</p><p>You have been promoted to <strong>${TIER_NAMES[queueRow.tier_requested]}</strong> and now have full access to the funding portal and exclusive deals relevant to your tier.</p>`
            });
        } catch (e) {
            console.error('[VerificationController] Failed to send approval email:', e);
        }

        // Audit trail
        await req.logAdminAction?.(queueRow.user_id, {
            action: 'approve_investor_verification',
            queueId,
            newTier: queueRow.tier_requested,
        });

        return res.json({
            message: VERIFICATION_MESSAGES.VERIFICATION_APPROVED,
            userId: queueRow.user_id,
            newTier: queueRow.tier_requested
        });
    } catch (error: any) {
        console.error('Error in approveInvestorVerification:', error);
        return res.status(500).json({ message: VERIFICATION_MESSAGES.APPROVAL_FAILED, error: error?.message });
    }
};

/**
 * Reject investor verification (admin only)
 */
export const rejectInvestorVerification = async (req: AdminRequest, res: Response) => {
    try {
        // Admin auth + RBAC (INVESTOR_MGMT / APPROVE) is enforced by route middleware.
        const adminId = req.admin?.id;

        const { queueId } = req.params;
        const { reason } = req.body as { reason?: string };

        if (!queueId) {
            return res.status(400).json({ message: 'queueId required' });
        }

        // Get queue entry
        const { data: queueRow, error: queueErr } = await supabase
            .from('admin_verification_queue')
            .select('user_id')
            .eq('id', queueId)
            .single();

        if (queueErr && queueErr.code !== 'PGRST116') {
            console.error('Error fetching queue entry:', queueErr);
            return res.status(500).json({ message: 'Failed to fetch queue entry' });
        }

        if (!queueRow) {
            return res.status(404).json({ message: 'Queue entry not found' });
        }

        // Update queue status
        const { error: updateQueueErr } = await supabase
            .from('admin_verification_queue')
            .update({
                status: QUEUE_STATUS.REJECTED,
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString(),
                notes: reason
            })
            .eq('id', queueId);

        if (updateQueueErr) {
            console.error('Error updating queue:', updateQueueErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.REJECTION_FAILED });
        }

        // Update user record with rejection
        const { data: userRow, error: userErr } = await supabase
            .from('users')
            .select('data')
            .eq('id', queueRow.user_id)
            .single();

        if (userErr && userErr.code !== 'PGRST116') {
            console.error('Error fetching user:', userErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.REJECTION_FAILED });
        }

        if (!userRow) {
            return res.status(404).json({ message: VERIFICATION_MESSAGES.USER_NOT_FOUND });
        }

        const { error: updateUserErr } = await supabase
            .from('users')
            .update({
                data: {
                    ...userRow.data,
                    adminVerification: {
                        status: QUEUE_STATUS.REJECTED,
                        reviewedBy: adminId,
                        rejectedAt: new Date().toISOString(),
                        reason
                    }
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', queueRow.user_id);

        if (updateUserErr) {
            console.error('Error updating user:', updateUserErr);
            return res.status(500).json({ message: VERIFICATION_MESSAGES.REJECTION_FAILED });
        }

        // Send notification
        try {
            await sendEmail({
                to: userRow.data.email,
                subject: 'Investor Verification Update: NextIgnition',
                text: `Your investor verification request has been reviewed. Status: Rejected. Reason: ${reason || 'Incomplete documentation'}`,
                html: `<p>Hello,</p><p>Your recent <strong>Investor Verification</strong> request has been reviewed by our team.</p><p>Unfortunately, we could not approve your request at this time.</p><p><strong>Reason:</strong> ${reason || 'Incomplete documentation'}</p><p>You can update your profile and resubmit your verification request at any time.</p>`
            });
        } catch (e) {
            console.error('[VerificationController] Failed to send rejection email:', e);
        }

        // Audit trail
        await req.logAdminAction?.(queueRow.user_id, {
            action: 'reject_investor_verification',
            queueId,
            reason: reason || null,
        });

        return res.json({
            message: VERIFICATION_MESSAGES.VERIFICATION_REJECTED,
            userId: queueRow.user_id
        });
    } catch (error: any) {
        console.error('Error in rejectInvestorVerification:', error);
        return res.status(500).json({ message: VERIFICATION_MESSAGES.REJECTION_FAILED, error: error?.message });
    }
};

// ============= HELPER FUNCTIONS =============

function validateProfileUrl(platform: string, url: string): boolean {
    const platformPatterns: Record<string, RegExp> = {
        linkedin: /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-]+\/?$/,
        twitter: /^https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+\/?$/,
        github: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_\-]+\/?$/,
        angellist: /^https?:\/\/(www\.)?angel\.co\/[a-zA-Z0-9_\-]+\/?$/
    };

    const pattern = platformPatterns[platform];
    return pattern ? pattern.test(url) : false;
}

function checkShouldPromoteToTier2(userData: any, verifications: Record<string, any>): boolean {
    // Tier 2 requires: At least 1 social verification + 80% profile completion
    const hasLinkedin = verifications.linkedin?.verified || false;
    const completedFields = REQUIRED_PROFILE_FIELDS.filter(field => userData[field]);
    const completionPercentage = (completedFields.length / REQUIRED_PROFILE_FIELDS.length) * 100;

    return hasLinkedin && completionPercentage >= TIER_2_COMPLETION_THRESHOLD;
}
