import express from 'express';
import cors from 'cors';

import { app as socketApp, allowedOrigins } from '../utils/socket';

import authRoutes from '../routes/authRoutes';
import startupRoutes from '../routes/startupRoutes';
import feedRoutes from '../routes/feedRoutes';
import aiRoutes from '../routes/aiRoutes';
import bookingRoutes from '../routes/bookingRoutes';
import messageRoutes from '../routes/messageRoutes';
import notificationRoutes from '../routes/notificationRoutes';
import eventRoutes from '../routes/eventRoutes';
import paymentRoutes from '../routes/paymentRoutes';
import communityRoutes from '../routes/communityRoutes';
import verificationRoutes from '../routes/verificationRoutes';
import fundingRoutes from '../routes/fundingRoutes';
import cofounderRoutes from '../routes/cofounderRoutes';
import newsRoutes from '../routes/newsRoutes';
import podcastRoutes from '../routes/podcastRoutes';
import availabilityRoutes from '../routes/availabilityRoutes';
import messagingRoutes from '../routes/messagingRoutes';
import followRoutes from '../routes/followRoutes';
import dealRoomRoutes from '../routes/dealRoomRoutes';
import templateRoutes from '../routes/templateRoutes';
import emailRoutes from '../routes/emailRoutes';

export const createTestApp = () => {
    const app = socketApp;

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use('/api/auth', authRoutes);
    app.use('/api/startups', startupRoutes);
    app.use('/api/feed', feedRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/events', eventRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/communities', communityRoutes);
    app.use('/api/verification', verificationRoutes);
    app.use('/api/funding', fundingRoutes);
    app.use('/api/cofounders', cofounderRoutes);
    app.use('/api/news', newsRoutes);
    app.use('/api/podcasts', podcastRoutes);
    app.use('/api/availability', availabilityRoutes);
    app.use('/api/messaging', messagingRoutes);
    app.use('/api/follow', followRoutes);
    app.use('/api/dealroom', dealRoomRoutes);
    app.use('/api/templates', templateRoutes);
    app.use('/api/email', emailRoutes);

    app.get('/api/health', (_req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

    return app;
};
