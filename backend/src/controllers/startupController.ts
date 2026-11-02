import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { io } from '../utils/socket';
import crypto from 'crypto';
import { uploadPublicFile } from '../utils/storage';
import { createNotification } from './notificationController';
import { isFollowing, getFollowerIds } from './followController';

const STARTUP_ASSETS_BUCKET = process.env.STARTUP_ASSETS_BUCKET || 'startup-assets';

const getExtFromFileName = (fileName: string | undefined) => {
    const safe = String(fileName || '').trim();
    const match = safe.match(/\.([a-zA-Z0-9]{1,10})$/);
    return match ? match[1].toLowerCase() : '';
};

export const createStartup = async (req: AuthRequest, res: Response) => {
    try {
        const id = crypto.randomUUID();
        const data = { id, founder: req.user.id, ...req.body, createdAt: new Date().toISOString(), investors: [] };
        const { error: insertError } = await supabase.from('startups').insert([{ id, data }]);
        if (insertError) {
            console.error('Error creating startup:', insertError);
            return res.status(500).json({ message: 'Failed to create startup' });
        }

        // Mark founder profile as created for this user
        const { data: userData, error: userError } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (userError) {
            console.error('Error fetching user:', userError);
        }
        if (userData) {
            const user = userData.data;
            user.profilesCreated = user.profilesCreated || {};
            user.profilesCreated.founder = true;
            const { error: updateError } = await supabase.from('users').update({ data: user }).eq('id', req.user.id);
            if (updateError) {
                console.error('Error updating user profile:', updateError);
            }

            // Emit socket event
            io.emit('profile_created', {
                userId: req.user.id,
                userName: user.name,
                userAvatar: user.avatar,
                profileType: 'founder',
                startupName: data.name,
                timestamp: new Date().toISOString()
            });

        }

        res.status(201).json(data);
    } catch (error) {
        console.error('createStartup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyStartups = async (req: AuthRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('startups').select('data').eq('data->>founder', req.user.id);
        if (error) {
            console.error('Error fetching startups:', error);
            return res.status(500).json({ message: 'Failed to fetch startups' });
        }
        res.json(data ? data.map((d: any) => d.data) : []);
    } catch (error) {
        console.error('getMyStartups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyStartupStats = async (req: AuthRequest, res: Response) => {
    try {
        const { data: startups, error: startupsError } = await supabase.from('startups').select('data').eq('data->>founder', req.user.id);
        if (startupsError) {
            console.error('Error fetching startups:', startupsError);
            return res.status(500).json({ message: 'Failed to fetch stats' });
        }

        let profileViews = 0;
        let connections = 0;
        let investorInterest = 0;
        let fundingProgress = 0;

        // Let's get actual connections (followers)
        const { count: followersCount, error: followersError } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('data->>following', req.user.id);
        if (followersError) {
            console.error('Error fetching followers count:', followersError);
        }
        connections = followersCount || 0;

        if (startups && startups.length > 0) {
            startups.forEach((s: any) => {
                const startup = s.data;
                // Add up stats or pick max
                profileViews += startup.profileViews || 0;
                investorInterest += Array.isArray(startup.investors) ? startup.investors.length : 0;

                // For funding progress, we can calculate based on raised vs target
                let progress = 0;
                if (startup.funding && startup.funding.target > 0) {
                    progress = Math.round(((startup.funding.raised || 0) / startup.funding.target) * 100);
                } else {
                    progress = startup.fundingProgress || 0;
                }
                fundingProgress = Math.max(fundingProgress, Math.min(progress, 100));
            });
        }
        res.json({ profileViews, connections, investorInterest, fundingProgress });
    } catch (error) {
        console.error('getMyStartupStats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllStartups = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('startups').select('data').limit(100);
        if (error) {
            console.error('Error fetching startups:', error);
            return res.status(500).json({ message: 'Failed to fetch startups' });
        }
        if (!data) return res.json([]);

        // Populate founder names
        const founderIds = [...new Set(data.map((d: any) => d.data.founder).filter(Boolean))];
        const { data: users, error: usersError } = await supabase.from('users').select('id, data').in('id', founderIds);
        if (usersError) {
            console.error('Error fetching users:', usersError);
        }
        const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u.data]));

        const results = data.map((d: any) => {
            const startup = d.data;
            const founder = userMap[startup.founder];
            const industry = Array.isArray(startup.industry) 
                ? startup.industry 
                : (typeof startup.industry === 'string' ? [startup.industry] : []);

            return {
                ...startup,
                industry,
                id: startup.id || startup._id,
                founder: founder ? {
                    id: startup.founder,
                    name: founder.name || 'Founder',
                    avatar: founder.avatar || '',
                    verified: !!founder.isVerified
                } : { id: startup.founder, name: 'Founder' }
            };
        });

        res.json(results);
    } catch (error) {
        console.error('getAllStartups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getStartupById = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('startups').select('data').eq('id', req.params.id).single();
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching startup:', error);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!data) return res.status(404).json({ message: 'Startup not found' });

        // Pitch decks are gated: the founder and their followers can download it,
        // everyone else only learns that a deck exists (URL stripped, locked flag set).
        const startup = data.data;
        if (startup.pitchDeckUrl) {
            const viewerId = (req as AuthRequest).user?.id;
            const allowed = viewerId ? await isFollowing(viewerId, startup.founder) : false;
            if (!allowed) {
                const { pitchDeckUrl, ...rest } = startup;
                return res.json({ ...rest, pitchDeckLocked: true });
            }
        }

        res.json(startup);
    } catch (error) {
        console.error('getStartupById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Gated pitch-deck download: returns the real URL only to the founder or a follower.
export const getStartupPitchDeck = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error } = await supabase.from('startups').select('data').eq('id', req.params.id).single();
        if (error && error.code !== 'PGRST116') {
            console.error('getStartupPitchDeck fetch error:', error);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!row) return res.status(404).json({ message: 'Startup not found' });

        const startup = row.data;
        if (!startup.pitchDeckUrl) return res.status(404).json({ message: 'No pitch deck uploaded' });

        const allowed = await isFollowing(req.user.id, startup.founder);
        if (!allowed) {
            return res.status(403).json({ message: 'Follow the founder to download this pitch deck', canDownload: false });
        }

        return res.json({
            canDownload: true,
            pitchDeckUrl: startup.pitchDeckUrl,
            pitchDeckName: startup.pitchDeckName || 'pitch-deck',
        });
    } catch (error) {
        console.error('getStartupPitchDeck error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateStartup = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', req.params.id).single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching startup:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!row) return res.status(404).json({ message: 'Startup not found' });

        if (row.data.founder !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You do not own this startup' });
        }

        const updated = { ...row.data, ...req.body, updatedAt: new Date().toISOString() };
        const { error: updateError } = await supabase.from('startups').update({ data: updated }).eq('id', row.id);
        if (updateError) {
            console.error('Error updating startup:', updateError);
            return res.status(500).json({ message: 'Failed to update startup' });
        }
        res.json(updated);
    } catch (error) {
        console.error('updateStartup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const upvoteStartup = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Startup not found' });

        const startup = row.data;
        if (!startup.upvotes) startup.upvotes = [];

        const index = startup.upvotes.indexOf(userId);
        if (index > -1) {
            startup.upvotes.splice(index, 1); // Unvote
        } else {
            startup.upvotes.push(userId); // Upvote
        }

        const { error: updateError } = await supabase.from('startups').update({ data: startup }).eq('id', row.id);
        if (updateError) throw updateError;

        res.json({ upvotes: startup.upvotes });
    } catch (error) {
        console.error('upvoteStartup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addStartupComment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Comment text is required' });

        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Startup not found' });

        const startup = row.data;
        if (!startup.comments) startup.comments = [];

        const newComment = {
            id: crypto.randomUUID(),
            userId: req.user.id,
            userName: req.user.name || 'Anonymous',
            userAvatar: req.user.avatar || '',
            text,
            createdAt: new Date().toISOString()
        };

        startup.comments.push(newComment);

        const { error: updateError } = await supabase.from('startups').update({ data: startup }).eq('id', row.id);
        if (updateError) throw updateError;

        res.status(201).json(newComment);
    } catch (error) {
        console.error('addStartupComment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getInvestorPipeline = async (req: AuthRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('startups').select('data').filter('data->investors', 'cs', `[{"user":"${req.user.id}"}]`);
        if (error) {
            console.error('Error fetching investment pipeline:', error);
            return res.status(500).json({ message: 'Failed to fetch pipeline' });
        }

        const grouped: Record<string, any[]> = {
            interested: [],
            underReview: [],
            negotiating: [],
            invested: [],
            closed: []
        };

        const stageMap: Record<string, string> = {
            'interested': 'interested',
            'underReview': 'underReview',
            'negotiating': 'negotiating',
            'dueDiligence': 'underReview',
            'invested': 'invested',
            'closed': 'closed',
            'passed': 'closed'
        };

        if (data) {
            // Populate founder names
            const founderIds = [...new Set(data.map((d: any) => d.data.founder).filter(Boolean))];
            const { data: users, error: usersError } = await supabase.from('users').select('id, data').in('id', founderIds);
            if (usersError) {
                console.error('Error fetching users:', usersError);
            }
            const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u.data]));

            data.forEach((row: any) => {
                const startup = row.data;
                const investorInfo = startup.investors.find((i: any) => String(i.user) === String(req.user.id));
                const rawStage = investorInfo?.stage || 'interested';
                const targetColumn = stageMap[rawStage] || 'interested';
                const fData = userMap[startup.founder];

                const industryRaw = startup.industry;
                const industry = Array.isArray(industryRaw)
                    ? industryRaw
                    : (typeof industryRaw === 'string' ? industryRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

                const formatted = {
                    ...startup,
                    id: startup.id || startup._id,
                    industry,
                    investorStage: targetColumn,
                    pitch: startup.tagline || startup.description || '',
                    funding: startup.funding?.target ? `$${(startup.funding.target / 1000000).toFixed(1)}M` : 'N/A',
                    equity: startup.funding?.equity ? `${startup.funding.equity}%` : 'N/A',
                    aiScore: startup.aiScore || 0,
                    addedDate: new Date(investorInfo?.date || startup.createdAt).toLocaleDateString(),
                    founder: {
                        id: startup.founder,
                        name: fData?.name || 'Founder',
                        avatar: fData?.avatar || (fData?.name ? fData.name.substring(0, 1).toUpperCase() : '?'),
                        verified: !!fData?.isVerified
                    }
                };

                if (grouped[targetColumn]) {
                    grouped[targetColumn].push(formatted);
                } else {
                    grouped.interested.push(formatted);
                }
            });
        }

        res.json(grouped);
    } catch (error) {
        console.error('getInvestorPipeline error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updatePipelineStage = async (req: AuthRequest, res: Response) => {
    try {
        const { stage } = req.body;
        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', req.params.id).single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching startup:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!row) return res.status(404).json({ message: 'Startup not found' });

        const startup = row.data;
        const investor = startup.investors?.find((i: any) => String(i.user) === String(req.user.id));
        if (investor) investor.stage = stage;
        const { error: updateError } = await supabase.from('startups').update({ data: startup }).eq('id', row.id);
        if (updateError) {
            console.error('Error updating startup:', updateError);
            return res.status(500).json({ message: 'Failed to update pipeline' });
        }

        // Sync with deal room stage
        const investorToDealStage: Record<string, string> = {
            'interested': 'interested',
            'underReview': 'under_review',
            'negotiating': 'negotiating',
            'invested': 'invested',
            'closed': 'closed'
        };
        const dealStage = investorToDealStage[stage] || 'interested';

        const { data: drRows, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('data->>startup', req.params.id);
        if (drError) {
            console.error('Error fetching deal rooms:', drError);
        }
        if (drRows && drRows.length > 0) {
            for (const drRow of drRows) {
                if (String(drRow.data.investorIds || []).includes(req.user.id) || drRow.data.founder === req.user.id) {
                    const dealRoom = drRow.data;
                    dealRoom.stage = dealStage;
                    dealRoom.updatedAt = new Date().toISOString();
                    const { error: drUpdateError } = await supabase.from('deal_rooms').update({ data: dealRoom }).eq('id', drRow.id);
                    if (drUpdateError) {
                        console.error('Error updating deal room:', drUpdateError);
                    }
                }
            }
        }

        // Emit socket event
        io.emit('dealroom_stage_updated', {
            startupId: req.params.id,
            investorId: req.user.id,
            pipelineStage: stage,
            dealRoomStage: dealStage
        });

        res.json(startup);
    } catch (error) {
        console.error('updatePipelineStage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getInvestorDiscovery = async (req: AuthRequest, res: Response) => {
    try {
        const { industry, stage, location } = req.query;
        let query = supabase.from('startups').select('data');
        if (industry) query = query.eq('data->>industry', industry);
        if (stage) query = query.eq('data->>stage', stage);
        if (location) query = query.filter('data->>location', 'ilike', `%${location}%`);

        // Exclude user's own startups (where they are the founder)
        query = query.neq('data->>founder', req.user.id);

        const { data, error } = await query.limit(50);
        if (error) {
            console.error('Error fetching discovery:', error);
            return res.status(500).json({ message: 'Failed to fetch startups' });
        }
        if (!data) return res.json([]);

        // Populate founder names
        const founderIds = [...new Set(data.map((d: any) => d.data.founder).filter(Boolean))];
        const { data: users, error: usersError } = await supabase.from('users').select('id, data').in('id', founderIds);
        if (usersError) {
            console.error('Error fetching users:', usersError);
        }
        const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u.data]));

        const results = data.map((d: any) => {
            const startup = d.data;
            const founder = userMap[startup.founder];
            const industryRaw = startup.industry;
            const industry = Array.isArray(industryRaw)
                ? industryRaw
                : (typeof industryRaw === 'string' ? industryRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

            return {
                ...startup,
                id: startup.id || startup._id,
                industry,
                founder: founder ? {
                    _id: startup.founder,
                    name: founder.name || 'Founder',
                    avatar: founder.avatar || ''
                } : { _id: startup.founder, name: 'Founder' }
            };
        });

        res.json(results);
    } catch (error) {
        console.error('getInvestorDiscovery error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getInvestorPortfolio = async (req: AuthRequest, res: Response) => {
    try {
        let { data, error } = await supabase.from('startups').select('data').filter('data->investors', 'cs', `[{"user":"${req.user.id}","stage":"invested"}]`);
        if (error) {
            console.error('Error fetching portfolio:', error);
            return res.status(500).json({ message: 'Failed to fetch portfolio' });
        }

        const portfolio = data ? data.map((d: any) => d.data) : [];
        res.json(portfolio);
    } catch (error) {
        console.error('getInvestorPortfolio error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addToPipeline = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', req.params.id).single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching startup:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!row) return res.status(404).json({ message: 'Startup not found' });

        const startup = row.data;
        if (!startup.investors) startup.investors = [];
        if (startup.investors.some((i: any) => String(i.user) === String(req.user.id))) {
            return res.status(400).json({ message: 'Already in pipeline' });
        }
        startup.investors.push({ user: req.user.id, stage: 'interested', date: new Date().toISOString() });
        const { error: updateError } = await supabase.from('startups').update({ data: startup }).eq('id', row.id);
        if (updateError) {
            console.error('Error updating startup:', updateError);
            return res.status(500).json({ message: 'Failed to add to pipeline' });
        }
        res.json(startup);
    } catch (error) {
        console.error('addToPipeline error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadStartupLogo = async (req: AuthRequest, res: Response) => {
    try {
        const file = (req as any).file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const startupId = req.body.startupId || req.query.startupId;
        if (!startupId) return res.status(400).json({ message: 'Startup ID is required' });

        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', startupId).single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching startup:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!row) return res.status(404).json({ message: 'Startup not found' });
        if (row.data.founder !== req.user.id) return res.status(403).json({ message: 'Access denied' });

        const ext = getExtFromFileName(file.originalname) || 'png';
        const objectPath = `logos/${startupId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const uploaded = await uploadPublicFile({
            bucket: STARTUP_ASSETS_BUCKET,
            objectPath,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        const logoUrl = uploaded.publicUrl;
        const updated = { ...row.data, logo: logoUrl, updatedAt: new Date().toISOString() };
        const { error: updateError } = await supabase.from('startups').update({ data: updated }).eq('id', row.id);
        if (updateError) {
            console.error('Error updating startup:', updateError);
            return res.status(500).json({ message: 'Failed to upload logo' });
        }

        res.json({ logoUrl });
    } catch (error) {
        console.error('uploadStartupLogo error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadStartupPitchDeck = async (req: AuthRequest, res: Response) => {
    try {
        const file = (req as any).file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const startupId = req.body.startupId || req.query.startupId;
        if (!startupId) return res.status(400).json({ message: 'Startup ID is required' });

        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', startupId).single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching startup:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!row) return res.status(404).json({ message: 'Startup not found' });
        if (row.data.founder !== req.user.id) return res.status(403).json({ message: 'Access denied' });

        const ext = getExtFromFileName(file.originalname) || 'pdf';
        const objectPath = `pitch-decks/${startupId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const uploaded = await uploadPublicFile({
            bucket: STARTUP_ASSETS_BUCKET,
            objectPath,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        const pitchDeckUrl = uploaded.publicUrl;
        const updated = {
            ...row.data,
            pitchDeckUrl,
            pitchDeckName: file.originalname,
            pitchDeckSize: file.size,
            updatedAt: new Date().toISOString()
        };
        const { error: updateError } = await supabase.from('startups').update({ data: updated }).eq('id', row.id);
        if (updateError) {
            console.error('Error updating startup:', updateError);
            return res.status(500).json({ message: 'Failed to upload pitch deck' });
        }

        // Notify the founder's followers that a new pitch deck is available.
        // Followers receive the download link in metadata; the gated endpoint and
        // getStartupById keep the actual file out of reach for non-followers.
        try {
            const founderId = req.user.id;
            const startupName = row.data.name || row.data.startupName || 'their startup';
            const { data: founderRow } = await supabase.from('users').select('data').eq('id', founderId).single();
            const founderName = founderRow?.data?.name || 'A founder you follow';
            const followerIds = await getFollowerIds(founderId);
            const link = `#startup/${startupId}`;
            await Promise.all(
                followerIds
                    .filter((fid) => fid && fid !== founderId)
                    .map((fid) =>
                        createNotification(
                            fid,
                            'pitch_deck',
                            'New Pitch Deck',
                            `${founderName} uploaded a new pitch deck for ${startupName}`,
                            link,
                            founderId,
                            { startupId, startupName, founderId, founderName, pitchDeckUrl, canDownload: true }
                        )
                    )
            );
        } catch (notifyErr) {
            console.error('pitch deck follower notification failed:', notifyErr);
        }

        res.json({ pitchDeckUrl });
    } catch (error) {
        console.error('uploadStartupPitchDeck error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
