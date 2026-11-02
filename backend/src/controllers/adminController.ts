import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import { supabase } from '../utils/supabase';
import { AdminRequest } from '../middleware/adminMiddleware';
import { sendEmail } from '../utils/mailer';
import { ROLE_STATUS, ROLE_BADGES, UserRole } from '../constants/roleConstants';
import { handleTokenRefresh } from '../middleware/adminSessionTimeout';
import { logAdminAction, getAdminActivityLogs } from '../utils/adminLogger';
import { deletePublicFile, resolveStorageRef } from '../utils/storage';
import { getPlayInstallStats } from '../services/playStoreStats';
import { getAppStoreStats } from '../services/appStoreStats';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET environment variable is not set. This is required for admin authentication.');
}

// ---------------------------------------------------------------------------
// Admin credentials configuration
// Admin credentials are loaded from environment variables for security.
// Format: ADMIN_CREDENTIALS=username1:passwordHash1,username2:passwordHash2
// 
// To generate a password hash, run:
// node -e "require('bcryptjs').hash('yourpassword',10).then(console.log)"
// 
// Example .env configuration:
// ADMIN_CREDENTIALS=admin@nextignition.io:$2b$10$hash1,ops@nextignition.io:$2b$10$hash2
// ---------------------------------------------------------------------------

interface AdminUser {
    username: string;
    passwordHash: string;
    displayName: string;
}

const loadAdminsFromEnv = (): AdminUser[] => {
    const adminCredsString = process.env.ADMIN_CREDENTIALS;
    
    if (!adminCredsString) {
        throw new Error(
            'ADMIN_CREDENTIALS environment variable is required. ' +
            'Format: username1:passwordHash1:displayName1,username2:passwordHash2:displayName2'
        );
    }

    const admins: AdminUser[] = [];
    // Split by comma to get each admin entry
    const entries = adminCredsString.split(',');

    for (const entry of entries) {
        const trimmed = entry.trim();
        // Split on ':' but only take first 2 splits; join remainder as displayName
        // This handles bcrypt hashes safely (they contain $ but not :)
        const colonIdx1 = trimmed.indexOf(':');
        if (colonIdx1 === -1) {
            console.error(`Invalid admin entry format: ${trimmed}. Expected username:passwordHash:displayName`);
            continue;
        }
        const colonIdx2 = trimmed.indexOf(':', colonIdx1 + 1);
        const username = trimmed.substring(0, colonIdx1).trim();
        const passwordHash = colonIdx2 === -1
            ? trimmed.substring(colonIdx1 + 1).trim()
            : trimmed.substring(colonIdx1 + 1, colonIdx2).trim();
        const displayName = colonIdx2 === -1
            ? username
            : trimmed.substring(colonIdx2 + 1).trim() || username;

        if (!username || !passwordHash) {
            console.error(`Invalid admin entry: missing username or password hash`);
            continue;
        }

        admins.push({ username, passwordHash, displayName });
    }

    if (admins.length === 0) {
        throw new Error('No valid admin credentials found in ADMIN_CREDENTIALS environment variable');
    }

    return admins;
};

// ---------------------------------------------------------------------------
// Admin initialization
// ---------------------------------------------------------------------------
let resolvedAdmins: AdminUser[] = [];
let isInitialized = false;

