import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ============================================================================
// Environment Variable Validation
// ============================================================================
// Validate all required environment variables before starting the server
// This prevents the server from running with missing or incomplete configuration

const requiredEnvVars = [
    'JWT_SECRET',
    'ADMIN_JWT_SECRET',
    'ADMIN_CREDENTIALS',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
];

const optionalButRecommendedEnvVars = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
];

console.log('\n=======================================================');
console.log('  Next Ignition Backend - Environment Validation');
console.log('=======================================================\n');

const missingRequired = requiredEnvVars.filter(v => !process.env[v]);
const missingOptional = optionalButRecommendedEnvVars.filter(v => !process.env[v]);

if (missingRequired.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:\n');
    missingRequired.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
}

console.log('✅ All required environment variables are set\n');

if (missingOptional.length > 0) {
    console.warn('⚠️  Optional environment variables not set:');
    missingOptional.forEach(v => console.warn(`   - ${v}`));
    console.warn('   Some features may not work without these variables.\n');
}

console.log('=======================================================\n');

// ============================================================================
// Imports - After environment validation
// ============================================================================

import express from 'express';
import cors from 'cors';

import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { app, httpServer, io, allowedOrigins, isAllowedOrigin } from './utils/socket';
import authRoutes from './routes/authRoutes';
import startupRoutes from './routes/startupRoutes';
import feedRoutes from './routes/feedRoutes';
import aiRoutes from './routes/aiRoutes';
import bookingRoutes from './routes/bookingRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import eventRoutes from './routes/eventRoutes';
import paymentRoutes from './routes/paymentRoutes';
import communityRoutes from './routes/communityRoutes';
import verificationRoutes from './routes/verificationRoutes';
import fundingRoutes from './routes/fundingRoutes';
import earningsRoutes from './routes/earningsRoutes';
import cofounderRoutes from './routes/cofounderRoutes';
import newsRoutes from './routes/newsRoutes';
import podcastRoutes from './routes/podcastRoutes';
import investorFeaturesRoutes from './routes/investorFeaturesRoutes';
import availabilityRoutes from './routes/availabilityRoutes';
import messagingRoutes from './routes/messagingRoutes';
import followRoutes from './routes/followRoutes';
import dealRoomRoutes from './routes/dealRoomRoutes';
import templateRoutes from './routes/templateRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import emailRoutes from './routes/emailRoutes';
import adminRoutes from './routes/adminRoutes';
import bookmarkRoutes from './routes/bookmarkRoutes';
import roleApplicationRoutes from './routes/roleApplicationRoutes';
import verificationRoutes2 from './routes/verificationRoutes2';
import documentRoutes from './routes/documentRoutes';
import waitlistRoutes from './routes/waitlistRoutes';
import publicRoutes from './routes/publicRoutes';
import { maintenanceMiddleware } from './middleware/maintenanceMiddleware';
import walletRoutes from './routes/walletRoutes';
import userRoutes from './routes/userRoutes';
import reportRoutes from './routes/reportRoutes';
import callRoutes from './routes/callRoutes';
import engagementRoutes from './routes/engagementRoutes';

// dotenv.config(); // Moved to top for environment variable synchronization

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

// Connect to MongoDB removed as part of Supabase migration

// ============================================================================
// Global Middleware
// ============================================================================

// 1. Force CORS Headers - Manual injection to ensure browser compliance
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (isAllowedOrigin(origin) || !origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    // These are the "unsafe" headers Razorpay/Sentry scripts need to read
    const exposedHeaders = [
        'x-rtb-fingerprint-id',
        'request-id',
        'x-razorpay-signature',
        'x-razorpay-event-id',
        'Content-Type',
        'Authorization'
    ];
    
    res.header('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-rtb-fingerprint-id, request-id, X-Requested-With, Accept, x-razorpay-signature, X-Client-Platform');
        return res.status(200).end();
    }
    next();
});

