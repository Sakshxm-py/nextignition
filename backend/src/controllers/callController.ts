import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { io } from '../utils/socket';
import { createNotification } from './notificationController';
import crypto from 'crypto';

const VALID_CALL_TYPES = ['voice', 'video'];
const VALID_STATUSES = ['accepted', 'declined', 'ended', 'missed'];

/**
 * Initiate a voice/video call. There is no media server, so this records the
 * call attempt, notifies the callee (in-app bell + real-time `incoming_call`
 * socket event), and returns a callId the clients can use to signal status.
 */
export const initiateCall = async (req: AuthRequest, res: Response) => {
    try {
        const me = String(req.user?.id || '');
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const to = String(req.body?.to || '');
        const type = String(req.body?.type || 'voice');
        if (!to) return res.status(400).json({ message: 'to is required' });
        if (me === to) return res.status(400).json({ message: 'You cannot call yourself' });
        if (!VALID_CALL_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid call type' });

        const { data: callee } = await supabase.from('users').select('id').eq('id', to).single();
        if (!callee) return res.status(404).json({ message: 'User not found' });

        // Don't connect a call if either party has blocked the other.
        const { data: blocks } = await supabase
            .from('user_blocks')
            .select('id')
            .in('id', [`${to}_${me}`, `${me}_${to}`]);
        if ((blocks?.length || 0) > 0) {
            return res.status(403).json({ message: 'Unable to start a call with this user' });
        }

        const callId = crypto.randomUUID();
        const now = new Date().toISOString();
        await supabase
            .from('call_logs')
            .insert([{ id: callId, data: { id: callId, from: me, to, type, status: 'ringing', createdAt: now }, created_at: now }]);

        const { data: meRow } = await supabase.from('users').select('data').eq('id', me).single();
        const myName = meRow?.data?.name || 'Someone';

        await createNotification(
            to,
            'call',
            `Incoming ${type} call`,
            `${myName} is starting a ${type} call with you.`,
            undefined,
            me,
            { callId, callType: type }
        );

        // Real-time ring — delivered to the callee's socket room if they're online.
        io.to(`user:${to}`).emit('incoming_call', {
            callId,
            type,
            from: { id: me, name: myName, avatar: meRow?.data?.avatar },
            createdAt: now,
        });

        return res.status(201).json({ ok: true, callId, status: 'ringing' });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to start call', error: error?.message });
    }
};

/** Update a call's lifecycle status (accepted / declined / ended / missed). */
export const updateCallStatus = async (req: AuthRequest, res: Response) => {
    try {
        const me = String(req.user?.id || '');
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const callId = String(req.params.callId || '');
        const status = String(req.body?.status || '');
        if (!VALID_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });

        const { data: existing } = await supabase.from('call_logs').select('data').eq('id', callId).single();
        if (!existing) return res.status(404).json({ message: 'Call not found' });
        if (existing.data?.from !== me && existing.data?.to !== me) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updated = { ...existing.data, status, updatedAt: new Date().toISOString() };
        await supabase.from('call_logs').update({ data: updated }).eq('id', callId);

        const otherId = existing.data?.from === me ? existing.data?.to : existing.data?.from;
        io.to(`user:${otherId}`).emit('call_status', { callId, status });

        return res.json({ ok: true, status });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to update call', error: error?.message });
    }
};
