import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { io } from '../utils/socket';

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('data')
            .eq('data->>user', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data.map(d => d.data));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data: existing } = await supabase.from('notifications').select('data').eq('id', id).single();

        if (!existing) return res.status(404).json({ message: 'Notification not found' });
        if (existing.data.user !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

        const updatedData = { ...existing.data, read: true, updatedAt: new Date().toISOString() };
        await supabase.from('notifications').update({ data: updatedData }).eq('id', id);

        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { data: notifications } = await supabase.from('notifications').select('id, data').eq('data->>user', req.user.id).eq('data->>read', 'false');
        if (notifications) {
            for (const n of notifications) {
                const updated = { ...n.data, read: true, updatedAt: new Date().toISOString() };
                await supabase.from('notifications').update({ data: updated }).eq('id', n.id);
            }
        }
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createNotification = async (userId: string, type: string, title: string, content: string, link?: string, senderId?: string, metadata?: Record<string, any>) => {
    try {
        const id = Math.random().toString(36).substring(2, 15);
        const notificationData = { id, user: userId, type, title, content, link, sender: senderId, metadata, read: false, createdAt: new Date().toISOString(), _id: id };
        await supabase.from('notifications').insert([{ id, data: notificationData }]);

        // Real-time socket emission — deliver only to the target user's room
        // (drives the in-app bell + the mobile/web push hook). Falls back to no-op
        // if the user has no active socket.
        io.to(`user:${userId}`).emit('notification_received', notificationData);
    } catch (error) {
        console.error('Failed to create notification', error);
    }
};