const bootstrapAdmins = async () => {
    try {
        resolvedAdmins = loadAdminsFromEnv();
        isInitialized = true;
        console.log(`Admin system initialized successfully with ${resolvedAdmins.length} admin(s)`);
    } catch (error) {
        console.error('Failed to bootstrap admins:', error);
        throw error; // Re-throw to prevent server from starting without admin config
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/set-plan
// Body: { role: 'founder'|'expert'|'investor', plan: 'free'|'pro'|'elite' }
// ---------------------------------------------------------------------------
export const setUserPlanTier = async (req: AdminRequest, res: Response) => {
    try {
        const userId = String(req.params.id || '').trim();
        const role = String(req.body?.role || '').trim();
        const plan = String(req.body?.plan || '').trim();

        if (!userId) return res.status(400).json({ message: 'User ID is required' });
        if (!['founder', 'expert', 'investor'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be founder, expert, or investor.' });
        }
        if (!['free', 'pro', 'elite'].includes(plan)) {
            return res.status(400).json({ message: 'Invalid plan. Must be free, pro, or elite.' });
        }

        const col = `${role}_plan`;
        
        // Fetch current data first
        const { data: userRow, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', userId)
            .single();

        if (fetchError || !userRow) {
            return res.status(404).json({ message: 'User not found' });
        }

        const currentData = userRow.data || {};
        const updatedData = { ...currentData, [col]: plan };

        const { data: updated, error } = await supabase
            .from('users')
            .update({ data: updatedData })
            .eq('id', userId)
            .select('id, data')
            .single();

        if (error) {
            return res.status(500).json({ message: 'Failed to update user plan', error: error.message });
        }

        return res.json({ success: true, userId, role, plan, updated });
    } catch (err: any) {
        return res.status(500).json({ message: 'Failed to update user plan', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/users/:id  (full detail dump)
// ---------------------------------------------------------------------------
export const getUserDetail = async (req: AdminRequest, res: Response) => {
    try {
        const userId = String(req.params.id || '').trim();
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const { data: userRow, error: userErr } = await supabase
            .from('users')
            .select('id, data, created_at, updated_at')
            .eq('id', userId)
            .single();

        if (userErr || !userRow) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch related records in parallel.
        // Note: Most tables store payload in a JSONB `data` column.
        const [
            postsRes,
            startupsRes,
            eventsHostingRes,
            eventsRegisteredRes,
            paymentsRes,
            subscriptionsRes,
            bookingsFounderRes,
            bookingsExpertRes,
            conversationsRes,
            directMessagesSentRes,
            notificationsRes,
            messagesRes,
            communityMessagesRes,
            followsAsFollowerRes,
            followsAsFollowingRes,
            fundingApplicationsRes,
            fundingBookmarksRes,
            fundingInterestsRes,
            dealRoomsRes,
            dealRoomDocumentsRes,
            documentAnalysesRes,
            pitchDeckAnalysesRes,
            savedItemsRes,
            storiesRes,
            cofounderProfilesRes,
            cofounderSavesRes,
            availabilitiesRes,
            specificAvailabilitiesRes,
            knowledgeContentRes,
        ] = await Promise.all([
            supabase.from('posts').select('id, data, created_at, updated_at').eq('data->>author', userId),
            supabase.from('startups').select('id, data, created_at, updated_at').eq('data->>founder', userId),
            supabase.from('events').select('id, data, created_at, updated_at').eq('data->>hostUser', userId),
            supabase.from('events').select('id, data, created_at, updated_at').filter('data->registeredUsers', 'cs', `["${userId}"]`),
            supabase.from('payments').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('subscriptions').select('*').eq('user_id', userId),
            supabase.from('bookings').select('id, data, created_at, updated_at').eq('data->>founder', userId),
            supabase.from('bookings').select('id, data, created_at, updated_at').eq('data->>expert', userId),
            supabase.from('conversations').select('id, data, created_at, updated_at').filter('data->participants', 'cs', `["${userId}"]`),
            supabase.from('direct_messages').select('id, data, created_at, updated_at').eq('data->>sender', userId),
            supabase.from('notifications').select('id, data, created_at, updated_at').eq('data->>userId', userId),
            supabase.from('messages').select('id, data, created_at, updated_at').or(`data->>sender.eq.${userId},data->>receiver.eq.${userId}`),
            supabase.from('community_messages').select('id, data, created_at, updated_at').eq('data->>sender', userId),
            supabase.from('follows').select('id, data, created_at, updated_at').eq('data->>follower', userId),
            supabase.from('follows').select('id, data, created_at, updated_at').eq('data->>following', userId),
            supabase.from('funding_applications').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('funding_bookmarks').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('funding_interests').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('deal_rooms').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('deal_room_documents').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('document_analyses').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('pitch_deck_analyses').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('saved_items').select('*').eq('user_id', userId),
            supabase.from('stories').select('id, data, created_at, updated_at').eq('data->>author', userId),
            supabase.from('cofounder_profiles').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('cofounder_saves').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('availabilities').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('specific_availabilities').select('id, data, created_at, updated_at').eq('data->>user', userId),
            supabase.from('knowledge_content').select('id, data, created_at, updated_at').eq('data->>author', userId),
        ]);

        const payload = {
            user: {
                id: userRow.id,
                data: userRow.data || {},
                created_at: userRow.created_at,
                updated_at: userRow.updated_at,
            },
            related: {
                posts: postsRes.data || [],
                startups: startupsRes.data || [],
                eventsHosting: eventsHostingRes.data || [],
                eventsRegistered: eventsRegisteredRes.data || [],
                payments: paymentsRes.data || [],
                subscriptions: subscriptionsRes.data || [],
                bookingsAsFounder: bookingsFounderRes.data || [],
                bookingsAsExpert: bookingsExpertRes.data || [],
                conversations: conversationsRes.data || [],
                directMessagesSent: directMessagesSentRes.data || [],
                notifications: notificationsRes.data || [],
                messages: messagesRes.data || [],
                communityMessages: communityMessagesRes.data || [],
                followsAsFollower: followsAsFollowerRes.data || [],
                followsAsFollowing: followsAsFollowingRes.data || [],
                fundingApplications: fundingApplicationsRes.data || [],
                fundingBookmarks: fundingBookmarksRes.data || [],
                fundingInterests: fundingInterestsRes.data || [],
                dealRooms: dealRoomsRes.data || [],
                dealRoomDocuments: dealRoomDocumentsRes.data || [],
                documentAnalyses: documentAnalysesRes.data || [],
                pitchDeckAnalyses: pitchDeckAnalysesRes.data || [],
                savedItems: savedItemsRes.data || [],
                stories: storiesRes.data || [],
                cofounderProfiles: cofounderProfilesRes.data || [],
                cofounderSaves: cofounderSavesRes.data || [],
                availabilities: availabilitiesRes.data || [],
                specificAvailabilities: specificAvailabilitiesRes.data || [],
                knowledgeContent: knowledgeContentRes.data || [],
            },
            errors: {
                posts: postsRes.error?.message || null,
                startups: startupsRes.error?.message || null,
                eventsHosting: eventsHostingRes.error?.message || null,
                eventsRegistered: eventsRegisteredRes.error?.message || null,
                payments: paymentsRes.error?.message || null,
                subscriptions: subscriptionsRes.error?.message || null,
                bookingsAsFounder: bookingsFounderRes.error?.message || null,
                bookingsAsExpert: bookingsExpertRes.error?.message || null,
                conversations: conversationsRes.error?.message || null,
                directMessagesSent: directMessagesSentRes.error?.message || null,
                notifications: notificationsRes.error?.message || null,
                messages: messagesRes.error?.message || null,
                communityMessages: communityMessagesRes.error?.message || null,
                followsAsFollower: followsAsFollowerRes.error?.message || null,
                followsAsFollowing: followsAsFollowingRes.error?.message || null,
                fundingApplications: fundingApplicationsRes.error?.message || null,
                fundingBookmarks: fundingBookmarksRes.error?.message || null,
                fundingInterests: fundingInterestsRes.error?.message || null,
                dealRooms: dealRoomsRes.error?.message || null,
                dealRoomDocuments: dealRoomDocumentsRes.error?.message || null,
                documentAnalyses: documentAnalysesRes.error?.message || null,
                pitchDeckAnalyses: pitchDeckAnalysesRes.error?.message || null,
                savedItems: savedItemsRes.error?.message || null,
                stories: storiesRes.error?.message || null,
                cofounderProfiles: cofounderProfilesRes.error?.message || null,
                cofounderSaves: cofounderSavesRes.error?.message || null,
                availabilities: availabilitiesRes.error?.message || null,
                specificAvailabilities: specificAvailabilitiesRes.error?.message || null,
                knowledgeContent: knowledgeContentRes.error?.message || null,
            },
        };

        return res.json(payload);
    } catch (err: any) {
        return res.status(500).json({ message: 'Failed to fetch user detail', error: err?.message });
    }
};

const ensureInitialized = async () => {
    if (isInitialized) return;
    await bootstrapAdmins();
};

// Start bootstrapping
bootstrapAdmins();

// ---------------------------------------------------------------------------
// POST /api/admin/login - 2-Level RBAC System
// Hybrid approach: Check admin_users table, fall back to env for PRIMARY_ADMIN bootstrap
// ---------------------------------------------------------------------------
export const adminLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        // Normalize the email so login isn't broken by capitalization (mobile
        // keyboards auto-capitalize) or stray surrounding whitespace.
        const normalizedEmail = String(email).trim().toLowerCase();

        // 1. Try to find admin in admin_users table
        const { data: dbAdmin, error: dbError } = await supabase
            .from('admin_users')
            .select('id, email, password_hash, name, role, status')
            .eq('email', normalizedEmail)
            .single();

        if (!dbError && dbAdmin && dbAdmin.status === 'active') {
            // Found active admin in database
            const valid = await bcrypt.compare(password, dbAdmin.password_hash);
            if (!valid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Generate tokens
            const accessToken = jwt.sign(
                {
                    id: dbAdmin.id,
                    username: dbAdmin.email,
                    displayName: dbAdmin.name,
                    role: dbAdmin.role,
                    email: dbAdmin.email,
                },
                ADMIN_JWT_SECRET,
                { expiresIn: '30m' }
            );

            const refreshToken = jwt.sign(
                {
                    id: dbAdmin.id,
                    email: dbAdmin.email,
                    role: dbAdmin.role,
                    type: 'refresh',
                },
                ADMIN_JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Update last_login
            await supabase
                .from('admin_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', dbAdmin.id);

            // Set refresh token as httpOnly cookie
            res.cookie('admin_refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return res.json({
                token: accessToken,
                refreshToken,
                displayName: dbAdmin.name,
                username: dbAdmin.email,
                role: dbAdmin.role,
                expiresIn: '30m',
            });
        }

        // 2. Fallback to env-based PRIMARY_ADMIN for bootstrap (hybrid approach)
        await ensureInitialized();
        const envAdmin = resolvedAdmins.find((a) => a.username.trim().toLowerCase() === normalizedEmail);

        if (!envAdmin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, envAdmin.passwordHash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Env-based PRIMARY_ADMIN — use the canonical configured email as the id
        // (not the raw typed value) so the audit trail and env-bypass check match.
        const accessToken = jwt.sign(
            {
                id: envAdmin.username,
                username: envAdmin.username,
                displayName: envAdmin.displayName,
                role: 'PRIMARY_ADMIN',
                email: envAdmin.username,
            },
            ADMIN_JWT_SECRET,
            { expiresIn: '30m' }
        );

        const refreshToken = jwt.sign(
            {
                id: envAdmin.username,
                email: envAdmin.username,
                role: 'PRIMARY_ADMIN',
                type: 'refresh',
            },
            ADMIN_JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('admin_refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            token: accessToken,
            refreshToken,
            displayName: envAdmin.displayName,
            username: envAdmin.username,
            role: 'PRIMARY_ADMIN',
            expiresIn: '30m',
        });
    } catch (error) {
        console.error('[AdminLogin] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/users?page=1&limit=20&search=
// ---------------------------------------------------------------------------
export const getUsers = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10));
        const search = String(req.query.search || '').toLowerCase().trim();
        const isFrozen = req.query.isFrozen === 'true';

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        console.log(`[AdminController] getUsers: page=${page}, limit=${limit}, search="${search}"`);

        // Backward-compatible select:
        // Some deployed DBs may not yet have founder_plan/expert_plan/investor_plan columns.
        // If PostgREST rejects the select, we fall back to selecting only id,data.
        let query = supabase
            .from('users')
            .select('id, data, created_at', { count: 'exact' });

        if (search) {
            // Sanitize search input to prevent SQL injection
            // Escape special PostgreSQL LIKE wildcards and quotes
            const sanitizedSearch = search
                .replace(/\\/g, '\\\\')  // Escape backslashes
                .replace(/%/g, '\\%')     // Escape % wildcard
                .replace(/_/g, '\\_')     // Escape _ wildcard
                .replace(/'/g, "''")      // Escape single quotes
                .replace(/[,()*]/g, '');  // Strip PostgREST .or() filter delimiters (injection)
            
            query = query.or(
                `data->>name.ilike.%${sanitizedSearch}%,` +
                `data->>email.ilike.%${sanitizedSearch}%,` +
                `data->>role.ilike.%${sanitizedSearch}%,` +
                `data->>username.ilike.%${sanitizedSearch}%`
            );
        }

        if (isFrozen) {
            query = query.or('data->>isFrozen.eq.true,data->>isFrozen.eq."true"');
        }

        let rows: any[] | null = null;
        let count: number | null = null;
        let error: any = null;

        {
            const res1 = await query.order('created_at', { ascending: false }).range(from, to);
            rows = res1.data as any[] | null;
            count = res1.count;
            error = res1.error;
        }

        console.log(`[AdminController] getUsers result: isFrozen=${isFrozen}, count=${count}, rows=${rows?.length || 0}`);

        if (error) {
            const msg = String(error?.message || '');
            const looksLikeMissingColumn = msg.toLowerCase().includes('column') || msg.toLowerCase().includes('founder_plan');
            if (looksLikeMissingColumn) {
                console.warn('[AdminController] getUsers: plan columns missing in DB, falling back to id,data select');

                let fallback = supabase.from('users').select('id, data', { count: 'exact' });
                if (search) {
                    const sanitizedSearch = search
                        .replace(/\\/g, '\\\\')
                        .replace(/%/g, '\\%')
                        .replace(/_/g, '\\_')
                        .replace(/'/g, "''")
                        .replace(/[,()*]/g, '');
                    fallback = fallback.or(
                        `data->>name.ilike.%${sanitizedSearch}%,` +
                        `data->>email.ilike.%${sanitizedSearch}%,` +
                        `data->>role.ilike.%${sanitizedSearch}%,` +
                        `data->>username.ilike.%${sanitizedSearch}%`
                    );
                }

                if (isFrozen) {
                    fallback = fallback.or('data->>isFrozen.eq.true,data->>isFrozen.eq."true"');
                }

                const res2 = await fallback.order('created_at', { ascending: false }).range(from, to);
                rows = res2.data as any[] | null;
                count = res2.count as any;
                if (res2.error) {
                    console.error('[AdminController] getUsers fallback query error:', res2.error);
                    throw res2.error;
                }
            } else {
                console.error('[AdminController] getUsers query error:', error);
                throw error;
            }
        }

        console.log(`[AdminController] getUsers query success: count=${count}, rows=${rows?.length || 0}`);

        const users = (rows || []).map((row: any) => {
            const d = row.data || {};
            return {
                id: row.id,
                name: d.name || 'Unknown',
                email: d.email || '',
                role: d.role || 'unknown',
                roles: d.roles || [d.role],
                linkedInUrl: d.linkedInUrl || null,
                createdAt: d.createdAt || row.created_at,
                lastActive: d.lastActive || null,
                isVerified: d.isVerified === true || d.isVerified === 'true',
                isFrozen: d.isFrozen === true || d.isFrozen === 'true',
                avatar: d.avatar || null,
                totalSessions: d.totalSessions || 0,
                lastTransaction: d.lastTransaction || null,
                founder_plan: d.founder_plan || 'free',
                expert_plan: d.expert_plan || 'free',
                investor_plan: d.investor_plan || 'free',
            };
        });

        res.json({ users, total: count || 0, page, limit });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch users', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/stats  (simple — kept for legacy compatibility)
// ---------------------------------------------------------------------------
export const getStats = async (_req: AdminRequest, res: Response) => {
    try {
        // Fetch all users but only minimum data for counting
        const { data: rows, error } = await supabase
            .from('users')
            .select('data->role, data->roles, data->isFrozen, data->lastActive');
        
        if (error) throw error;

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        let founders = 0, experts = 0, investors = 0, frozen = 0, activeToday = 0, totalRevenue = 0;

        for (const row of rows || []) {
            const d = row || {};
            const role = String(d.role || '').toLowerCase();
            const roles = Array.isArray(d.roles) ? d.roles.map((r: any) => String(r).toLowerCase()) : [];
            
            const isFounder = role === 'founder' || roles.includes('founder');
            const isExpert = role === 'expert' || roles.includes('expert');
            const isInvestor = role === 'investor' || roles.includes('investor');
            const isFrozen = d.isFrozen === true || d.isFrozen === 'true';

            if (isFounder) founders++;
            if (isExpert) experts++;
            if (isInvestor) investors++;
            if (isFrozen) frozen++;
            if (d.lastActive && new Date(d.lastActive as any) > oneDayAgo) activeToday++;
        }

        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('data->amount')
            .eq('data->>status', 'paid');

        if (!payError && payments) {
            totalRevenue = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) / 100;
        }

        res.json({ 
            totalUsers: rows?.length || 0, 
            founders, 
            experts, 
            investors, 
            frozen, 
            activeToday, 
            totalRevenue 
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch stats', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard  — rich stats for the new AdminDashboard component
// ---------------------------------------------------------------------------
export const getDashboard = async (req: AdminRequest, res: Response) => {
    try {
        const { range = '7d', startDate, endDate } = req.query;
        const now = new Date();
        let thresholdDate: Date;
        let rangeDays = 7;

        if (range === '15d') {
            thresholdDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
            rangeDays = 15;
        } else if (range === '1m') {
            thresholdDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            rangeDays = 30;
        } else if (range === 'custom' && startDate && endDate) {
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));
            thresholdDate = start;
            rangeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        } else {
            thresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            rangeDays = 7;
        }

        // 1. Fetch ALL users for accurate counting (but only needed fields)
        const { data: allRows, error: userErr } = await supabase
            .from('users')
            .select('id, data->role, data->roles, data->isFrozen, data->lastActive, data->subscriptionTier, data->tier, data->createdAt, created_at');
        if (userErr) throw userErr;

        const rows = allRows || [];
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        let founders = 0, experts = 0, investors = 0, frozen = 0, activeToday = 0;
        let newThisWeek = 0, newThisMonth = 0;
        let newInRange = 0;

        // Per-day signup counts for the selected range
        const dayBuckets: Record<string, number> = {};
        for (let i = rangeDays - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dayBuckets[d.toISOString().slice(0, 10)] = 0;
        }

        // Tier breakdown
        const tierMap: Record<string, number> = {};

        for (const row of rows) {
            const d = row || {};
            const role = String(d.role || '').toLowerCase();
            const roles = Array.isArray(d.roles) ? d.roles.map((r: any) => String(r).toLowerCase()) : [];
            
            const isFounder = role === 'founder' || roles.includes('founder');
            const isExpert = role === 'expert' || roles.includes('expert');
            const isInvestor = role === 'investor' || roles.includes('investor');
            const isFrozen = d.isFrozen === true || d.isFrozen === 'true';

            if (isFounder) founders++;
            if (isExpert) experts++;
            if (isInvestor) investors++;
            if (isFrozen) frozen++;
            if (d.lastActive && new Date(d.lastActive as any) > oneDayAgo) activeToday++;

            const created = (d.createdAt || row.created_at) as any;
            if (created) {
                const createdDate = new Date(created);
                if (createdDate > sevenDaysAgo) newThisWeek++;
                if (createdDate > thirtyDaysAgo) newThisMonth++;
                if (createdDate > thresholdDate) newInRange++;
                const key = createdDate.toISOString().slice(0, 10);
                if (key in dayBuckets) dayBuckets[key]++;
            }

            const tier = String(d.subscriptionTier || d.tier || 'free');
            tierMap[tier] = (tierMap[tier] || 0) + 1;
        }

        const userGrowthData = Object.entries(dayBuckets).map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
            users: count,
        }));

        const tierBreakdown = Object.entries(tierMap).map(([name, value]) => ({ name, value }));

        // 2. Payments / Revenue
        const { data: allPayments, error: payErr } = await supabase.from('payments').select('id, data, created_at');
        if (payErr) {
            console.error('[AdminDashboard] payments fetch error:', payErr);
        }
        const payments = allPayments || [];

        let totalRevenue = 0;
        let revenueThisMonth = 0;
        let revenueInRange = 0;
        let paidCount = 0;
        const revenueByDay: Record<string, number> = {};
        for (let i = rangeDays - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            revenueByDay[d.toISOString().slice(0, 10)] = 0;
        }

        for (const p of payments) {
            const d = p.data || {};
            const amt = (d.amount || 0) / 100;
            if (d.status === 'paid' || d.status === 'captured') {
                totalRevenue += amt;
                paidCount++;
                const pDate = new Date(d.createdAt || p.created_at);
                if (pDate > thirtyDaysAgo) revenueThisMonth += amt;
                if (pDate > thresholdDate) revenueInRange += amt;
                const key = pDate.toISOString().slice(0, 10);
                if (key in revenueByDay) revenueByDay[key] += amt;
            }
        }

        const revenueData = Object.entries(revenueByDay).map(([date, revenue]) => ({
            date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
            revenue: Math.round(revenue),
        }));

        // 3. Events
        let totalEvents = 0;
        try {
            const { count, error: eventErr } = await supabase.from('events').select('id', { count: 'exact', head: true });
            if (eventErr) throw eventErr;
            totalEvents = count || 0;
        } catch (e) {
            console.warn('Events table may not exist or is inaccessible:', e);
        }

        // 4. Recent users (fetch latest 10 specifically)
        const { data: recentSignups, error: recentErr } = await supabase
            .from('users')
            .select('id, data, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
        
        const recentUsers = (recentSignups || []).map(row => {
            const d = row.data || {};
            return {
                id: row.id,
                name: d.name || 'Unknown',
                email: d.email || '',
                role: d.role || 'unknown',
                createdAt: d.createdAt || row.created_at,
                isFrozen: d.isFrozen === true || d.isFrozen === 'true',
                isVerified: d.isVerified === true || d.isVerified === 'true',
                avatar: d.avatar || null,
            };
        });

        // 5. Recent transactions
        const recentPayments = payments
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, 8)
            .map(p => {
                const d = p.data || {};
                return {
                    id: p.id,
                    userId: d.user,
                    amount: (d.amount || 0) / 100,
                    currency: d.currency || 'INR',
                    status: d.status || 'unknown',
                    purpose: d.purpose || 'Transaction',
                    date: d.createdAt || p.created_at,
                };
            });

        // 6. Store install stats (Play Console GCS export + App Store Connect API).
        // Cached + fault-tolerant: each returns null when unconfigured or on error.
        const [appInstalls, iosInstalls] = await Promise.all([
            getPlayInstallStats(),
            getAppStoreStats(),
        ]);

        res.json({
            users: {
                total: rows.length,
                founders,
                experts,
                investors,
                frozen,
                activeToday,
                newThisWeek,
                newThisMonth,
                newInRange,
                rangeLabel: range === '7d' ? 'this week' : range === '15d' ? 'last 15 days' : range === '1m' ? 'this month' : 'custom range'
            },
            revenue: {
                total: totalRevenue,
                thisMonth: revenueThisMonth,
                inRange: revenueInRange,
                transactions: paidCount,
            },
            charts: {
                userGrowth: userGrowthData,
                revenue: revenueData,
                tierBreakdown,
            },
            recentUsers,
            totalEvents,
            rangeSettings: {
                range,
                startDate,
                endDate,
                rangeDays
            },
            recentTransactions: recentPayments,
            appInstalls,
            iosInstalls,
        });
    } catch (err: any) {
        console.error('getDashboard error:', err);
        res.status(500).json({ message: 'Failed to fetch dashboard data', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/freeze/:id
// ---------------------------------------------------------------------------
export const freezeUser = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data: row, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', id)
            .single();

        if (fetchError || !row) return res.status(404).json({ message: 'User not found' });

        const updated = { ...row.data, isFrozen: true, frozenAt: new Date().toISOString(), frozenBy: req.admin?.username };
        const { error } = await supabase.from('users').update({ data: updated }).eq('id', id);
        if (error) throw error;

        // Send notification
        try {
            await sendEmail({
                to: updated.email,
                subject: 'Account Activity: Security Alert',
                text: `Your account has been frozen by an admin. For more information, please contact support@nextignition.com.`,
                html: `<p>Hello,</p><p>We are writing to inform you that your account has been <strong>frozen</strong> by an administrator for security purposes.</p><p>If you believe this is an error, please contact our support team at <a href="mailto:support@nextignition.com">support@nextignition.com</a>.</p>`
            });
        } catch (e) {
            console.error('[AdminController] Failed to send freeze email:', e);
        }

        res.json({ message: 'Account frozen', userId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to freeze user', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/unfreeze/:id
// ---------------------------------------------------------------------------
export const unfreezeUser = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data: row, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', id)
            .single();

        if (fetchError || !row) return res.status(404).json({ message: 'User not found' });

        const updated = { ...row.data, isFrozen: false, frozenAt: null, frozenBy: null };
        const { error } = await supabase.from('users').update({ data: updated }).eq('id', id);
        if (error) throw error;

        // Send notification
        try {
            await sendEmail({
                to: updated.email,
                subject: 'Account Activity: Security Alert',
                text: `Your account has been unfrozen. You can now log back into the platform.`,
                html: `<p>Hello,</p><p>Great news! Your account has been <strong>unfrozen</strong> by an administrator. You can now log back into the platform and continue using all features.</p>`
            });
        } catch (e) {
            console.error('[AdminController] Failed to send unfreeze email:', e);
        }

        res.json({ message: 'Account unfrozen', userId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to unfreeze user', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/delete/:id
// ---------------------------------------------------------------------------
export const deleteUser = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Capture identity before deletion so the audit trail retains who was removed.
        const { data: existing } = await supabase.from('users').select('data').eq('id', id).single();
        if (!existing) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(String(id), {
                action: 'DELETE_USER',
                before: { email: existing.data?.email, name: existing.data?.name, role: existing.data?.role },
            });
        }

        res.json({ message: 'User deleted', userId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to delete user', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id — edit user details (spec 3.2)
// ---------------------------------------------------------------------------
const USER_EDITABLE_FIELDS = ['name', 'bio', 'phone', 'location', 'avatar', 'headline', 'company', 'website'];
export const updateUser = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: row, error: fetchError } = await supabase.from('users').select('data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'User not found' });

        // Whitelist editable profile fields. Email/role/plan/verification are managed
        // by dedicated endpoints and must not be silently overwritten here.
        const changes: Record<string, any> = {};
        for (const field of USER_EDITABLE_FIELDS) {
            if (req.body[field] !== undefined) changes[field] = req.body[field];
        }
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({ message: 'No editable fields provided' });
        }

        const updated = { ...row.data, ...changes, updatedAt: new Date().toISOString() };
        const { error } = await supabase.from('users').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'EDIT_USER', after: changes });
        }

        res.json({ message: 'User updated successfully', userId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update user', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/transactions?page=1&limit=20
// ---------------------------------------------------------------------------
export const getTransactions = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10));

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Fetch payments and join user data
        // Note: Supabase JSONB filtering and joining is slightly different.
        // We'll fetch the payments and then manually join user names for simplicity/reliability if needed,
        // or use the Supabase reference if the payment->user link is in a root column.
        // Assuming 'payments' table has 'id', 'data' (JSONB), 'created_at'.
        // Looking at Payment.ts model, it has 'user' which is an ObjectId.
        
        const { data: rows, count, error } = await supabase
            .from('payments')
            .select('id, data, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Collect all user IDs to fetch their names in one go
        const userIds = [...new Set((rows || []).map(r => r.data?.user).filter(Boolean))];
        const { data: userData, error: userErr } = await supabase
            .from('users')
            .select('id, data')
            .in('id', userIds);
        
        if (userErr) {
            console.error('[AdminTransactions] users join error:', userErr);
        }
        
        const userMap: Record<string, string> = {};
        (userData || []).forEach(u => {
            userMap[u.id] = u.data?.name || u.data?.email || 'Unknown';
        });

        const transactions = (rows || []).map(r => {
            const d = r.data || {};
            return {
                id: r.id,
                userName: userMap[d.user] || 'Unknown User',
                userId: d.user,
                purpose: d.purpose || 'Transaction',
                amount: (d.amount || 0) / 100,
                currency: d.currency || 'INR',
                status: d.status || 'unknown',
                orderId: d.orderId,
                paymentId: d.paymentId,
                date: r.created_at || d.createdAt
            };
        });

        res.json({ transactions, total: count || 0, page, limit });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch transactions', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/verify/:id
// ---------------------------------------------------------------------------
export const verifyUser = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data: row, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', id)
            .single();

        if (fetchError || !row) return res.status(404).json({ message: 'User not found' });

        const updated = { 
            ...row.data, 
            isVerified: true, 
            verificationStatus: 'approved',
            verifiedAt: new Date().toISOString(), 
            verifiedBy: req.admin?.username 
        };
        const { error } = await supabase.from('users').update({ data: updated }).eq('id', id);
        if (error) throw error;

        // Send notification
        try {
            await sendEmail({
                to: updated.email,
                subject: 'Account Verified: NextIgnition',
                text: `Congratulations! Your account has been successfully verified. You now have full access to platform features.`,
                html: `<p>Hello,</p><p>Congratulations! Your account has been <strong>successfully verified</strong> by an administrator. You now have full access to all verified-only features on the NextIgnition platform.</p>`
            });
        } catch (e) {
            console.error('[AdminController] Failed to send verification email:', e);
        }

        res.json({ message: 'User verified successfully', userId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to verify user', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/unverify/:id
// ---------------------------------------------------------------------------
export const unverifyUser = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data: row, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', id)
            .single();

        if (fetchError || !row) return res.status(404).json({ message: 'User not found' });

        const updated = { 
            ...row.data, 
            isVerified: false, 
            verificationStatus: 'none',
            unverifiedAt: new Date().toISOString(), 
            unverifiedBy: req.admin?.username 
        };
        const { error } = await supabase.from('users').update({ data: updated }).eq('id', id);
        if (error) throw error;

        // Send notification
        try {
            await sendEmail({
                to: updated.email,
                subject: 'Account Status Update: NextIgnition',
                text: `Your account verification status has been updated to unverified.`,
                html: `<p>Hello,</p><p>We are writing to inform you that your account verification status has been changed to <strong>unverified</strong> by an administrator.</p><p>If you believe this is an error or need to resubmit your documentation, please contact support.</p>`
            });
        } catch (e) {
            console.error('[AdminController] Failed to send unverification email:', e);
        }

        res.json({ message: 'User unverified successfully', userId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to unverify user', error: err?.message });
    }
};

// ============================================================================
// ROLE VERIFICATION ADMIN ENDPOINTS
// ============================================================================

// ---------------------------------------------------------------------------
// GET /api/admin/role-applications
// Get all pending role applications
// ---------------------------------------------------------------------------
export const getRoleApplications = async (req: AdminRequest, res: Response) => {
    try {
        const { status = 'pending', role } = req.query;

        // Get all users
        const { data: users, error } = await supabase
            .from('users')
            .select('id, data, created_at')
            .not('data->roles', 'is', null);

        if (error) {
            console.error('Error fetching role applications:', error);
            return res.status(500).json({ error: 'Failed to fetch applications' });
        }

        // Filter applications based on status and role
        const applications = (users || [])
            .map((user: any) => {
                const d = user.data || {};
                const userRoles = d.roles || [];
                
                // If roles is not an array (e.g. legacy format), convert to array if it's a single role object
                const rolesArray = Array.isArray(userRoles) ? userRoles : (userRoles.role ? [userRoles] : []);

                return rolesArray
                    .filter((r: UserRole) => {
                        const rType = r.type || r.role;
                        const matchesStatus = !status || r.status === status;
                        const matchesRole = !role || rType === role;
                        return matchesStatus && matchesRole;
                    })
                    .map((r: any) => ({
                        userId: user.id,
                        userName: d.name || 'Unknown',
                        userEmail: d.email || '',
                        role: r,
                        userVerifications: {
                            email: d.isVerified || false,
                            phone: d.phoneVerified || false,
                            linkedIn: d.linkedInVerified || false
                        },
                        userCreatedAt: d.createdAt || user.created_at
                    }));
            })
            .flat()
            .sort((a, b) => {
                const dateA = new Date(a.role.appliedAt || 0).getTime();
                const dateB = new Date(b.role.appliedAt || 0).getTime();
                return dateA - dateB; // Oldest first
            });

        return res.status(200).json({
            success: true,
            total: applications.length,
            applications
        });
    } catch (error) {
        console.error('Error in getRoleApplications:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/approve-role/:userId
// Approve a role application
// ---------------------------------------------------------------------------
export const approveRole = async (req: AdminRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { role, badges = [], notes } = req.body;

        if (!['investor', 'expert', 'founder'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Get user
        const { data: userRow, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', userId)
            .single();

        if (fetchError || !userRow) {
            console.error('Fetch user error:', fetchError);
            return res.status(404).json({ error: 'User not found' });
        }

        const d = userRow.data || {};
        const roles = d.roles || [];
        const roleIndex = roles.findIndex((r: any) => (r.type || r.role) === role);

        if (roleIndex === -1) {
            return res.status(404).json({
                error: 'Role not found',
                message: `User doesn't have ${role} role application`
            });
        }

        if (roles[roleIndex].status === ROLE_STATUS.VERIFIED) {
            return res.status(400).json({
                error: 'Already verified',
                message: 'This role is already verified'
            });
        }

        // Update role to verified
        roles[roleIndex].status = ROLE_STATUS.VERIFIED;
        roles[roleIndex].verifiedAt = new Date().toISOString();
        roles[roleIndex].verifiedBy = req.admin?.username || 'admin';
        roles[roleIndex].adminNotes = notes;
        
        // Add default badges for the role
        const defaultBadges: string[] = [];
        roles[roleIndex].badges = [...defaultBadges, ...badges];

        // Update user data
        const updatedData = {
            ...d,
            roles,
            [`is${role.charAt(0).toUpperCase() + role.slice(1)}`]: true,
            isVerified: true, // Auto-verify on role approval
            updatedAt: new Date().toISOString()
        };

        // Set as primary role if they don't have one
        if (!updatedData.primaryRole) {
            updatedData.primaryRole = role;
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ data: updatedData })
            .eq('id', userId);

        if (updateError) {
            console.error('Error approving role:', updateError);
            return res.status(500).json({ error: 'Failed to approve role' });
        }

        // Send approval email
        try {
            await sendEmail({
                to: d.email,
                subject: `${role.charAt(0).toUpperCase() + role.slice(1)} Role Approved - NextIgnition`,
                text: `Congratulations! Your ${role} role has been approved.`,
                html: `
                    <h2>🎉 Congratulations!</h2>
                    <p>Your <strong>${role}</strong> role application has been approved by our admin team.</p>
                    <p>You now have access to all ${role}-specific features on the NextIgnition platform.</p>
                    <p>Your profile will now display verification badges to other users.</p>
                    ${notes ? `<p><strong>Admin notes:</strong> ${notes}</p>` : ''}
                    <p>Thank you for being part of the NextIgnition community!</p>
                `
            });
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
            // Don't fail the request if email fails
        }

        return res.status(200).json({
            success: true,
            message: `${role} role approved for ${d.name}`,
            role: roles[roleIndex]
        });
    } catch (error) {
        console.error('Error in approveRole:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/reject-role/:userId
// Reject a role application
// ---------------------------------------------------------------------------
export const rejectRole = async (req: AdminRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { role, reason } = req.body;

        if (!['investor', 'expert', 'founder'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                error: 'Rejection reason required',
                message: 'Please provide a reason for rejection'
            });
        }

        // Get user
        const { data: userRow, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', userId)
            .single();

        if (fetchError || !userRow) {
            return res.status(404).json({ error: 'User not found' });
        }

        const d = userRow.data || {};
        const roles = d.roles || [];
        const roleIndex = roles.findIndex((r: UserRole) => (r.type || r.role) === role);

        if (roleIndex === -1) {
            return res.status(404).json({
                error: 'Role not found',
                message: `User doesn't have ${role} role application`
            });
        }

        // Update role to rejected
        roles[roleIndex].status = ROLE_STATUS.REJECTED;
        roles[roleIndex].rejectedAt = new Date().toISOString();
        roles[roleIndex].rejectedBy = req.admin?.username || 'admin';
        roles[roleIndex].rejectionReason = reason;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                data: {
                    ...d,
                    roles,
                    updatedAt: new Date().toISOString()
                }
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error rejecting role:', updateError);
            return res.status(500).json({ error: 'Failed to reject role' });
        }

        // Send rejection email
        try {
            await sendEmail({
                to: d.email,
                subject: `${role.charAt(0).toUpperCase() + role.slice(1)} Role Application Update`,
                text: `Your ${role} role application needs additional information.`,
                html: `
                    <h2>Role Application Update</h2>
                    <p>Thank you for applying for the <strong>${role}</strong> role on NextIgnition.</p>
                    <p>Unfortunately, we need additional information or documentation before we can approve your application.</p>
                    <p><strong>Reason:</strong> ${reason}</p>
                    <p>Please update your profile with the requested information and resubmit your application.</p>
                    <p>If you have questions, please contact our support team.</p>
                `
            });
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
            // Don't fail the request if email fails
        }

        return res.status(200).json({
            success: true,
            message: `${role} role rejected for ${d.name}`,
            role: roles[roleIndex]
        });
    } catch (error) {
        console.error('Error in rejectRole:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/suspend-role/:userId
// Suspend/revoke a verified role
// ---------------------------------------------------------------------------
export const suspendRole = async (req: AdminRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { role, reason } = req.body;

        if (!['investor', 'expert', 'founder'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                error: 'Suspension reason required'
            });
        }

        // Get user
        const { data: userRow, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', userId)
            .single();

        if (fetchError || !userRow) {
            return res.status(404).json({ error: 'User not found' });
        }

        const d = userRow.data || {};
        const roles = d.roles || [];
        const roleIndex = roles.findIndex((r: any) => (r.type || r.role) === role);

        if (roleIndex === -1) {
            return res.status(404).json({
                error: 'Role not found'
            });
        }

        // Update role to suspended
        roles[roleIndex].status = ROLE_STATUS.SUSPENDED;
        roles[roleIndex].suspendedAt = new Date().toISOString();
        roles[roleIndex].suspendedBy = req.admin?.username || 'admin';
        roles[roleIndex].suspensionReason = reason;
        roles[roleIndex].badges = []; // Remove badges

        const updatedData = {
            ...d,
            roles,
            [`is${role.charAt(0).toUpperCase() + role.slice(1)}`]: false,
            updatedAt: new Date().toISOString()
        };

        // If this was the primary role, find another verified role or set to null
        if (d.primaryRole === role) {
            const otherVerifiedRole = roles.find(
                (r: any) => r.status === ROLE_STATUS.VERIFIED && (r.type || r.role) !== role
            );
            updatedData.primaryRole = otherVerifiedRole?.type || otherVerifiedRole?.role || null;
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ data: updatedData })
            .eq('id', userId);

        if (updateError) {
            console.error('Error suspending role:', updateError);
            return res.status(500).json({ error: 'Failed to suspend role' });
        }

        // Send suspension email
        try {
            await sendEmail({
                to: d.email,
                subject: 'Role Suspension Notice - NextIgnition',
                text: `Your ${role} role has been suspended.`,
                html: `
                    <h2>Role Suspension Notice</h2>
                    <p>Your <strong>${role}</strong> role has been suspended by our admin team.</p>
                    <p><strong>Reason:</strong> ${reason}</p>
                    <p>If you believe this is an error or would like to appeal, please contact our support team.</p>
                `
            });
        } catch (emailError) {
            console.error('Failed to send suspension email:', emailError);
        }

        return res.status(200).json({
            success: true,
            message: `${role} role suspended for ${d.name || 'Unknown'}`,
            role: roles[roleIndex]
        });
    } catch (error) {
        console.error('Error in suspendRole:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// 2-LEVEL ADMIN RBAC SYSTEM ENDPOINTS
// ============================================================================

// ---------------------------------------------------------------------------
// POST /api/admin/refresh
// Refresh access token using refresh token
// ---------------------------------------------------------------------------
export const refreshToken = handleTokenRefresh;

// ---------------------------------------------------------------------------
// GET /api/admin/admins
// List all admin accounts (PRIMARY_ADMIN only)
// ---------------------------------------------------------------------------
export const listAdmins = async (req: AdminRequest, res: Response) => {
    try {
        const { status, role, page = 1, limit = 20 } = req.query;

        let query = supabase
            .from('admin_users')
            .select('id, email, name, role, status, created_at, updated_at, last_login, created_by, updated_by', {
                count: 'exact',
            });

        if (status) {
            query = query.eq('status', status);
        }

        if (role) {
            query = query.eq('role', role);
        }

        const from = (parseInt(String(page)) - 1) * parseInt(String(limit));
        const to = from + parseInt(String(limit)) - 1;

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        res.json({
            admins: data || [],
            total: count || 0,
            page: parseInt(String(page)),
            limit: parseInt(String(limit)),
        });

        if (req.logAdminAction) {
            await req.logAdminAction('list', { action: 'LIST_ADMINS' });
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch admins', error: err?.message });
    }
};

const getAdminUserId = (id?: string): string | null => {
    if (!id || id.includes('@')) return null;
    return id;
};

// ---------------------------------------------------------------------------
// POST /api/admin/admins
// Create a secondary admin (PRIMARY_ADMIN only)
// ---------------------------------------------------------------------------
export const createSecondaryAdmin = async (req: AdminRequest, res: Response) => {
    try {
        const { email, password, name, role = 'SECONDARY_ADMIN' } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name required' });
        }

        if (!['SECONDARY_ADMIN', 'PRIMARY_ADMIN'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create admin user
        const { data, error } = await supabase
            .from('admin_users')
            .insert({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                name,
                role,
                status: 'active',
                created_by: getAdminUserId(req.admin?.id),
            })
            .select()
            .single();

        if (error) {
            if (error.message.includes('duplicate')) {
                return res.status(409).json({ message: 'Admin with this email already exists' });
            }
            throw error;
        }

        if (req.logAdminAction) {
            await req.logAdminAction(data.id, {
                action: 'CREATE_ADMIN',
                after: { email: data.email, role: data.role, name: data.name },
            });
        }

        res.status(201).json({
            message: `Secondary admin created successfully`,
            admin: {
                id: data.id,
                email: data.email,
                name: data.name,
                role: data.role,
                created_at: data.created_at,
            },
        });
    } catch (err: any) {
        console.error('[CreateSecondaryAdmin] Error:', err);
        res.status(500).json({ message: 'Failed to create admin', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/admins/:adminId
// Update admin role or details (PRIMARY_ADMIN only)
// ---------------------------------------------------------------------------
export const updateAdmin = async (req: AdminRequest, res: Response) => {
    try {
        const adminId = String(req.params.adminId || '');
        const { role, name, status } = req.body;

        if (!adminId) {
            return res.status(400).json({ message: 'Admin ID required' });
        }

        // Prevent PRIMARY_ADMIN from updating their own role (safety check)
        if (adminId === req.admin?.id && role) {
            return res.status(400).json({ message: 'Cannot change your own role' });
        }

        // Get current admin for audit trail
        const { data: currentAdmin } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', adminId)
            .single();

        const updateData: any = {
            updated_at: new Date().toISOString(),
            updated_by: getAdminUserId(req.admin?.id),
        };

        if (role && ['SECONDARY_ADMIN', 'PRIMARY_ADMIN'].includes(role)) {
            updateData.role = role;
        }

        if (name) {
            updateData.name = name;
        }

        if (status && ['active', 'suspended'].includes(status)) {
            updateData.status = status;
        }

        const { data, error } = await supabase
            .from('admin_users')
            .update(updateData)
            .eq('id', adminId)
            .select()
            .single();

        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(adminId, {
                action: 'UPDATE_ADMIN',
                before: currentAdmin,
                after: data,
            });
        }

        res.json({
            message: 'Admin updated successfully',
            admin: data,
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update admin', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/admins/:adminId/suspend
// Suspend an admin account (PRIMARY_ADMIN only)
// ---------------------------------------------------------------------------
export const suspendAdmin = async (req: AdminRequest, res: Response) => {
    try {
        const adminId = String(req.params.adminId || '');
        const { reason } = req.body;

        if (!adminId) {
            return res.status(400).json({ message: 'Admin ID required' });
        }

        if (adminId === req.admin?.id) {
            return res.status(400).json({ message: 'Cannot suspend yourself' });
        }

        const { data: currentAdmin } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', adminId)
            .single();

        const { data, error } = await supabase
            .from('admin_users')
            .update({
                status: 'suspended',
                updated_at: new Date().toISOString(),
                updated_by: getAdminUserId(req.admin?.id),
            })
            .eq('id', adminId)
            .select()
            .single();

        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(adminId, {
                action: 'SUSPEND_ADMIN',
                before: currentAdmin,
                after: data,
                reason,
            });
        }

        res.json({
            message: 'Admin suspended successfully',
            admin: data,
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to suspend admin', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/admins/:adminId/activate
// Activate a suspended admin account (PRIMARY_ADMIN only)
// ---------------------------------------------------------------------------
export const activateAdmin = async (req: AdminRequest, res: Response) => {
    try {
        const adminId = String(req.params.adminId || '');

        if (!adminId) {
            return res.status(400).json({ message: 'Admin ID required' });
        }

        const { data: currentAdmin } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', adminId)
            .single();

        const { data, error } = await supabase
            .from('admin_users')
            .update({
                status: 'active',
                updated_at: new Date().toISOString(),
                updated_by: getAdminUserId(req.admin?.id),
            })
            .eq('id', adminId)
            .select()
            .single();

        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(adminId, {
                action: 'ACTIVATE_ADMIN',
                before: currentAdmin,
                after: data,
            });
        }

        res.json({
            message: 'Admin activated successfully',
            admin: data,
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to activate admin', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/admins/:adminId
// Delete an admin account (PRIMARY_ADMIN only)
// ---------------------------------------------------------------------------
export const deleteAdmin = async (req: AdminRequest, res: Response) => {
    try {
        const adminId = String(req.params.adminId || '');

        if (!adminId) {
            return res.status(400).json({ message: 'Admin ID required' });
        }

        if (adminId === req.admin?.id) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        const { error } = await supabase.from('admin_users').delete().eq('id', adminId);

        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(adminId, {
                action: 'DELETE_ADMIN',
            });
        }

        res.json({
            message: 'Admin deleted successfully',
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to delete admin', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/activity-logs
// View admin activity logs (PRIMARY_ADMIN only)
// ---------------------------------------------------------------------------
export const getActivityLogs = async (req: AdminRequest, res: Response) => {
    try {
        const { adminId, module, action, startDate, endDate, page = 1, limit = 50 } = req.query;

        const logs = await getAdminActivityLogs({
            adminId: adminId ? String(adminId) : undefined,
            module: module ? String(module) : undefined,
            action: action ? String(action) : undefined,
            startDate: startDate ? String(startDate) : undefined,
            endDate: endDate ? String(endDate) : undefined,
            page: parseInt(String(page)),
            limit: Math.min(parseInt(String(limit)), 500),
        });

        res.json(logs);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch activity logs', error: err?.message });
    }
};

// ============================================================================
// PUBLIC LEADS MANAGEMENT (USER_MGMT MODULE)
// ============================================================================

export const getPublicLeads = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10));
        const search = String(req.query.search || '').toLowerCase().trim();
        const role = String(req.query.role || '');
        const status = String(req.query.status || '');

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase.from('public_leads').select('id, email, data, created_at, updated_at', { count: 'exact' });

        if (search) {
            const safeSearch = search
                .replace(/\\/g, '\\\\')
                .replace(/%/g, '\\%')
                .replace(/_/g, '\\_')
                .replace(/[,()*]/g, ''); // Strip PostgREST .or() filter delimiters (injection)
            query = query.or(
                `email.ilike.%${safeSearch}%,` +
                `data->>fullName.ilike.%${safeSearch}%`
            );
        }

        if (role) {
            query = query.eq('data->>role', role);
        }

        if (status) {
            query = query.eq('data->>status', status);
        }

        const { data: rows, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            // Table might not exist yet if migration hasn't run
            if (error.code === '42P01') {
                return res.json({ leads: [], total: 0, page, limit, message: 'public_leads table not initialized yet' });
            }
            throw error;
        }

        const leads = (rows || []).map(r => ({
            id: r.id,
            email: r.email,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            ...r.data
        }));

        res.json({ leads, total: count || 0, page, limit });
    } catch (err: any) {
        console.error('getPublicLeads error:', err);
        res.status(500).json({ message: 'Failed to fetch public leads', error: err?.message });
    }
};

export const updatePublicLeadStatus = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['new', 'contacted', 'onboarded', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Fetch existing lead data to preserve it
        const { data: lead, error: fetchErr } = await supabase
            .from('public_leads')
            .select('data')
            .eq('id', id)
            .single();

        if (fetchErr || !lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const updatedData = { ...lead.data, status };

        const { error: updateErr } = await supabase
            .from('public_leads')
            .update({ data: updatedData })
            .eq('id', id);

        if (updateErr) throw updateErr;

        res.json({ message: 'Lead status updated successfully', status });
    } catch (err: any) {
        console.error('updatePublicLeadStatus error:', err);
        res.status(500).json({ message: 'Failed to update lead status', error: err?.message });
    }
};

export const exportPublicLeads = async (req: AdminRequest, res: Response) => {
    try {
        const { data: rows, error } = await supabase
            .from('public_leads')
            .select('id, email, data, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(rows || []);
    } catch (err: any) {
        console.error('exportPublicLeads error:', err);
        res.status(500).json({ message: 'Failed to export leads', error: err?.message });
    }
};

// ============================================================================
// SUPPORT TICKETS (USER_MGMT MODULE)
// ============================================================================

export const getSupportTickets = async (req: AdminRequest, res: Response) => {
    try {
        const { status = 'all' } = req.query;
        
        // Fetch users who have supportTickets
        // Note: For large scale, a separate tickets table would be better, but this matches current architecture
        const { data: users, error } = await supabase
            .from('users')
            .select('id, data')
            .not('data->supportTickets', 'is', null);

        if (error) throw error;

        let allTickets: any[] = [];

        (users || []).forEach(user => {
            const userTickets = user.data?.supportTickets || [];
            userTickets.forEach((ticket: any) => {
                if (status === 'all' || ticket.status === status) {
                    allTickets.push({
                        ...ticket,
                        userId: user.id,
                        userName: user.data?.name || 'Unknown',
                        userEmail: user.data?.email || 'Unknown',
                    });
                }
            });
        });

        // Sort by newest first
        allTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ tickets: allTickets, total: allTickets.length });
    } catch (err: any) {
        console.error('getSupportTickets error:', err);
        res.status(500).json({ message: 'Failed to fetch support tickets', error: err?.message });
    }
};

export const updateTicketStatus = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params; // this is the ticket id
        const { status } = req.body; // e.g., 'open', 'in_progress', 'resolved', 'closed'

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        // We need to find the user who owns this ticket.
        // Again, this requires scanning if we don't have a direct index or user id in the request,
        // but let's try to find them by searching the JSON array.
        // Or if the frontend provides userId, we can use that. Assuming we just scan for now.
        const { data: users, error } = await supabase
            .from('users')
            .select('id, data')
            .not('data->supportTickets', 'is', null);

        if (error) throw error;

        let foundUser = null;
        let foundTicketIndex = -1;

        for (const user of (users || [])) {
            const tickets = user.data?.supportTickets || [];
            const idx = tickets.findIndex((t: any) => t.id === id);
            if (idx !== -1) {
                foundUser = user;
                foundTicketIndex = idx;
                break;
            }
        }

        if (!foundUser || foundTicketIndex === -1) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const updatedTickets = [...foundUser.data.supportTickets];
        updatedTickets[foundTicketIndex] = {
            ...updatedTickets[foundTicketIndex],
            status,
            updatedAt: new Date().toISOString(),
            updatedBy: req.admin?.username
        };

        const updatedUserData = {
            ...foundUser.data,
            supportTickets: updatedTickets,
            updatedAt: new Date().toISOString()
        };

        const { error: updateErr } = await supabase
            .from('users')
            .update({ data: updatedUserData })
            .eq('id', foundUser.id);

        if (updateErr) throw updateErr;

        res.json({ message: 'Ticket status updated successfully', ticket: updatedTickets[foundTicketIndex] });
    } catch (err: any) {
        console.error('updateTicketStatus error:', err);
        res.status(500).json({ message: 'Failed to update ticket status', error: err?.message });
    }
};

// ============================================================================
// EVENTS MANAGEMENT
// ============================================================================

export const getAdminEvents = async (req: AdminRequest, res: Response) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const from = (Number(page) - 1) * Number(limit);
        const to = from + Number(limit) - 1;

        let query = supabase
            .from('events')
            .select('id, data, created_at', { count: 'exact' });

        if (search) {
            query = query.ilike('data->>title', `%${search}%`);
        }

        const { data: rows, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Populate host info
        const hostUserIds = [...new Set(rows?.map(e => e.data?.hostUser).filter(Boolean))];
        const usersMap = new Map();
        
        if (hostUserIds.length > 0) {
            const { data: usersData } = await supabase.from('users').select('id, data').in('id', hostUserIds);
            (usersData || []).forEach(u => {
                usersMap.set(u.id, {
                    id: u.id,
                    name: u.data?.name || 'Unknown',
                    email: u.data?.email || 'N/A'
                });
            });
        }

        const events = (rows || []).map(row => ({
            id: row.id,
            title: row.data?.title,
            type: row.data?.type,
            status: row.data?.status,
            startAt: row.data?.startAt,
            presentationUrl: row.data?.presentationUrl,
            isOfficial: row.data?.isOfficial === true || row.data?.hostType === 'platform',
            host: usersMap.get(row.data?.hostUser) || { name: 'Platform', email: 'admin@nextignition.io' },
            createdAt: row.created_at
        }));

        res.json({ events, total: count || 0 });
    } catch (err: any) {
        console.error('getAdminEvents error:', err);
        res.status(500).json({ message: 'Failed to fetch admin events', error: err?.message });
    }
};

// POST /api/admin/events — create an event (spec 3.7)
export const createEvent = async (req: AdminRequest, res: Response) => {
    try {
        const { title, type, startAt, presentationUrl, description, format, locationOrLink, durationMinutes, tags } = req.body;
        if (!title || !startAt) {
            return res.status(400).json({ message: 'title and startAt are required' });
        }

        const id = crypto.randomUUID();
        const data = {
            id,
            title: String(title).trim(),
            type: type || 'webinar',
            description: description || '',
            startAt: new Date(startAt).toISOString(),
            durationMinutes: Number(durationMinutes) || 60,
            format: format || 'virtual',
            locationOrLink: locationOrLink || '',
            tags: Array.isArray(tags)
                ? tags
                : String(tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
            presentationUrl: presentationUrl || null,
            priceType: 'free',
            status: 'approved', // admin-created events are auto-approved
            // Official NextIgnition (platform) event — surfaced in the
            // "Official NextIgnition Events" section on the events page.
            hostType: 'platform',
            isOfficial: true,
            hostUser: null,
            branding: { text: 'Powered by Next Ignition', enforced: true },
            registeredUsers: [],
            bookmarkedBy: [],
            createdBy: req.admin?.id,
            createdAt: new Date().toISOString(),
        };

        const { error } = await supabase.from('events').insert([{ id, data }]);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'CREATE_EVENT', after: { title: data.title, startAt } });
        }

        res.status(201).json({ message: 'Event created', event: data });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to create event', error: err?.message });
    }
};

// POST /api/admin/events/:id/approve — approve a submitted event (spec 3.7)
export const approveEvent = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: row, error: fetchError } = await supabase.from('events').select('data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Event not found' });

        const updated = { ...row.data, status: 'approved', approvedAt: new Date().toISOString(), approvedBy: req.admin?.id };
        const { error } = await supabase.from('events').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'APPROVE_EVENT', after: { status: 'approved' } });
        }

        res.json({ message: 'Event approved', eventId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to approve event', error: err?.message });
    }
};

// DELETE /api/admin/events/:id — PRIMARY only (spec 3.7 ✗ for secondary)
export const deleteEvent = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: existing } = await supabase.from('events').select('data').eq('id', id).single();
        if (!existing) return res.status(404).json({ message: 'Event not found' });

        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'DELETE_EVENT', before: { title: existing.data?.title } });
        }

        res.json({ message: 'Event deleted', eventId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to delete event', error: err?.message });
    }
};

// ============================================================================
// USER DETAIL ENDPOINTS (PRIMARY_ADMIN ONLY)
// Full visibility into any user's activity, documents, and payments
// ============================================================================

// ---------------------------------------------------------------------------
// GET /api/admin/users/:userId/profile
// Full user profile with aggregate stats — PRIMARY_ADMIN only
// ---------------------------------------------------------------------------
export const getUserProfile = async (req: AdminRequest, res: Response) => {
    try {
        const { userId } = req.params;

        const { data: userRow, error: userErr } = await supabase
            .from('users')
            .select('id, data, created_at')
            .eq('id', userId)
            .single();

        if (userErr || !userRow) {
            return res.status(404).json({ message: 'User not found' });
        }

        const u = { ...userRow.data };
        delete u.password;
        delete u.verificationOtp;
        delete u.resetOtp;

        const { data: payments } = await supabase
            .from('payments')
            .select('id, data, created_at')
            .eq('data->>user', userId)
            .order('created_at', { ascending: false });

        const totalSpent = (payments || [])
            .filter((p: any) => p.data?.status === 'paid' || p.data?.status === 'captured')
            .reduce((sum: number, p: any) => sum + (p.data?.amount || 0) / 100, 0);

        const [dealDocsResult, pitchResult, docAnalysisResult] = await Promise.all([
            supabase.from('deal_room_documents').select('id', { count: 'exact', head: true }).eq('data->>uploadedBy', userId),
            supabase.from('pitch_deck_analyses').select('id', { count: 'exact', head: true }).eq('data->>user', userId),
            supabase.from('document_analyses').select('id', { count: 'exact', head: true }).eq('data->>user', userId),
        ]);

        const totalDocuments = (dealDocsResult.count || 0) + (pitchResult.count || 0) + (docAnalysisResult.count || 0);

        const { count: activityCount } = await supabase
            .from('user_activity_logs')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        const isPrimary = req.admin?.role === 'PRIMARY_ADMIN';

        res.json({
            profile: { ...u, id: userRow.id, createdAt: u.createdAt || userRow.created_at },
            stats: {
                loginCount: u.loginCount || 0,
                lastLoginAt: u.lastLoginAt || null,
                totalPayments: isPrimary ? (payments || []).length : 0,
                totalSpent: isPrimary ? Math.round(totalSpent * 100) / 100 : 0,
                totalDocuments,
                totalActivityEvents: activityCount || 0,
            },
        });
    } catch (err: any) {
        console.error('[getUserProfile] Error:', err);
        res.status(500).json({ message: 'Failed to fetch user profile', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/users/:userId/activity?page=1&limit=30&type=
// Paginated activity log — PRIMARY_ADMIN only
// ---------------------------------------------------------------------------
export const getUserActivityLog = async (req: AdminRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, parseInt(String(req.query.limit || '30'), 10));
        const type = String(req.query.type || '');
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('user_activity_logs')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (type) {
            query = query.eq('action_type', type);
        }

        const { data: logs, count, error } = await query.range(from, to);

        if (error) {
            if (error.code === '42P01') {
                return res.json({ logs: [], total: 0, page, limit });
            }
            throw error;
        }

        res.json({ logs: logs || [], total: count || 0, page, limit });
    } catch (err: any) {
        console.error('[getUserActivityLog] Error:', err);
        res.status(500).json({ message: 'Failed to fetch activity log', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/users/:userId/documents
// All documents uploaded by a user — PRIMARY_ADMIN only
// ---------------------------------------------------------------------------
export const getUserDocuments = async (req: AdminRequest, res: Response) => {
    try {
        const { userId } = req.params;

        const [dealDocsResult, pitchResult, docAnalysisResult] = await Promise.all([
            supabase.from('deal_room_documents').select('id, data, created_at').eq('data->>uploadedBy', userId).order('created_at', { ascending: false }),
            supabase.from('pitch_deck_analyses').select('id, data, created_at').eq('data->>user', userId).order('created_at', { ascending: false }),
            supabase.from('document_analyses').select('id, data, created_at').eq('data->>user', userId).order('created_at', { ascending: false }),
        ]);

        const dealDocs = (dealDocsResult.data || []).map((d: any) => ({
            id: d.id, type: 'deal_room_document', label: 'Deal Room Document',
            name: d.data?.name || d.data?.fileName || 'Untitled',
            fileUrl: d.data?.url || d.data?.fileUrl || null,
            fileType: d.data?.fileType || d.data?.mimeType || null,
            uploadedAt: d.data?.uploadedAt || d.created_at,
        }));

        const pitchDocs = (pitchResult.data || []).map((d: any) => ({
            id: d.id, type: 'pitch_deck', label: 'Pitch Deck',
            name: d.data?.fileName || d.data?.name || 'Pitch Deck',
            fileUrl: d.data?.fileUrl || d.data?.url || null,
            fileType: 'pdf',
            uploadedAt: d.data?.analyzedAt || d.created_at,
        }));

        const docAnalyses = (docAnalysisResult.data || []).map((d: any) => ({
            id: d.id, type: 'document_analysis', label: 'Document Analysis',
            name: d.data?.fileName || d.data?.name || 'Document',
            fileUrl: d.data?.fileUrl || d.data?.url || null,
            fileType: d.data?.fileType || null,
            uploadedAt: d.data?.createdAt || d.created_at,
        }));

        const allDocs = [...dealDocs, ...pitchDocs, ...docAnalyses].sort(
            (a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
        );

        res.json({ documents: allDocs, total: allDocs.length });
    } catch (err: any) {
        console.error('[getUserDocuments] Error:', err);
        res.status(500).json({ message: 'Failed to fetch user documents', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/users/:userId/payments?page=1&limit=20
// Full payment history for a user — PRIMARY_ADMIN only
// ---------------------------------------------------------------------------
export const getUserPaymentHistory = async (req: AdminRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10));
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: rows, count, error } = await supabase
            .from('payments')
            .select('id, data, created_at', { count: 'exact' })
            .eq('data->>user', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const payments = (rows || []).map((r: any) => ({
            id: r.id,
            amount: (r.data?.amount || 0) / 100,
            currency: r.data?.currency || 'INR',
            status: r.data?.status || 'unknown',
            purpose: r.data?.purpose || 'Transaction',
            orderId: r.data?.orderId || null,
            paymentId: r.data?.paymentId || null,
            date: r.data?.createdAt || r.created_at,
        }));

        const totalSpent = payments
            .filter((p: any) => p.status === 'paid' || p.status === 'captured')
            .reduce((sum: number, p: any) => sum + p.amount, 0);

        res.json({ payments, total: count || 0, page, limit, totalSpent: Math.round(totalSpent * 100) / 100 });
    } catch (err: any) {
        console.error('[getUserPaymentHistory] Error:', err);
        res.status(500).json({ message: 'Failed to fetch payment history', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// STARTUP MANAGEMENT
// ---------------------------------------------------------------------------

export const getAdminStartups = async (req: AdminRequest, res: Response) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let query = supabase.from('startups').select('id, data, created_at, updated_at', { count: 'exact' });

        if (status) {
            query = query.eq('data->>status', status);
        }

        const from = (parseInt(String(page)) - 1) * parseInt(String(limit));
        const to = from + parseInt(String(limit)) - 1;

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        res.json({
            startups: data?.map(r => ({ id: r.id, ...r.data, createdAt: r.created_at })) || [],
            total: count || 0,
            page: parseInt(String(page)),
            limit: parseInt(String(limit))
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch startups', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// SERVICE REQUESTS (MVP Development, etc.)
// Founders submit these from the startup dashboard; they persist on the
// startup record as data.mvpRequest. This surfaces them for the admin team.
// ---------------------------------------------------------------------------
export const getServiceRequests = async (req: AdminRequest, res: Response) => {
    try {
        const { data: rows, error } = await supabase
            .from('startups')
            .select('id, data, created_at')
            .not('data->mvpRequest', 'is', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Batch-resolve founder names/emails.
        const founderIds = Array.from(
            new Set((rows || []).map((r: any) => r.data?.founder).filter(Boolean))
        );
        const founderMap: Record<string, { name?: string; email?: string }> = {};
        if (founderIds.length) {
            const { data: users } = await supabase
                .from('users')
                .select('id, data')
                .in('id', founderIds);
            (users || []).forEach((u: any) => {
                founderMap[u.id] = { name: u.data?.name, email: u.data?.email };
            });
        }

        const requests = (rows || []).map((r: any) => {
            const mvp = r.data?.mvpRequest || {};
            const founder = founderMap[r.data?.founder] || {};
            return {
                id: r.id,
                type: 'MVP Development',
                startupName: mvp.startupName || r.data?.name || 'Untitled',
                founderName: founder.name || 'Unknown',
                founderEmail: founder.email || '',
                submittedAt: mvp.submittedAt || r.created_at,
                details: mvp,
            };
        });

        res.json({ requests, total: requests.length });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch service requests', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// CONTACT MESSAGES (public "Contact Us" form submissions)
// ---------------------------------------------------------------------------
export const getContactMessages = async (req: AdminRequest, res: Response) => {
    try {
        const { data: rows, error } = await supabase
            .from('contact_messages')
            .select('id, data, created_at')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const messages = (rows || []).map((r: any) => ({
            id: r.id,
            name: r.data?.name || 'Unknown',
            email: r.data?.email || '',
            company: r.data?.company || '',
            subject: r.data?.subject || '',
            message: r.data?.message || '',
            status: r.data?.status || 'new',
            submittedAt: r.data?.submittedAt || r.created_at,
        }));

        res.json({ messages, total: messages.length, unread: messages.filter(m => m.status === 'new').length });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch contact messages', error: err?.message });
    }
};

export const markContactMessageRead = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: row, error: fetchError } = await supabase.from('contact_messages').select('data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Message not found' });

        const updated = { ...row.data, status: row.data?.status === 'new' ? 'read' : 'new' };
        const { error } = await supabase.from('contact_messages').update({ data: updated }).eq('id', id);
        if (error) throw error;

        res.json({ message: 'Updated', status: updated.status });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update message', error: err?.message });
    }
};

export const deleteContactMessage = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { error } = await supabase.from('contact_messages').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Message deleted', id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to delete message', error: err?.message });
    }
};

export const approveStartup = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Startup not found' });

        const updated = { ...row.data, status: 'approved', approvedAt: new Date().toISOString(), approvedBy: req.admin?.id };
        const { error } = await supabase.from('startups').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'APPROVE_STARTUP', after: { status: 'approved' } });
        }

        res.json({ message: 'Startup approved successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to approve startup', error: err?.message });
    }
};

export const rejectStartup = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { reason } = req.body;
        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Startup not found' });

        const updated = { ...row.data, status: 'rejected', rejectionReason: reason, rejectedAt: new Date().toISOString(), rejectedBy: req.admin?.id };
        const { error } = await supabase.from('startups').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'REJECT_STARTUP', after: { status: 'rejected', reason } });
        }

        res.json({ message: 'Startup rejected' });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to reject startup', error: err?.message });
    }
};

export const featureStartup = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { featured } = req.body;
        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Startup not found' });

        const updated = { ...row.data, isFeatured: featured, featuredAt: featured ? new Date().toISOString() : null };
        const { error } = await supabase.from('startups').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: featured ? 'FEATURE_STARTUP' : 'UNFEATURE_STARTUP' });
        }

        res.json({ message: `Startup ${featured ? 'featured' : 'unfeatured'} successfully` });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update featured status', error: err?.message });
    }
};

// PUT /api/admin/startups/:id — edit startup info (spec 3.3)
const STARTUP_EDITABLE_FIELDS = ['name', 'tagline', 'description', 'industry', 'stage', 'website', 'location', 'fundingGoal', 'logo'];
export const updateStartup = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: row, error: fetchError } = await supabase.from('startups').select('id, data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Startup not found' });

        // Whitelist editable fields only — never let an admin overwrite ownership/status flags here.
        const changes: Record<string, any> = {};
        for (const field of STARTUP_EDITABLE_FIELDS) {
            if (req.body[field] !== undefined) changes[field] = req.body[field];
        }
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({ message: 'No editable fields provided' });
        }

        const updated = { ...row.data, ...changes, updatedAt: new Date().toISOString(), updatedBy: req.admin?.id };
        const { error } = await supabase.from('startups').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'EDIT_STARTUP', after: changes });
        }

        res.json({ message: 'Startup updated successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update startup', error: err?.message });
    }
};

// DELETE /api/admin/startups/:id — permanent delete (PRIMARY only, spec 3.3)
export const deleteStartup = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: existing } = await supabase.from('startups').select('data').eq('id', id).single();
        if (!existing) return res.status(404).json({ message: 'Startup not found' });

        const { error } = await supabase.from('startups').delete().eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'DELETE_STARTUP', before: { name: existing.data?.name, status: existing.data?.status } });
        }

        res.json({ message: 'Startup deleted', startupId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to delete startup', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// INVESTOR MANAGEMENT (spec 3.4)
// ---------------------------------------------------------------------------

// GET /api/admin/investors — list users who hold the investor role
export const getAdminInvestors = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10) || 20);
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Anyone whose roles array contains 'investor'.
        const { data: rows, count, error } = await supabase
            .from('users')
            .select('id, data, created_at', { count: 'exact' })
            .contains('data', { roles: ['investor'] })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const investors = (rows || []).map(r => ({
            id: r.id,
            name: r.data?.name,
            email: r.data?.email,
            avatar: r.data?.avatar,
            isVerified: !!r.data?.isVerified,
            investorApproved: !!r.data?.investorApproved,
            firmName: r.data?.firmName,
            investmentRange: r.data?.investmentRange,
            sectors: r.data?.sectors,
            createdAt: r.created_at,
        }));

        res.json({ investors, total: count || 0, page, limit });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch investors', error: err?.message });
    }
};

// POST /api/admin/investors/:id/approve — PRIMARY only (spec 3.4 ✗ for secondary)
export const approveInvestor = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: row, error: fetchError } = await supabase.from('users').select('data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Investor not found' });

        const updated = { ...row.data, investorApproved: true, investorApprovedAt: new Date().toISOString(), investorApprovedBy: req.admin?.id };
        const { error } = await supabase.from('users').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'APPROVE_INVESTOR', after: { investorApproved: true } });
        }

        res.json({ message: 'Investor approved', investorId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to approve investor', error: err?.message });
    }
};