// 2. Logging & Basic Health
app.use((req: any, res, next) => {
    const origin = req.headers.origin;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${origin}`);
    next();
});

// 3. Security & Utility
app.use(helmet({ 
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(compression());


app.use(express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for the AI routes.
//
// Two layered limiters: a STRICT one that only counts the expensive
// model-generation calls (every LLM endpoint here is a POST), and a GENEROUS
// safety-net that covers everything else. Previously a single 20/min limiter
// was applied to the whole router, so cheap read GETs (queries-left,
// saved-sessions, conversations) shared the same tiny budget as chat — a few
// messages exhausted it and the UI broke with 429s mid-conversation. The real
// per-plan daily quota is enforced in the controllers (checkAiLimit), so the
// reads don't need a tight IP cap.
const aiGenerationLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,             // 30 model-generation calls per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many AI requests. Please wait a moment.' },
    skip: (req) => req.method !== 'POST', // only count generation POSTs
});
const aiSafetyNetLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 200,            // generous catch-all (covers cheap GET reads/polling)
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down.' },
});
app.use('/api/ignition', aiGenerationLimit, aiSafetyNetLimit);

// 4. Maintenance Mode Check
app.use('/api', maintenanceMiddleware);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Socket.io connection logic (kept in index for simplicity)
const voicePresenceByCommunity = new Map<string, Map<string, Map<string, any>>>();

// Podcast live session viewer tracking  { sessionId -> Map<socketId, userInfo> }
const podcastLiveViewers = new Map<string, Map<string, any>>();

const getPodcastViewersPayload = (sessionId: string) => {
    const viewers = podcastLiveViewers.get(sessionId);
    return { sessionId, viewers: viewers ? Array.from(viewers.values()) : [] };
};

const upsertPodcastViewer = (sessionId: string, socketId: string, user: any) => {
    if (!sessionId || !socketId) return;
    const viewers = podcastLiveViewers.get(sessionId) || new Map<string, any>();
    viewers.set(socketId, user);
    podcastLiveViewers.set(sessionId, viewers);
};

const removePodcastViewer = (sessionId: string, socketId: string) => {
    const viewers = podcastLiveViewers.get(sessionId);
    if (!viewers) return;
    viewers.delete(socketId);
    if (viewers.size === 0) podcastLiveViewers.delete(sessionId);
};

const getCommunityPresencePayload = (communityId: string) => {
    const community = voicePresenceByCommunity.get(communityId);
    const channels: Record<string, any[]> = {};
    if (!community) return { communityId, channels };

    for (const [channelId, sockets] of community.entries()) {
        channels[channelId] = Array.from(sockets.values());
    }

    return { communityId, channels };
};

const upsertVoicePresence = (communityId: string, channelId: string, socketId: string, user: any) => {
    if (!communityId || !channelId || !socketId) return;
    const community = voicePresenceByCommunity.get(communityId) || new Map<string, Map<string, any>>();
    const channel = community.get(channelId) || new Map<string, any>();
    channel.set(socketId, user);
    community.set(channelId, channel);
    voicePresenceByCommunity.set(communityId, community);
};

const removeVoicePresence = (communityId: string, channelId: string, socketId: string) => {
    const community = voicePresenceByCommunity.get(communityId);
    if (!community) return;
    const channel = community.get(channelId);
    if (!channel) return;
    channel.delete(socketId);
    if (channel.size === 0) community.delete(channelId);
    if (community.size === 0) voicePresenceByCommunity.delete(communityId);
};

// Sweep stale presence entries every 10 minutes (guards against missed disconnect events)
setInterval(() => {
    for (const [communityId, channels] of voicePresenceByCommunity.entries()) {
        for (const [channelId, sockets] of channels.entries()) {
            for (const socketId of sockets.keys()) {
                if (!io.sockets.sockets.has(socketId)) {
                    sockets.delete(socketId);
                }
            }
            if (sockets.size === 0) channels.delete(channelId);
        }
        if (channels.size === 0) voicePresenceByCommunity.delete(communityId);
    }
}, 10 * 60 * 1000);

// ============================================================================
// Socket.IO Authentication Middleware
// ============================================================================
// Authenticate socket connections using JWT tokens
// This prevents unauthenticated users from spoofing identities

import jwt from 'jsonwebtoken';

io.use((socket, next) => {
    try {
        // Try to get token from auth object (preferred) or handshake headers
        const token = socket.handshake.auth?.token || 
                     socket.handshake.headers?.authorization?.split(' ')[1];
        
        if (!token) {
            // Allow connection but mark as unauthenticated
            // Some features may work without authentication (public rooms, etc.)
            socket.data.authenticated = false;
            socket.data.user = null;
            console.log(`[Socket] Unauthenticated connection allowed: ${socket.id}`);
            return next();
        }

        // Verify the JWT token
        const JWT_SECRET = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // Attach user information to socket
        socket.data.authenticated = true;
        socket.data.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
        };
        
        console.log(`[Socket] Authenticated connection: ${socket.id} (User: ${decoded.email})`);
        next();
    } catch (error) {
        // Invalid token - allow connection but mark as unauthenticated
        socket.data.authenticated = false;
        socket.data.user = null;
        console.warn(`[Socket] Invalid token on connection ${socket.id}:`, error instanceof Error ? error.message : 'Unknown error');
        next();
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] New connection: ${socket.id} from ${socket.handshake.address} (Transport: ${socket.conn.transport.name})`);
    
    if (socket.data.authenticated) {
        console.log(`[Socket] Authenticated user: ${socket.data.user?.email || socket.data.user?.id}`);
        // Join a personal room so the server can deliver per-user notifications.
        if (socket.data.user?.id) socket.join(`user:${socket.data.user.id}`);
    } else {
        console.log(`[Socket] Unauthenticated connection (limited features available)`);
    }

    // Late authentication: the client emits 'register' with its JWT once the
    // token becomes available (e.g. the singleton socket connected before login).
    socket.on('register', (token: string) => {
        try {
            if (!token) return;
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            socket.data.authenticated = true;
            socket.data.user = { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name };
            if (decoded.id) {
                socket.join(`user:${decoded.id}`);
                console.log(`[Socket] Registered user room for ${decoded.email || decoded.id}`);
            }
        } catch (err) {
            console.warn(`[Socket] register failed on ${socket.id}:`, err instanceof Error ? err.message : 'invalid token');
        }
    });

    socket.on('error', (err) => {
        console.error(`[Socket] Error on ${socket.id}:`, err);
    });

    socket.on('join_conversation', (id) => socket.join(id));
    socket.on('leave_conversation', (id) => socket.leave(id));

    socket.on('join_community', (data) => {
        const communityId = String(data?.communityId || '');
        if (!communityId) return;
        socket.join(`community:${communityId}`);
        socket.emit('voice_presence_update', getCommunityPresencePayload(communityId));
    });

    socket.on('leave_community', (data) => {
        const communityId = String(data?.communityId || '');
        if (!communityId) return;
        socket.leave(`community:${communityId}`);
    });

    socket.on('join_voice', async (data) => {
        // Require authentication for voice channels
        if (!socket.data.authenticated || !socket.data.user) {
            socket.emit('error', { 
                event: 'join_voice', 
                message: 'Authentication required to join voice channels' 
            });
            return;
        }

        const room = `voice:${data.channelId}`;
        const communityId = String(data?.communityId || '');
        
        // Use authenticated user data instead of client-provided data
        const user = {
            userId: socket.data.user.id,
            name: socket.data.user.name || socket.data.user.email,
            avatar: data?.avatar || null, // Avatar can be provided by client
        };

        (socket.data as any).voice = { room, user, channelId: data?.channelId, communityId };
        socket.join(room);

        if (communityId && data?.channelId) {
            upsertVoicePresence(communityId, String(data.channelId), socket.id, user);
            io.to(`community:${communityId}`).emit('voice_presence_update', getCommunityPresencePayload(communityId));
        }

        try {
            const roomSet = io.sockets.adapter.rooms.get(room);
            const otherSocketIds = roomSet ? Array.from(roomSet).filter((id) => id !== socket.id) : [];

            for (const otherId of otherSocketIds) {
                const otherSocket = io.sockets.sockets.get(otherId);
                const otherUser = (otherSocket?.data as any)?.voice?.user;
                if (otherUser?.userId) {
                    socket.emit('user_joined_voice', {
                        ...otherUser,
                        channelId: data.channelId,
                        socketId: otherId,
                    });
                }
            }

            socket.to(room).emit('user_joined_voice', {
                ...user,
                channelId: data.channelId,
                socketId: socket.id,
            });
        } catch (e) {
            console.error('join_voice error:', e);
        }
    });

    socket.on('leave_voice', (data) => {
        const room = (socket.data as any)?.voice?.room || (data?.channelId ? `voice:${data.channelId}` : null);
        const communityId = String((socket.data as any)?.voice?.communityId || data?.communityId || '');
        const channelId = String((socket.data as any)?.voice?.channelId || data?.channelId || '');
        if (!room) return;

        socket.leave(room);
        socket.to(room).emit('user_left_voice', { socketId: socket.id, channelId: data?.channelId });
        (socket.data as any).voice = null;

        if (communityId && channelId) {
            removeVoicePresence(communityId, channelId, socket.id);
            io.to(`community:${communityId}`).emit('voice_presence_update', getCommunityPresencePayload(communityId));
        }
    });

    socket.on('voice_signal', ({ to, from, signal }) => {
        if (!to || !signal) return;
        io.to(String(to)).emit('voice_signal', { signal, from: from || socket.id });
    });

    // ── Podcast live viewer tracking ──────────────────────────────────────────
    socket.on('join_podcast_live', (data) => {
        // Require authentication for podcast live sessions
        if (!socket.data.authenticated || !socket.data.user) {
            socket.emit('error', { 
                event: 'join_podcast_live', 
                message: 'Authentication required to join podcast live sessions' 
            });
            return;
        }

        const sessionId = String(data?.sessionId || '');
        if (!sessionId) return;
        
        // Use authenticated user data instead of client-provided data
        const user = {
            userId: socket.data.user.id,
            name: socket.data.user.name || socket.data.user.email,
            avatar: data?.avatar || null, // Avatar can be provided by client
        };
        
        (socket.data as any).podcastLive = { sessionId, user };
        socket.join(`podcast:live:${sessionId}`);
        upsertPodcastViewer(sessionId, socket.id, user);
        // Notify everyone in the room (expert gets viewer update)
        io.to(`podcast:live:${sessionId}`).emit('podcast_viewer_update', getPodcastViewersPayload(sessionId));
    });

    socket.on('leave_podcast_live', (data) => {
        const sessionId = String(data?.sessionId || (socket.data as any)?.podcastLive?.sessionId || '');
        if (!sessionId) return;
        socket.leave(`podcast:live:${sessionId}`);
        removePodcastViewer(sessionId, socket.id);
        (socket.data as any).podcastLive = null;
        io.to(`podcast:live:${sessionId}`).emit('podcast_viewer_update', getPodcastViewersPayload(sessionId));
    });

    socket.on('disconnect', (reason) => {
        console.log(`[Socket] Client ${socket.id} disconnected. Reason: ${reason}`);
        try {
            const v = (socket.data as any)?.voice;
            const communityId = String(v?.communityId || '');
            const channelId = String(v?.channelId || '');
            if (communityId && channelId) {
                removeVoicePresence(communityId, channelId, socket.id);
                io.to(`community:${communityId}`).emit('voice_presence_update', getCommunityPresencePayload(communityId));
            }
            // Clean up podcast live viewer
            const pl = (socket.data as any)?.podcastLive;
            if (pl?.sessionId) {
                removePodcastViewer(pl.sessionId, socket.id);
                io.to(`podcast:live:${pl.sessionId}`).emit('podcast_viewer_update', getPodcastViewersPayload(pl.sessionId));
            }
        } catch {
            // ignore
        }
    });
});

