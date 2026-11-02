import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';
import { uploadPublicFile } from '../utils/storage';
import { verifySocialAccount } from '../utils/socialVerifier';

const getBaseUrl = (req: AuthRequest) => {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
    const host = req.get('host');
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    return host ? `${proto}://${host}` : `http://localhost:${process.env.PORT || 5000}`;
};

const SUPABASE_PUBLIC_URL = process.env.SUPABASE_URL;
const PROFILE_PICS_BUCKET = process.env.PROFILE_PICS_BUCKET || 'profile-pics';

const getExtFromFileName = (fileName: string | undefined) => {
    const safe = String(fileName || '').trim();
    const match = safe.match(/\.([a-zA-Z0-9]{1,10})$/);
    return match ? match[1].toLowerCase() : '';
};

const buildPublicObjectUrl = (bucket: string, objectPath: string) => {
    if (!SUPABASE_PUBLIC_URL) return '';
    return `${SUPABASE_PUBLIC_URL.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${objectPath}`;
};

export const getAvatarUploadUrl = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
        if (!SUPABASE_PUBLIC_URL) return res.status(500).json({ message: 'SUPABASE_URL not configured' });
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ message: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
        }

        const { fileName, contentType } = req.body || {};
        const ext = getExtFromFileName(fileName) || 'png';

        const objectPath = `avatars/${req.user.id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const { data, error } = await supabase.storage
            .from(PROFILE_PICS_BUCKET)
            .createSignedUploadUrl(objectPath);

        if (error || !data?.signedUrl) {
            return res.status(500).json({
                message: 'Failed to create signed upload URL',
                details: error?.message || error || null,
            });
        }

        const publicUrl = buildPublicObjectUrl(PROFILE_PICS_BUCKET, objectPath);
        return res.json({
            signedUrl: data.signedUrl,
            path: objectPath,
            bucket: PROFILE_PICS_BUCKET,
            publicUrl,
            contentType: contentType || undefined,
        });
    } catch (error: any) {
        console.error('getAvatarUploadUrl error:', error);
        return res.status(500).json({
            message: 'Failed to create signed upload URL',
            details: error?.message || String(error),
        });
    }
};

export const getCoverPhotoUploadUrl = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
        if (!SUPABASE_PUBLIC_URL) return res.status(500).json({ message: 'SUPABASE_URL not configured' });
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ message: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
        }

        const { fileName, contentType } = req.body || {};
        const ext = getExtFromFileName(fileName) || 'png';

        const objectPath = `covers/${req.user.id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const { data, error } = await supabase.storage
            .from(PROFILE_PICS_BUCKET)
            .createSignedUploadUrl(objectPath);

        if (error || !data?.signedUrl) {
            return res.status(500).json({
                message: 'Failed to create signed upload URL',
                details: error?.message || error || null,
            });
        }

        const publicUrl = buildPublicObjectUrl(PROFILE_PICS_BUCKET, objectPath);
        return res.json({
            signedUrl: data.signedUrl,
            path: objectPath,
            bucket: PROFILE_PICS_BUCKET,
            publicUrl,
            contentType: contentType || undefined,
        });
    } catch (error: any) {
        console.error('getCoverPhotoUploadUrl error:', error);
        return res.status(500).json({
            message: 'Failed to create signed upload URL',
            details: error?.message || String(error),
        });
    }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (!userRow) return res.status(404).json({ message: 'User not found' });

        const ext = getExtFromFileName(file.originalname) || 'png';
        const objectPath = `avatars/${req.user.id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const uploaded = await uploadPublicFile({
            bucket: PROFILE_PICS_BUCKET,
            objectPath,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        const avatarUrl = uploaded.publicUrl;
        const updatedData = { ...userRow.data, avatar: avatarUrl, updatedAt: new Date().toISOString() };
        await supabase.from('users').update({ data: updatedData }).eq('id', req.user.id);

        return res.json({ avatar: avatarUrl });
    } catch (error: any) {
        return res.status(500).json({ message: 'Avatar upload failed' });
    }
};

export const removeAvatar = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });

        const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (!userRow) return res.status(404).json({ message: 'User not found' });

        const updatedData = { ...userRow.data, avatar: '', updatedAt: new Date().toISOString() };
        await supabase.from('users').update({ data: updatedData }).eq('id', req.user.id);

        return res.json({ avatar: '' });
    } catch (error: any) {
        return res.status(500).json({ message: 'Avatar removal failed' });
    }
};

export const uploadCoverPhoto = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (!userRow) return res.status(404).json({ message: 'User not found' });

        const ext = getExtFromFileName(file.originalname) || 'png';
        const objectPath = `covers/${req.user.id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const uploaded = await uploadPublicFile({
            bucket: PROFILE_PICS_BUCKET,
            objectPath,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        const coverPhotoUrl = uploaded.publicUrl;
        const updatedData = { ...userRow.data, coverPhoto: coverPhotoUrl, updatedAt: new Date().toISOString() };
        await supabase.from('users').update({ data: updatedData }).eq('id', req.user.id);

        return res.json({ coverPhoto: coverPhotoUrl });
    } catch (error: any) {
        return res.status(500).json({ message: 'Cover photo upload failed' });
    }
};

export const verifySocialLink = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
        const { platform, url } = req.body;
        console.log(`[SocialVerify] Received: platform=${platform}, url=${url}`);
        if (!platform || !url) {
            console.warn('[SocialVerify] Missing platform or URL');
            return res.status(400).json({ message: 'Platform and URL are required' });
        }

        // Perform actual verification
        const isValid = await verifySocialAccount(platform, url);
        console.log(`[SocialVerify] Result for ${platform}: ${isValid}`);
        if (!isValid) {
            return res.json({
                verified: false,
                message: `Failed to verify ${platform} account. Please check the URL and ensure the account is public.`
            });
        }

        const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (!userRow) return res.status(404).json({ message: 'User not found' });

        const user = userRow.data;
        if (!user.profile) user.profile = {};
        if (!user.profile.socials) user.profile.socials = {};
        if (!user.profile.socialsVerified) user.profile.socialsVerified = {};

        user.profile.socials[platform] = url;
        user.profile.socialsVerified[platform] = true;
        user.updatedAt = new Date().toISOString();

        await supabase.from('users').update({ data: user }).eq('id', req.user.id);
        return res.json({ verified: true, socials: user.profile.socials, socialsVerified: user.profile.socialsVerified });
    } catch (error: any) {
        console.error('Social verification failed:', error);
        return res.status(500).json({ message: 'Social verification failed' });
    }
};
export const uploadVideo = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (!userRow) return res.status(404).json({ message: 'User not found' });

        const ext = getExtFromFileName(file.originalname) || 'mp4';
        const objectPath = `videos/${req.user.id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const uploaded = await uploadPublicFile({
            bucket: PROFILE_PICS_BUCKET,
            objectPath,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        const videoUrl = uploaded.publicUrl;
        const updatedData = { ...userRow.data, introVideo: videoUrl, updatedAt: new Date().toISOString() };
        await supabase.from('users').update({ data: updatedData }).eq('id', req.user.id);

        return res.json({ videoUrl });
    } catch (error: any) {
        console.error('Video upload error:', error);
        return res.status(500).json({ message: 'Video upload failed' });
    }
};

export const updateVoiceSettings = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
        const { settings } = req.body;
        
        const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (!userRow) return res.status(404).json({ message: 'User not found' });

        const updatedData = { 
            ...userRow.data, 
            voiceSettings: { ...(userRow.data.voiceSettings || {}), ...settings },
            updatedAt: new Date().toISOString() 
        };
        
        await supabase.from('users').update({ data: updatedData }).eq('id', req.user.id);
        return res.json(updatedData.voiceSettings);
    } catch (error: any) {
        console.error('updateVoiceSettings error:', error);
        return res.status(500).json({ message: 'Failed to update voice settings' });
    }
};

/**
 * Block another user. Idempotent (upsert keyed by `${me}_${other}`). Blocking
 * also tears down any existing follow relationship in both directions so the
 * blocked user no longer appears in followers/following.
 */
export const blockUser = async (req: AuthRequest, res: Response) => {
    try {
        const me = req.user?.id;
        const otherId = String(req.params.userId || '');
        if (!me) return res.status(401).json({ message: 'Unauthorized' });
        if (!otherId) return res.status(400).json({ message: 'userId is required' });
        if (String(me) === otherId) return res.status(400).json({ message: 'You cannot block yourself' });

        const { data: other } = await supabase.from('users').select('id').eq('id', otherId).single();
        if (!other) return res.status(404).json({ message: 'User not found' });

        const id = `${me}_${otherId}`;
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('user_blocks')
            .upsert([{ id, data: { id, blocker: String(me), blocked: otherId, createdAt: now }, created_at: now }]);
        if (error) {
            console.error('blockUser upsert failed:', error);
            return res.status(500).json({ message: 'Failed to block user', error: error.message });
        }

        // A block severs any follow relationship between the two users.
        await supabase.from('follows').delete().in('id', [`${me}_${otherId}`, `${otherId}_${me}`]);

        return res.json({ ok: true, blocked: true });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to block user', error: error?.message });
    }
};

/** Remove a block previously created by the current user. */
export const unblockUser = async (req: AuthRequest, res: Response) => {
    try {
        const me = req.user?.id;
        const otherId = String(req.params.userId || '');
        if (!me) return res.status(401).json({ message: 'Unauthorized' });
        if (!otherId) return res.status(400).json({ message: 'userId is required' });

        await supabase.from('user_blocks').delete().eq('id', `${me}_${otherId}`);
        return res.json({ ok: true, blocked: false });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to unblock user', error: error?.message });
    }
};

/** List the ids of users the current user has blocked. */
export const getBlockedUsers = async (req: AuthRequest, res: Response) => {
    try {
        const me = req.user?.id;
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const { data, error } = await supabase.from('user_blocks').select('data').eq('data->>blocker', String(me));
        if (error) throw error;

        return res.json({ blockedUserIds: (data || []).map(r => r.data.blocked) });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to fetch blocked users', error: error?.message });
    }
};