// PUT /api/admin/investors/:id — PRIMARY only (spec 3.4 ✗ for secondary)
const INVESTOR_EDITABLE_FIELDS = ['firmName', 'investmentRange', 'sectors', 'bio', 'website', 'location'];
export const updateInvestor = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: row, error: fetchError } = await supabase.from('users').select('data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Investor not found' });

        const changes: Record<string, any> = {};
        for (const field of INVESTOR_EDITABLE_FIELDS) {
            if (req.body[field] !== undefined) changes[field] = req.body[field];
        }
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({ message: 'No editable fields provided' });
        }

        const updated = { ...row.data, ...changes, updatedAt: new Date().toISOString() };
        const { error } = await supabase.from('users').update({ data: updated }).eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'EDIT_INVESTOR', after: changes });
        }

        res.json({ message: 'Investor updated', investorId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update investor', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// CONTENT MODERATION
// ---------------------------------------------------------------------------

export const getReports = async (req: AdminRequest, res: Response) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        let query = supabase.from('reports').select('*', { count: 'exact' });

        if (status) {
            query = query.eq('status', status);
        }

        const from = (parseInt(String(page)) - 1) * parseInt(String(limit));
        const to = from + parseInt(String(limit)) - 1;

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        res.json({
            reports: data || [],
            total: count || 0,
            page: parseInt(String(page)),
            limit: parseInt(String(limit))
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch reports', error: err?.message });
    }
};

// Reported content types → the Supabase table each type lives in.
// 'comment' is embedded inside its parent post's data and has no table of its
// own; 'user' is handled via the user-detail endpoint instead of deletion.
const REPORT_CONTENT_TABLES: Record<string, string> = {
    post: 'posts',
    startup: 'startups',
    event: 'events',
    podcast: 'podcast_episodes',
    community: 'communities',
    message: 'direct_messages',
};

// GET /api/admin/reports/:id/content — fetch the content a report points at.
export const getReportedContent = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: report, error: repErr } = await supabase
            .from('reports').select('*').eq('id', id).single();
        if (repErr || !report) return res.status(404).json({ message: 'Report not found' });

        const type = String(report.content_type || report.data?.targetType || '');
        const contentId = String(report.content_id || report.data?.targetId || '');

        if (type === 'user') {
            // The moderation UI opens the full user-detail view for user reports.
            return res.json({ contentType: 'user', userId: contentId });
        }
        if (type === 'comment') {
            return res.status(400).json({ message: 'Comments are embedded in their parent post — open the post instead.' });
        }

        const table = REPORT_CONTENT_TABLES[type];
        if (!table) return res.status(400).json({ message: `Unsupported content type: ${type}` });

        const { data: row, error } = await supabase
            .from(table).select('id, data, created_at').eq('id', contentId).single();
        if (error || !row) {
            return res.status(404).json({ message: 'Content not found (it may already be deleted)', contentType: type });
        }

        return res.json({ contentType: type, contentId, content: row.data, createdAt: row.created_at });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch reported content', error: err?.message });
    }
};