io.on('error', (err) => {
    console.error('[Socket] Server Error:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/ignition', aiRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/funding', fundingRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/cofounders', cofounderRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/investor', investorFeaturesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/dealroom', dealRoomRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/roles', roleApplicationRoutes);
app.use('/api/verification', verificationRoutes2);
app.use('/api/verification', documentRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/engagement', engagementRoutes);
// --- BACKEND VERSION 2026-03-29 (SYNC FIXED) ---
const BACKEND_VERSION = 'v2-startup-explorer';

// Global Health Check (Versioned)
app.get('/api/health', (req, res) => res.json({ 
    status: 'healthy', 
    version: BACKEND_VERSION,
    timestamp: new Date().toISOString() 
}));

// Redundant Admin Probe (Bypasses Admin Router to confirm core server health)
app.get('/api/admin-ping', (req, res) => res.json({ 
    status: 'admin-ping-ok',
    version: BACKEND_VERSION,
    message: 'If you see this, the server is serving Admin routes correctly.' 
}));

app.use('/api/admin', adminRoutes);

console.log(`Backend initialized: ${BACKEND_VERSION}`);
console.log('Using Supabase as primary database');


const startServer = (port: number) => {
    const onError = (error: any) => {
        if (error?.code === 'EADDRINUSE') {
            console.warn(`Port ${port} in use. Trying ${port + 1}...`);
            startServer(port + 1);
            return;
        }
        process.exit(1);
    };

    httpServer.once('error', onError);
    httpServer.listen(port, () => {
        // Tune keep-alive to reduce idle connection overhead
        httpServer.keepAliveTimeout = 65000;
        (httpServer as any).headersTimeout = 66000;
        console.log(`Server is running on port ${port}`);
    });
};

startServer(PORT);
// Trigger restart 3 
