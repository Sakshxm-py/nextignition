import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { io } from '../utils/socket';
import { supabase } from '../utils/supabase';
import { createNotification } from './notificationController';
import { recordProfileViewEvent, recordSearchAppearanceEvents } from './engagementController';
import crypto from 'crypto';

export const listCofounders = async (req: Request, res: Response) => {
    try {
        const skill = (req.query.skill as string | undefined)?.trim();
        const location = (req.query.location as string | undefined)?.trim();
        const commitment = (req.query.commitment as string | undefined)?.trim();
        const startupStatus = (req.query.startupStatus as string | undefined)?.trim();
        const userId = (req.query.userId as string | undefined)?.trim(); 

        let query = supabase.from('cofounder_profiles').select('id, data, created_at, updated_at').eq('data->>isActive', 'true');
        
        if (commitment) query = query.eq('data->>commitment', commitment);
        if (startupStatus && startupStatus !== 'all') {
            if (startupStatus === 'has-startup') {
                query = query.or(`data->>startupStatus.eq.has-startup,data->>startupStatus.eq.yes`);
            } else {
                query = query.eq('data->>startupStatus', startupStatus);
            }
        }
        
        let { data: profilesRows, error } = await query;
        if (error) throw error;
        
        let profiles = profilesRows || [];

        // Also fetch all users with role 'founder' to populate implicit profiles
        let { data: founderUsers, error: usersError } = await supabase.from('users').select('id, data, created_at, updated_at').eq('data->>role', 'founder');
        if (usersError) throw usersError;

        const explicitProfileUserIds = new Set(profiles.map(p => p.data?.user));
        
        const allFounders = founderUsers || [];
        for (const f of allFounders) {
            let userData = f.data;
            if (typeof userData === 'string') {
                try {
                    userData = JSON.parse(userData);
                } catch (e) {
                    userData = {};
                }
            }

            // Apply standard user-level filters manually since they aren't in cofounder_profiles for implicit ones
            const userStartupStatus = userData?.verificationInfo?.founder?.hasStartup || userData?.profile?.startupStatus || 'ideal';
            if (startupStatus && startupStatus !== 'all' && userStartupStatus !== startupStatus) continue;
            
            if (!explicitProfileUserIds.has(f.id)) {
                profiles.push({
                    id: `implicit_${f.id}`,
                    created_at: f.created_at,
                    updated_at: f.updated_at,
                    data: {
                        user: f.id,
                        isActive: true,
                        commitment: 'Flexible',
                        skills: userData?.profile?.skills || [],
                        location: userData?.profile?.location || 'Remote',
                        startupStatus: userStartupStatus,
                        currentRole: 'Founder',
                        availability: 'Open to Connect',
                        matchScore: Math.floor(Math.random() * 20) + 75
                    }
                });
            }
        }

        // Apply array & regex & neq filters in memory
        if (userId) profiles = profiles.filter(p => p.data?.user !== userId);
        if (location) profiles = profiles.filter(p => (p.data?.location || '').toLowerCase().includes(location.toLowerCase()));
        if (skill) profiles = profiles.filter(p => (p.data?.skills || []).includes(skill));

        // Sort by updatedAt
        profiles.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        profiles = profiles.slice(0, 50);

        // Populate user
        const userIds = [...new Set(profiles.map(p => p.data?.user).filter(Boolean))];
        const usersMap = new Map();
        
        // Add already fetched founders to map
        allFounders.forEach(f => usersMap.set(f.id, f.data));
        
        // Fetch any missing users (e.g., explicit profiles from non-'founder' roles)
        const missingUserIds = userIds.filter(id => !usersMap.has(id));
        if (missingUserIds.length > 0) {
            const { data: usersData } = await supabase.from('users').select('id, data').in('id', missingUserIds);
            (usersData || []).forEach(u => usersMap.set(u.id, u.data));
        }

        const validProfiles = profiles
            .filter(p => usersMap.has(p.data?.user))
            .map(p => {
                const uData = usersMap.get(p.data?.user);
                return {
                    ...p.data,
                    _id: p.id,
                    id: p.id,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                    user: {
                        _id: p.data?.user,
                        name: uData?.name,
                        avatar: uData?.avatar,
                        role: uData?.role,
                        profile: uData?.profile,
                        isVerified: !!uData?.isVerified
                    }
                };
            });

        // Engagement: these co-founders appeared in the viewer's discover results.
        const viewerId = (req as AuthRequest).user?.id;
        if (viewerId) void recordSearchAppearanceEvents(String(viewerId), validProfiles.map((p: any) => String(p.user?._id)).filter(Boolean));

        res.json(validProfiles);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const saveCofounder = async (req: AuthRequest, res: Response) => {
    try {
        const cofounderUserId = String(req.params.userId);
        const userId = String(req.user.id);
        
        const { data: existingRows } = await supabase.from('cofounder_saves')
            .select('id')
            .eq('data->>user', userId)
            .eq('data->>cofounderUser', cofounderUserId);

        if (existingRows && existingRows.length > 0) {
            await supabase.from('cofounder_saves').delete().eq('id', existingRows[0].id);
            return res.json({ saved: false });
        }
        
        await supabase.from('cofounder_saves').insert({
            id: crypto.randomUUID(),
            data: { user: userId, cofounderUser: cofounderUserId }
        });
        res.json({ saved: true });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const listSavedCofounders = async (req: AuthRequest, res: Response) => {
    try {
        const { data: savedRows } = await supabase.from('cofounder_saves').select('data').eq('data->>user', req.user.id);
        const mapped = (savedRows || []).map(s => String(s.data?.cofounderUser));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const upsertMyCofounderProfile = async (req: AuthRequest, res: Response) => {
    try {
        const bodyData = {
            user: req.user.id,
            currentRole: req.body.currentRole,
            lookingFor: req.body.lookingFor,
            commitment: req.body.commitment,
            equityExpectation: req.body.equityExpectation,
            yearsExperience: req.body.yearsExperience,
            previousStartups: req.body.previousStartups,
            availability: req.body.availability,
            vision: req.body.vision,
            strengths: Array.isArray(req.body.strengths) ? req.body.strengths : [],
            interests: Array.isArray(req.body.interests) ? req.body.interests : [],
            skills: Array.isArray(req.body.skills) ? req.body.skills : [],
            location: req.body.location,
            startupStatus: req.body.startupStatus,
            hourlyRate: req.body.hourlyRate,
            isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : true,
        };

        const { data: existingRows } = await supabase.from('cofounder_profiles').select('id, data').eq('data->>user', req.user.id);
        let profileRow;
        
        if (existingRows && existingRows.length > 0) {
            const { data } = await supabase.from('cofounder_profiles').update({
                data: { ...existingRows[0].data, ...bodyData },
                updated_at: new Date().toISOString()
            }).eq('id', existingRows[0].id).select().single();
            profileRow = data;
        } else {
            const { data } = await supabase.from('cofounder_profiles').insert({
                id: crypto.randomUUID(),
                data: bodyData
            }).select().single();
            profileRow = data;
        }

        const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (userRow) {
            const data = userRow.data;
            const wasExpertBefore = !!data?.profilesCreated?.expert;
            const updatedData = {
                ...data,
                profilesCreated: {
                    ...(data.profilesCreated || {}),
                    expert: true,
                },
            };
            await supabase.from('users').update({ data: updatedData, updated_at: new Date().toISOString() }).eq('id', req.user.id);

            if (!wasExpertBefore) {
                io.emit('profile_created', {
                    userId: String(req.user.id),
                    userName: updatedData.name,
                    userAvatar: updatedData.avatar,
                    profileType: 'expert',
                    expertise: Array.isArray(bodyData.skills) ? bodyData.skills.slice(0, 3) : [],
                    timestamp: new Date().toISOString()
                });
            }
            
        }

        const uData = userRow?.data || {};
        const populatedProfile = {
            ...profileRow.data,
            _id: profileRow.id,
            id: profileRow.id,
            createdAt: profileRow.created_at,
            updatedAt: profileRow.updated_at,
            user: {
                _id: req.user.id,
                name: uData.name,
                avatar: uData.avatar,
                role: uData.role,
                profile: uData.profile
            }
        };

        res.json(populatedProfile);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Send a co-founder connection request. Idempotent per (from, to) pair; creates
 * a `cofounder_connections` row and notifies the recipient. The "Connect" button
 * uses this.
 */
export const requestConnection = async (req: AuthRequest, res: Response) => {
    try {
        const me = String(req.user?.id || '');
        const otherId = String(req.params.userId || '');
        if (!me) return res.status(401).json({ message: 'Unauthorized' });
        if (!otherId) return res.status(400).json({ message: 'userId is required' });
        if (me === otherId) return res.status(400).json({ message: 'You cannot connect with yourself' });

        const { data: other } = await supabase.from('users').select('id').eq('id', otherId).single();
        if (!other) return res.status(404).json({ message: 'User not found' });

        const id = `${me}_${otherId}`;
        const now = new Date().toISOString();

        const { data: existing } = await supabase.from('cofounder_connections').select('data').eq('id', id).single();
        if (existing) {
            return res.json({ ok: true, status: existing.data?.status || 'pending', alreadyRequested: true });
        }

        const { error } = await supabase
            .from('cofounder_connections')
            .insert([{ id, data: { id, from: me, to: otherId, status: 'pending', createdAt: now }, created_at: now }]);
        if (error) {
            console.error('requestConnection insert failed:', error);
            return res.status(500).json({ message: 'Failed to send connection request', error: error.message });
        }

        const { data: meRow } = await supabase.from('users').select('data').eq('id', me).single();
        const myName = meRow?.data?.name || 'A founder';
        await createNotification(
            otherId,
            'cofounder_request',
            'New co-founder request',
            `${myName} wants to connect with you as a co-founder.`,
            undefined,
            me
        );

        return res.status(201).json({ ok: true, status: 'pending' });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to send connection request', error: error?.message });
    }
};

/** Connection status between the current user and another (none | pending | accepted). */
export const getConnectionStatus = async (req: AuthRequest, res: Response) => {
    try {
        const me = String(req.user?.id || '');
        const otherId = String(req.params.userId || '');
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const { data } = await supabase.from('cofounder_connections').select('data').eq('id', `${me}_${otherId}`).single();
        return res.json({ status: data?.data?.status || 'none' });
    } catch (error: any) {
        return res.json({ status: 'none' });
    }
};

export const getUserPublic = async (req: Request, res: Response) => {
    try {
        const { data: userRow, error } = await supabase.from('users').select('id, data').eq('id', req.params.userId).single();
        if (error || !userRow) return res.status(404).json({ message: 'User not found' });

        // Engagement: record a profile view (this is a single-user fetch chokepoint
        // for cofounder/messaging/discover surfaces). Self-views skipped in helper.
        const viewerId = (req as AuthRequest).user?.id;
        if (viewerId) void recordProfileViewEvent(String(viewerId), String(req.params.userId));

        res.json({
            _id: userRow.id,
            id: userRow.id,
            name: userRow.data?.name,
            avatar: userRow.data?.avatar,
            role: userRow.data?.role,
            profile: userRow.data?.profile,
            isVerified: !!userRow.data?.isVerified
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