// DELETE /api/admin/reports/:id/content — remove the reported content and
// mark the report resolved.
export const removeReportedContent = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: report, error: repErr } = await supabase
            .from('reports').select('*').eq('id', id).single();
        if (repErr || !report) return res.status(404).json({ message: 'Report not found' });

        const type = String(report.content_type || report.data?.targetType || '');
        const contentId = String(report.content_id || report.data?.targetId || '');

        if (type === 'user') {
            return res.status(400).json({ message: 'User accounts are managed from All Users (freeze/delete), not removed here.' });
        }
        const table = REPORT_CONTENT_TABLES[type];
        if (!table) return res.status(400).json({ message: `Unsupported content type: ${type}` });

        // Snapshot for the audit log, then delete.
        const { data: existing } = await supabase.from(table).select('data').eq('id', contentId).single();
        const { error: delErr } = await supabase.from(table).delete().eq('id', contentId);
        if (delErr) throw delErr;

        // Mark the report resolved with the action taken.
        await supabase.from('reports').update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: req.admin?.id,
            details: `Content removed (${type} ${contentId})`,
        }).eq('id', id);

        if (req.logAdminAction) {
            await req.logAdminAction(id, {
                action: 'REMOVE_REPORTED_CONTENT',
                before: { type, contentId, title: existing?.data?.title || existing?.data?.content?.slice?.(0, 100) },
            });
        }

        res.json({ message: 'Content removed and report resolved', contentId });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to remove content', error: err?.message });
    }
};

