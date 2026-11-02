import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { areMutualFollowers } from './followController';
import crypto from 'crypto';

// Send a message
export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { receiverId, content, type, fileUrl } = req.body;
        const senderId = req.user.id;

        // Both users must follow each other to exchange direct messages.
        if (!(await areMutualFollowers(String(senderId), String(receiverId)))) {
            return res.status(403).json({
                code: 'MUTUAL_FOLLOW_REQUIRED',
                message: 'You can only message someone when you both follow each other.',
            });
        }

        // Check if conversation already exists between these two users
        const { data: convs } = await supabase.from('conversations')
            .select('id, data')
            .filter('data->participants', 'cs', `["${senderId}"]`)
            .filter('data->participants', 'cs', `["${receiverId}"]`)
            .eq('data->>type', 'direct')
            .limit(1);

        let convRow = convs && convs.length > 0 ? convs[0] : null;

        if (!convRow) {
            const newConvId = crypto.randomUUID();
            const newConvData = {
                participants: [senderId, receiverId],
                type: 'direct',
                unreadCount: {}
            };
            const { data: insertedConv, error: convErr } = await supabase.from('conversations').insert({
                id: newConvId,
                data: newConvData
            }).select().single();
            if (convErr) throw convErr;
            convRow = insertedConv;
        }

        if (!convRow) throw new Error('Conversation could not be identified or created');

        // Create the message
        const newMsgId = crypto.randomUUID();
        const msgData = {
            conversationId: convRow.id,
            sender: senderId,
            receiver: receiverId,
            content,
            type: type || 'text',
            fileUrl,
            isRead: false
        };

        const { data: msgRow, error: msgErr } = await supabase.from('messages').insert({
            id: newMsgId,
            data: msgData
        }).select().single();

        if (msgErr) throw msgErr;

        // Update conversation with last message and unread count
        const unreadKey = receiverId;
        const unreadCountObj = convRow.data?.unreadCount || {};
        unreadCountObj[unreadKey] = (unreadCountObj[unreadKey] || 0) + 1;

        await supabase.from('conversations').update({
            data: {
                ...convRow.data,
                unreadCount: unreadCountObj,
                lastMessage: {
                    content: type === 'image' ? 'Sent an image' : type === 'file' ? 'Sent a file' : content,
                    sender: senderId,
                    timestamp: new Date().toISOString()
                },
                lastMessageAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        }).eq('id', convRow.id);

        // Populate sender for the response
        const { data: userRow } = await supabase.from('users').select('data').eq('id', senderId).single();
        const populatedMessage = {
            ...msgRow.data,
            _id: msgRow.id,
            id: msgRow.id,
            createdAt: msgRow.created_at,
            sender: {
                _id: senderId,
                name: userRow?.data?.name,
                avatar: userRow?.data?.avatar
            }
        };

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Message sending failed' });
    }
};

// Get all conversations for the current user
export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('conversations')
            .select('id, data')
            .filter('data->participants', 'cs', `["${userId}"]`)
            .order('data->>lastMessageAt', { ascending: false });

        if (error) {
            console.error('Supabase getConversations error:', error);
            return res.status(500).json({ message: 'Failed to fetch conversations' });
        }

        const mapped = (data || []).map((row: any) => {
            const conv = row?.data || {};
            const unreadMap = conv.unreadCount && typeof conv.unreadCount === 'object' ? conv.unreadCount : {};
            const unreadCount = Number(unreadMap?.[userId] || 0);
            return {
                ...conv,
                _id: row.id,
                id: row.id,
                unreadCount,
            };
        });

        res.json(mapped);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch conversations' });
    }
};

// Get messages for a specific conversation
export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { conversationId } = req.params;

        const { data: convRow, error: convErr } = await supabase.from('conversations').select('id, data').eq('id', conversationId).single();
        if (convErr || !convRow) return res.status(404).json({ message: 'Conversation not found' });
        
        const isParticipant = (convRow.data?.participants || []).some((p: string) => String(p) === String(req.user.id));
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Not authorized to read these messages' });
        }

        const { data: messagesRows, error: msgErr } = await supabase.from('messages')
            .select('id, data, created_at')
            .eq('data->>conversationId', conversationId);

        if (msgErr) throw msgErr;

        let messages = messagesRows || [];
        messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Extract sender Ids for populate
        const senderIds = [...new Set(messages.map(m => m.data?.sender).filter(Boolean))];
        const usersMap = new Map();
        if (senderIds.length > 0) {
            const { data: usersData } = await supabase.from('users').select('id, data').in('id', senderIds);
            (usersData || []).forEach(u => usersMap.set(u.id, u.data));
        }

        const mappedMessages = messages.map(m => {
            const senderData = usersMap.get(m.data?.sender) || {};
            return {
                ...m.data,
                _id: m.id,
                id: m.id,
                createdAt: m.created_at,
                sender: {
                    _id: m.data?.sender,
                    name: senderData.name,
                    avatar: senderData.avatar
                }
            };
        });

        res.json(mappedMessages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

// Mark conversation as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const { data: convRow } = await supabase.from('conversations').select('id, data').eq('id', conversationId).single();
        if (convRow) {
            const isParticipant = (convRow.data?.participants || []).some((p: string) => String(p) === String(userId));
            if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });
            const unreadCountObj = convRow.data?.unreadCount || {};
            unreadCountObj[userId] = 0;
            
            await supabase.from('conversations').update({
                data: { ...convRow.data, unreadCount: unreadCountObj },
                updated_at: new Date().toISOString()
            }).eq('id', conversationId);
        }

        // Mark all messages in this conversation received by this user as read
        const { data: messagesRows } = await supabase.from('messages')
            .select('id, data')
            .eq('data->>conversationId', conversationId)
            .eq('data->>receiver', userId)
            .eq('data->>isRead', 'false');

        if (messagesRows && messagesRows.length > 0) {
            for (const m of messagesRows) {
                await supabase.from('messages').update({
                    data: { ...m.data, isRead: true },
                    updated_at: new Date().toISOString()
                }).eq('id', m.id);
            }
        }

        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to mark as read' });
    }
};