const REPORT_STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'];

export const resolveReport = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { status, actionTaken } = req.body;

        if (!REPORT_STATUSES.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${REPORT_STATUSES.join(', ')}` });
        }

        const { data, error } = await supabase
            .from('reports')
            .update({
                status,
                resolved_at: new Date().toISOString(),
                resolved_by: req.admin?.id,
                details: actionTaken
            })
            .eq('id', id)
            .select()
            .single();

        // PostgREST returns code PGRST116 when .single() matches no rows → 404
        if (error?.code === 'PGRST116' || (!error && !data)) {
            return res.status(404).json({ message: 'Report not found' });
        }
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'RESOLVE_REPORT', after: { status, actionTaken } });
        }

        res.json({ message: 'Report resolved', report: data });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to resolve report', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// PLATFORM SETTINGS & AI CONTROL
// ---------------------------------------------------------------------------

export const getPlatformSettings = async (req: AdminRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 'global').single();
        if (error && error.code !== 'PGRST116') throw error;
        res.json(data?.data || {});
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch settings', error: err?.message });
    }
};

export const updatePlatformSettings = async (req: AdminRequest, res: Response) => {
    try {
        const incoming = req.body || {};

        // Merge with existing settings so a view that submits only its own
        // subset (e.g. just pricing, or just API keys) doesn't wipe other keys.
        const { data: current } = await supabase.from('platform_settings').select('data').eq('id', 'global').single();
        const merged = { ...(current?.data || {}), ...incoming };

        const { error } = await supabase.from('platform_settings').upsert({
            id: 'global',
            data: merged,
            updated_at: new Date().toISOString(),
            updated_by: getAdminUserId(req.admin?.id)
        });
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction('global', { action: 'UPDATE_SETTINGS', after: incoming });
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update settings', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// NOTIFICATIONS BROADCAST
// ---------------------------------------------------------------------------

export const broadcastNotification = async (req: AdminRequest, res: Response) => {
    try {
        const { title, message, type = 'info', targetRole = 'all' } = req.body;

        if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

        let query = supabase.from('users').select('id');
        // Simple filtering for primaryRole if possible
        if (targetRole !== 'all') {
            query = query.eq('data->>primaryRole', targetRole);
        }
        
        const { data: users, error } = await query;
        if (error) throw error;

        if (!users || users.length === 0) return res.status(404).json({ message: 'No target users found' });

        const now = new Date().toISOString();
        const batch = users.map(u => ({
            id: crypto.randomUUID(),
            data: {
                userId: u.id,
                title,
                message,
                type,
                read: false,
                createdAt: now
            },
            created_at: now
        }));

        const { error: notifyErr } = await supabase.from('notifications').insert(batch);
        if (notifyErr) throw notifyErr;

        if (req.logAdminAction) {
            await req.logAdminAction('broadcast', { action: 'BROADCAST_NOTIFICATION', after: { title, targetRole } });
        }

        res.json({ message: `Notification broadcast sent to ${users.length} users` });
    } catch (err: any) {
        console.error('broadcastNotification error:', err);
        res.status(500).json({ message: 'Failed to broadcast notification', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// PAYMENTS & FINANCE — refunds + payouts/settlements (spec 3.5, PRIMARY only)
// ---------------------------------------------------------------------------

// POST /api/admin/payments/:id/refund — issue a real Razorpay refund
export const refundPayment = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { amount } = req.body; // optional partial amount in paise; omit for full refund

        const { data: row, error: fetchError } = await supabase.from('payments').select('id, data').eq('id', id).single();
        if (fetchError || !row) return res.status(404).json({ message: 'Payment not found' });

        const rzpPaymentId = row.data?.razorpay_payment_id || row.data?.paymentId;
        if (!rzpPaymentId) return res.status(400).json({ message: 'No Razorpay payment id on this transaction' });
        if (row.data?.refundStatus === 'completed') return res.status(409).json({ message: 'Payment already refunded' });

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ message: 'Razorpay credentials not configured' });
        }
        const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

        const refund = await razorpay.payments.refund(rzpPaymentId, amount ? { amount: Number(amount) } : {});

        const updated = {
            ...row.data,
            refundStatus: 'completed',
            refundId: refund?.id,
            refundedAt: new Date().toISOString(),
            refundedBy: req.admin?.id,
        };
        await supabase.from('payments').update({ data: updated }).eq('id', id);

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'REFUND_PAYMENT', after: { refundId: refund?.id, amount: amount || 'full' } });
        }

        res.json({ message: 'Refund issued', refundId: refund?.id });
    } catch (err: any) {
        console.error('refundPayment error:', err);
        res.status(500).json({ message: 'Failed to issue refund', error: err?.error?.description || err?.message });
    }
};

// GET /api/admin/payouts — read-only settlements overview (expert earnings owed).
// NOTE: actual disbursement requires a payout rail (e.g. RazorpayX) not yet integrated.
export const getPayouts = async (req: AdminRequest, res: Response) => {
    try {
        const { data: rows, error } = await supabase
            .from('payments')
            .select('id, data, created_at')
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) throw error;

        const settlements = (rows || [])
            .filter(r => Number(r.data?.hostSettlementAmountPaise) > 0 && r.data?.refundStatus !== 'completed')
            .map(r => ({
                id: r.id,
                amountPaise: Number(r.data?.hostSettlementAmountPaise) || 0,
                purpose: r.data?.purpose || r.data?.flow,
                event: r.data?.event || null,
                status: r.data?.payoutStatus || 'pending',
                createdAt: r.created_at,
            }));

        const totalPendingPaise = settlements
            .filter(s => s.status !== 'paid')
            .reduce((sum, s) => sum + s.amountPaise, 0);

        res.json({ settlements, totalPendingPaise, count: settlements.length, disbursementSupported: false });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch payouts', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// CONTENT MODERATION — community posts (spec 3.6)
// ---------------------------------------------------------------------------

// GET /api/admin/posts — list community feed posts
export const getAdminPosts = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10) || 20);
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: rows, count, error } = await supabase
            .from('posts')
            .select('id, data, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
        if (error) throw error;

        // Resolve author names
        const authorIds = [...new Set((rows || []).map(r => {
            const a = r.data?.author;
            return typeof a === 'string' ? a : (a?.id || a?._id);
        }).filter(Boolean))];
        const authorMap: Record<string, any> = {};
        if (authorIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, data').in('id', authorIds);
            (users || []).forEach(u => { authorMap[u.id] = { name: u.data?.name, email: u.data?.email }; });
        }

        const posts = (rows || []).map(r => {
            const a = r.data?.author;
            const authorId = typeof a === 'string' ? a : (a?.id || a?._id);
            return {
                id: r.id,
                content: r.data?.content,
                type: r.data?.type || 'text',
                author: authorMap[authorId] || { name: 'Unknown' },
                likes: Array.isArray(r.data?.likes) ? r.data.likes.length : 0,
                comments: Array.isArray(r.data?.comments) ? r.data.comments.length : 0,
                createdAt: r.data?.createdAt || r.created_at,
            };
        });

        res.json({ posts, total: count || 0, page, limit });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch posts', error: err?.message });
    }
};

// DELETE /api/admin/posts/:id — remove a post (CONTENT_MOD DELETE; both admins per spec 3.6)
export const deletePost = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: existing } = await supabase.from('posts').select('data').eq('id', id).single();
        if (!existing) return res.status(404).json({ message: 'Post not found' });

        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) {
            await req.logAdminAction(id, { action: 'DELETE_POST', before: { content: String(existing.data?.content || '').slice(0, 120) } });
        }

        res.json({ message: 'Post deleted', postId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to delete post', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// LOGS & SECURITY — login activity (spec 3.12, PRIMARY only)
// ---------------------------------------------------------------------------

// GET /api/admin/login-activity — recent user login events from user_activity_logs
export const getLoginActivity = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const limit = Math.min(100, parseInt(String(req.query.limit || '30'), 10) || 30);
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: logs, count, error } = await supabase
            .from('user_activity_logs')
            .select('*', { count: 'exact' })
            .in('action_type', ['LOGIN', 'GOOGLE_LOGIN', 'REGISTER'])
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            if (error.code === '42P01') return res.json({ logs: [], total: 0, page, limit });
            throw error;
        }

        // Resolve user names
        const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
        const userMap: Record<string, any> = {};
        if (userIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, data').in('id', userIds);
            (users || []).forEach(u => { userMap[u.id] = { name: u.data?.name, email: u.data?.email }; });
        }

        const result = (logs || []).map(l => ({
            id: l.id,
            userId: l.user_id,
            user: userMap[l.user_id] || { name: 'Unknown' },
            actionType: l.action_type,
            metadata: l.metadata,
            createdAt: l.created_at,
        }));

        res.json({ logs: result, total: count || 0, page, limit });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch login activity', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// AI CONTROL — usage metrics + prompt logs (spec 3.9, PRIMARY only)
// ---------------------------------------------------------------------------

// Fire-and-forget logger used by the AI controller to persist each Ignisha call.
export const logAiCall = async (entry: {
    userId?: string; feature: string; model?: string; prompt?: string; response?: string; tokens?: number; success?: boolean;
}) => {
    try {
        await supabase.from('ai_logs').insert([{
            user_id: entry.userId || null,
            feature: entry.feature,
            model: entry.model || null,
            prompt: (entry.prompt || '').slice(0, 2000),
            response: (entry.response || '').slice(0, 2000),
            tokens: entry.tokens || null,
            success: entry.success !== false,
        }]);
    } catch { /* logging must never break an AI call */ }
};

// GET /api/admin/ai/metrics — aggregate Ignisha usage
export const getAiMetrics = async (req: AdminRequest, res: Response) => {
    try {
        const { count: total, error } = await supabase.from('ai_logs').select('id', { count: 'exact', head: true });
        if (error) {
            if (error.code === '42P01') return res.json({ total: 0, today: 0, byFeature: [], successRate: null, tableReady: false });
            throw error;
        }

        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const { count: today } = await supabase.from('ai_logs').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString());

        // Feature breakdown + success rate from a recent sample
        const { data: recent } = await supabase.from('ai_logs').select('feature, success').order('created_at', { ascending: false }).limit(1000);
        const byFeatureMap: Record<string, number> = {};
        let success = 0;
        (recent || []).forEach(r => { byFeatureMap[r.feature] = (byFeatureMap[r.feature] || 0) + 1; if (r.success) success++; });
        const byFeature = Object.entries(byFeatureMap).map(([feature, count]) => ({ feature, count }));
        const successRate = (recent && recent.length) ? Math.round((success / recent.length) * 100) : null;

        res.json({ total: total || 0, today: today || 0, byFeature, successRate, tableReady: true });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch AI metrics', error: err?.message });
    }
};

// GET /api/admin/ai/prompt-logs — paginated AI prompt/response log
export const getAiPromptLogs = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10) || 20);
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: rows, count, error } = await supabase
            .from('ai_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
        if (error) {
            if (error.code === '42P01') return res.json({ logs: [], total: 0, page, limit, tableReady: false });
            throw error;
        }

        res.json({ logs: rows || [], total: count || 0, page, limit, tableReady: true });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch prompt logs', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// NOTIFICATION TEMPLATES (spec 3.8, PRIMARY manage)
// ---------------------------------------------------------------------------

export const listNotificationTemplates = async (req: AdminRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('notification_templates').select('*').order('created_at', { ascending: false });
        if (error) {
            if (error.code === '42P01') return res.json({ templates: [], tableReady: false });
            throw error;
        }
        res.json({ templates: data || [], tableReady: true });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch templates', error: err?.message });
    }
};

export const createNotificationTemplate = async (req: AdminRequest, res: Response) => {
    try {
        const { name, title, body, type = 'info' } = req.body;
        if (!name || !title || !body) return res.status(400).json({ message: 'name, title and body are required' });

        const { data, error } = await supabase.from('notification_templates')
            .insert([{ name, title, body, type, created_by: req.admin?.id }])
            .select().single();
        if (error) throw error;

        if (req.logAdminAction) await req.logAdminAction(data.id, { action: 'CREATE_TEMPLATE', after: { name } });
        res.status(201).json({ message: 'Template created', template: data });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to create template', error: err?.message });
    }
};

export const updateNotificationTemplate = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const fields: Record<string, any> = {};
        for (const f of ['name', 'title', 'body', 'type']) if (req.body[f] !== undefined) fields[f] = req.body[f];
        if (Object.keys(fields).length === 0) return res.status(400).json({ message: 'No fields provided' });
        fields.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('notification_templates').update(fields).eq('id', id).select().single();
        if (error?.code === 'PGRST116' || (!error && !data)) return res.status(404).json({ message: 'Template not found' });
        if (error) throw error;

        if (req.logAdminAction) await req.logAdminAction(id, { action: 'UPDATE_TEMPLATE', after: fields });
        res.json({ message: 'Template updated', template: data });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update template', error: err?.message });
    }
};

export const deleteNotificationTemplate = async (req: AdminRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { data: existing } = await supabase.from('notification_templates').select('name').eq('id', id).single();
        if (!existing) return res.status(404).json({ message: 'Template not found' });

        const { error } = await supabase.from('notification_templates').delete().eq('id', id);
        if (error) throw error;

        if (req.logAdminAction) await req.logAdminAction(id, { action: 'DELETE_TEMPLATE', before: { name: existing.name } });
        res.json({ message: 'Template deleted', templateId: id });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to delete template', error: err?.message });
    }
};

// ===========================================================================
// UPLOADED DOCUMENTS (DOCUMENTS module)
// ---------------------------------------------------------------------------
// Aggregates every user-uploaded file across the platform (EXCLUDING profile
// avatars/cover photos and private chat attachments) into a single admin view.
// Sources are read directly from their source-of-truth tables so existing
// uploads appear automatically — no changes to any upload flow are required.
//
// Each document is identified by a synthetic docUid: `${source}:${id}:${field}`
// which deleteUploadedDocument resolves back to the source row + storage object.
// ===========================================================================

interface AggregatedDoc {
    docUid: string;
    source: string;
    sourceId: string;
    field: string;
    categoryKey: string;
    category: string;
    fileName: string;
    fileUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
    bucket: string | null;
    storagePath: string | null;
    context: string;
    ownerUserId: string | null;
    status: string | null;
    uploadedAt: string | null;
}

const dealRoomCategory = (type: string): { key: string; label: string } => {
    if (type === 'pitchDeck') return { key: 'pitch_deck', label: 'Pitch Deck' };
    if (type === 'executiveSummary') return { key: 'pitch_video', label: 'Pitch Video' };
    return { key: 'business_doc', label: 'Business Document' };
};

// Collect normalized document rows from every in-scope source table.
async function aggregateUploadedDocuments(): Promise<AggregatedDoc[]> {
    const [dealRes, startupRes, eventRes, verifyRes] = await Promise.all([
        supabase.from('deal_room_documents').select('id, data, created_at'),
        supabase.from('startups').select('id, data, created_at'),
        supabase.from('events').select('id, data, created_at'),
        supabase
            .from('verification_documents')
            .select('id, userId, documentType, fileName, fileUrl, fileSize, mimeType, status, uploadedAt'),
    ]);

    const docs: AggregatedDoc[] = [];

    // --- Funding / deal-room uploads (pitch decks, pitch videos, business docs) ---
    for (const row of dealRes.data || []) {
        const data: any = row.data || {};
        const file: any = data.file || {};
        const url = file.url || data.url || data.fileUrl || null;
        if (!url) continue;
        const { key, label } = dealRoomCategory(String(data.type || ''));
        docs.push({
            docUid: `deal_room_documents:${row.id}:file`,
            source: 'deal_room_documents',
            sourceId: String(row.id),
            field: 'file',
            categoryKey: key,
            category: data.category || label,
            fileName: file.originalName || data.name || data.fileName || label,
            fileUrl: url,
            fileSize: file.size ?? data.size ?? null,
            mimeType: file.mimeType || data.mimeType || data.fileType || null,
            bucket: file.bucket || null,
            storagePath: file.path || null,
            context: 'Funding Deal Room',
            ownerUserId: data.uploadedBy || data.user || null,
            status: null,
            uploadedAt: file.uploadedAt || data.uploadedAt || row.created_at || null,
        });
    }

    // --- Startup assets (pitch deck + logo) ---
    for (const row of startupRes.data || []) {
        const data: any = row.data || {};
        const startupName = data.name || 'Untitled';
        if (data.pitchDeckUrl) {
            docs.push({
                docUid: `startups:${row.id}:pitchDeck`,
                source: 'startups',
                sourceId: String(row.id),
                field: 'pitchDeck',
                categoryKey: 'pitch_deck',
                category: 'Startup Pitch Deck',
                fileName: data.pitchDeckName || 'Pitch Deck',
                fileUrl: data.pitchDeckUrl,
                fileSize: data.pitchDeckSize ?? null,
                mimeType: null,
                bucket: null,
                storagePath: null,
                context: `Startup: ${startupName}`,
                ownerUserId: data.founder || null,
                status: data.status || null,
                uploadedAt: row.created_at || null,
            });
        }
        if (data.logo) {
            docs.push({
                docUid: `startups:${row.id}:logo`,
                source: 'startups',
                sourceId: String(row.id),
                field: 'logo',
                categoryKey: 'startup_logo',
                category: 'Startup Logo',
                fileName: `${startupName} Logo`,
                fileUrl: data.logo,
                fileSize: null,
                mimeType: null,
                bucket: null,
                storagePath: null,
                context: `Startup: ${startupName}`,
                ownerUserId: data.founder || null,
                status: data.status || null,
                uploadedAt: row.created_at || null,
            });
        }
    }

    // --- Event presentations ---
    for (const row of eventRes.data || []) {
        const data: any = row.data || {};
        if (!data.presentationUrl) continue;
        docs.push({
            docUid: `events:${row.id}:presentation`,
            source: 'events',
            sourceId: String(row.id),
            field: 'presentation',
            categoryKey: 'event_presentation',
            category: 'Event Presentation',
            fileName: data.presentationName || `${data.title || 'Event'} Presentation`,
            fileUrl: data.presentationUrl,
            fileSize: null,
            mimeType: null,
            bucket: null,
            storagePath: null,
            context: `Event: ${data.title || 'Untitled'}`,
            ownerUserId: data.hostUser || data.host || null,
            status: data.status || null,
            uploadedAt: row.created_at || null,
        });
    }

    // --- KYC / verification documents ---
    for (const row of (verifyRes.data || []) as any[]) {
        if (!row.fileUrl) continue;
        docs.push({
            docUid: `verification_documents:${row.id}:fileUrl`,
            source: 'verification_documents',
            sourceId: String(row.id),
            field: 'fileUrl',
            categoryKey: 'verification',
            category: `Verification${row.documentType ? ` (${row.documentType})` : ''}`,
            fileName: row.fileName || 'Verification Document',
            fileUrl: row.fileUrl,
            fileSize: row.fileSize ?? null,
            mimeType: row.mimeType || null,
            bucket: null,
            storagePath: null,
            context: 'KYC Verification',
            ownerUserId: row.userId || null,
            status: row.status || null,
            uploadedAt: row.uploadedAt || null,
        });
    }

    // Dedup by file URL — funding uploads are mirrored into startups.pitchDeckUrl,
    // so the same file can surface twice. deal_room_documents is processed first
    // and wins because it carries explicit bucket/path metadata.
    const seen = new Set<string>();
    const deduped: AggregatedDoc[] = [];
    for (const d of docs) {
        const key = d.fileUrl || d.docUid;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(d);
    }
    return deduped;
}

// Look up uploader display name/email for a set of user ids.
async function fetchUploaderMap(userIds: string[]): Promise<Record<string, { name: string; email: string }>> {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    const map: Record<string, { name: string; email: string }> = {};
    if (!ids.length) return map;
    const { data } = await supabase.from('users').select('id, data').in('id', ids);
    for (const u of (data || []) as any[]) {
        map[String(u.id)] = {
            name: u.data?.name || u.data?.displayName || 'Unknown',
            email: u.data?.email || '',
        };
    }
    return map;
}

// ---------------------------------------------------------------------------
// GET /api/admin/documents?page=1&limit=20&search=&category=&source=
// List all uploaded documents with uploader info, paginated. Both admins.
// ---------------------------------------------------------------------------
export const getUploadedDocuments = async (req: AdminRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
        const search = String(req.query.search || '').trim().toLowerCase();
        const category = String(req.query.category || '').trim();
        const source = String(req.query.source || '').trim();

        let docs = await aggregateUploadedDocuments();

        if (category) docs = docs.filter((d) => d.categoryKey === category);
        if (source) docs = docs.filter((d) => d.source === source);

        // Enrich with uploader name/email (needed before search so admins can
        // search by uploader as well as file name / context).
        const uploaderMap = await fetchUploaderMap(docs.map((d) => d.ownerUserId || ''));
        let enriched = docs.map((d) => {
            const owner = d.ownerUserId ? uploaderMap[d.ownerUserId] : undefined;
            return {
                ...d,
                uploaderName: owner?.name || (d.ownerUserId ? 'Unknown' : '—'),
                uploaderEmail: owner?.email || '',
            };
        });

        if (search) {
            enriched = enriched.filter((d) =>
                [d.fileName, d.context, d.category, d.uploaderName, d.uploaderEmail]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(search))
            );
        }

        enriched.sort(
            (a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
        );

        const total = enriched.length;
        const from = (page - 1) * limit;
        const pageItems = enriched.slice(from, from + limit);

        res.json({ documents: pageItems, total, page, limit });
    } catch (err: any) {
        console.error('[getUploadedDocuments] Error:', err);
        res.status(500).json({ message: 'Failed to fetch uploaded documents', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/documents/stats
// Per-category counts for the tab header. Both admins.
// ---------------------------------------------------------------------------
export const getUploadedDocumentStats = async (_req: AdminRequest, res: Response) => {
    try {
        const docs = await aggregateUploadedDocuments();
        const byCategory: Record<string, number> = {};
        for (const d of docs) {
            byCategory[d.categoryKey] = (byCategory[d.categoryKey] || 0) + 1;
        }
        res.json({ total: docs.length, byCategory });
    } catch (err: any) {
        console.error('[getUploadedDocumentStats] Error:', err);
        res.status(500).json({ message: 'Failed to compute document stats', error: err?.message });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/documents/:docUid
// Permanently remove a document from Supabase Storage AND clear its source
// reference so it disappears from the app. PRIMARY_ADMIN only.
// ---------------------------------------------------------------------------
export const deleteUploadedDocument = async (req: AdminRequest, res: Response) => {
    try {
        const docUid = decodeURIComponent(String(req.params.docUid || ''));
        const parts = docUid.split(':');
        if (parts.length < 3) {
            return res.status(400).json({ message: 'Invalid document identifier' });
        }
        const source = parts[0];
        const field = parts[parts.length - 1];
        const sourceId = parts.slice(1, -1).join(':');

        // Re-fetch the source row so we delete the CURRENT file, never trusting
        // a client-supplied URL/path.
        let storageRef: { bucket: string; path: string } | null = null;
        let removeRow = false;
        let clearedFields: Record<string, any> | null = null;

        if (source === 'deal_room_documents') {
            const { data: row } = await supabase.from('deal_room_documents').select('id, data').eq('id', sourceId).single();
            if (!row) return res.status(404).json({ message: 'Document not found' });
            const file: any = (row as any).data?.file || {};
            storageRef = resolveStorageRef({ bucket: file.bucket, path: file.path, url: file.url || (row as any).data?.url });
            removeRow = true;
        } else if (source === 'startups') {
            const { data: row } = await supabase.from('startups').select('id, data').eq('id', sourceId).single();
            if (!row) return res.status(404).json({ message: 'Document not found' });
            const data: any = (row as any).data || {};
            if (field === 'pitchDeck') {
                storageRef = resolveStorageRef({ url: data.pitchDeckUrl });
                const { pitchDeckUrl, pitchDeckName, pitchDeckSize, pitchDeck, ...rest } = data;
                clearedFields = rest;
            } else if (field === 'logo') {
                storageRef = resolveStorageRef({ url: data.logo });
                const { logo, ...rest } = data;
                clearedFields = rest;
            } else {
                return res.status(400).json({ message: 'Unknown startup document field' });
            }
        } else if (source === 'events') {
            const { data: row } = await supabase.from('events').select('id, data').eq('id', sourceId).single();
            if (!row) return res.status(404).json({ message: 'Document not found' });
            const data: any = (row as any).data || {};
            storageRef = resolveStorageRef({ url: data.presentationUrl });
            const { presentationUrl, presentationName, ...rest } = data;
            clearedFields = rest;
        } else if (source === 'verification_documents') {
            const { data: row } = await supabase.from('verification_documents').select('id, fileUrl').eq('id', sourceId).single();
            if (!row) return res.status(404).json({ message: 'Document not found' });
            storageRef = resolveStorageRef({ url: (row as any).fileUrl });
            removeRow = true;
        } else {
            return res.status(400).json({ message: 'Unsupported document source' });
        }

        // Remove the physical object. Non-fatal: if it's already gone we still
        // clear the DB reference so the document leaves the app.
        let storageWarning: string | null = null;
        if (storageRef) {
            try {
                await deletePublicFile(storageRef);
            } catch (e: any) {
                storageWarning = e?.message || 'Storage object could not be removed';
                console.warn('[deleteUploadedDocument] storage removal failed:', storageWarning);
            }
        } else {
            storageWarning = 'Could not resolve a storage object for this document';
        }

        // Clear the DB reference.
        if (removeRow) {
            const { error } = await supabase.from(source).delete().eq('id', sourceId);
            if (error) throw error;
        } else if (clearedFields) {
            const { error } = await supabase.from(source).update({ data: clearedFields }).eq('id', sourceId);
            if (error) throw error;
        }

        if (req.logAdminAction) {
            await req.logAdminAction(docUid, { action: 'DELETE_DOCUMENT', source, sourceId, field, storageWarning });
        }

        res.json({ message: 'Document deleted', docUid, storageWarning });
    } catch (err: any) {
        console.error('[deleteUploadedDocument] Error:', err);
        res.status(500).json({ message: 'Failed to delete document', error: err?.message });
    }
};



