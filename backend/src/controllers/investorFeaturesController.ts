import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';

// ============================================================================
// Host Event (Investor/Expert Feature)
// ============================================================================

export const hostEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, description, date, time, location, maxAttendees, eventType } = req.body;

        // Validate inputs
        if (!title || !date) {
            return res.status(400).json({ error: 'Title and date required' });
        }

        // Verify verified investor/expert role
        const { data: user } = await supabase
            .from('users')
            .select('name, roles')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hasVerifiedRole = user.roles?.some(
            (r: any) => (r.type === 'investor' || r.type === 'expert') && r.status === 'verified'
        );

        if (!hasVerifiedRole) {
            return res.status(403).json({
                error: 'Requirement not met',
                message: 'Only verified investors or experts can host events'
            });
        }

        // Create event
        const event = {
            id: crypto.randomUUID(),
            hostId: userId,
            hostName: user.name,
            title,
            description: description || '',
            date,
            time: time || '',
            location: location || 'Virtual',
            maxAttendees: maxAttendees || 50,
            eventType: eventType || 'networking',
            attendees: [],
            attendeeCount: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const { error: insertError } = await supabase
            .from('events')
            .insert([event]);

        if (insertError) {
            console.error('Error creating event:', insertError);
            return res.status(500).json({ error: 'Failed to create event' });
        }

        console.log(`[EVENT] Created by ${user.name}: "${title}" on ${date}`);

        return res.status(201).json({
            success: true,
            message: 'Event created successfully!',
            event
        });
    } catch (error) {
        console.error('Error in hostEvent:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Host Session (Expert/Investor Feature)
// ============================================================================

export const hostSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, description, duration, maxAttendees, sessionType, startTime } = req.body;

        // Validate inputs
        if (!title || !startTime) {
            return res.status(400).json({ error: 'Title and start time required' });
        }

        // Verify verified role
        const { data: user } = await supabase
            .from('users')
            .select('name, roles')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hasVerifiedRole = user.roles?.some(
            (r: any) => r.status === 'verified'
        );

        if (!hasVerifiedRole) {
            return res.status(403).json({
                error: 'Requirement not met',
                message: 'Profile must be verified to host sessions'
            });
        }

        // Create session
        const session = {
            id: crypto.randomUUID(),
            hostId: userId,
            hostName: user.name,
            title,
            description: description || '',
            startTime,
            duration: duration || 60,
            maxAttendees: maxAttendees || 20,
            sessionType: sessionType || 'mentoring',
            attendees: [],
            attendeeCount: 0,
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const { error: insertError } = await supabase
            .from('sessions')
            .insert([session]);

        if (insertError) {
            console.error('Error creating session:', insertError);
            return res.status(500).json({ error: 'Failed to create session' });
        }

        console.log(`[SESSION] Created by ${user.name}: "${title}" at ${startTime}`);

        return res.status(201).json({
            success: true,
            message: 'Session scheduled successfully!',
            session
        });
    } catch (error) {
        console.error('Error in hostSession:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get User's Events
// ============================================================================

export const getMyEvents = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .eq('hostId', userId)
            .order('date', { ascending: true });

        if (error) {
            // Orphaned legacy table/schema in some environments — degrade
            // gracefully (empty list) instead of 500 so discovery still loads.
            console.error('Error fetching events:', error);
            return res.status(200).json({ success: true, events: [], total: 0 });
        }

        return res.status(200).json({
            success: true,
            events: events || [],
            total: events?.length || 0
        });
    } catch (error) {
        console.error('Error in getMyEvents:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get User's Sessions
// ============================================================================

export const getMySessions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('hostId', userId)
            .order('startTime', { ascending: true });

        if (error) {
            // Orphaned legacy table/schema in some environments — degrade
            // gracefully (empty list) instead of 500 so discovery still loads.
            console.error('Error fetching sessions:', error);
            return res.status(200).json({ success: true, sessions: [], total: 0 });
        }

        return res.status(200).json({
            success: true,
            sessions: sessions || [],
            total: sessions?.length || 0
        });
    } catch (error) {
        console.error('Error in getMySessions:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get All Events (Public Discovery)
// ============================================================================

export const getEvents = async (req: Request, res: Response) => {
    try {
        const { eventType, limit = 20, offset = 0 } = req.query;

        let query = supabase
            .from('events')
            .select('*')
            .eq('status', 'active')
            .order('date', { ascending: true });

        if (eventType) {
            query = query.eq('eventType', eventType);
        }

        const { data: events, error } = await query
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (error) {
            // Orphaned legacy table/schema in some environments — degrade
            // gracefully (empty list) instead of 500 so discovery still loads.
            console.error('Error fetching events:', error);
            return res.status(200).json({ success: true, events: [], total: 0 });
        }

        return res.status(200).json({
            success: true,
            events: events || [],
            total: events?.length || 0
        });
    } catch (error) {
        console.error('Error in getEvents:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get All Sessions (Public Discovery)
// ============================================================================

export const getSessions = async (req: Request, res: Response) => {
    try {
        const { sessionType, limit = 20, offset = 0 } = req.query;

        let query = supabase
            .from('sessions')
            .select('*')
            .eq('status', 'scheduled')
            .order('startTime', { ascending: true });

        if (sessionType) {
            query = query.eq('sessionType', sessionType);
        }

        const { data: sessions, error } = await query
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (error) {
            // Orphaned legacy table/schema in some environments — degrade
            // gracefully (empty list) instead of 500 so discovery still loads.
            console.error('Error fetching sessions:', error);
            return res.status(200).json({ success: true, sessions: [], total: 0 });
        }

        return res.status(200).json({
            success: true,
            sessions: sessions || [],
            total: sessions?.length || 0
        });
    } catch (error) {
        console.error('Error in getSessions:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// RSVP to Event
// ============================================================================

export const rsvpEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { eventId } = req.params;

        const { data: event, error: fetchError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (fetchError || !event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if already attending
        if (event.attendees?.includes(userId)) {
            return res.status(400).json({ error: 'Already registered for this event' });
        }

        // Check capacity
        if (event.attendees?.length >= event.maxAttendees) {
            return res.status(400).json({ error: 'Event is full' });
        }

        // Add attendee
        const updatedAttendees = [...(event.attendees || []), userId];

        const { error: updateError } = await supabase
            .from('events')
            .update({
                attendees: updatedAttendees,
                attendeeCount: updatedAttendees.length,
                updatedAt: new Date().toISOString()
            })
            .eq('id', eventId);

        if (updateError) {
            console.error('Error updating event:', updateError);
            return res.status(500).json({ error: 'Failed to register for event' });
        }

        return res.status(200).json({
            success: true,
            message: 'Successfully registered for event!',
            attendeeCount: updatedAttendees.length
        });
    } catch (error) {
        console.error('Error in rsvpEvent:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// RSVP to Session
// ============================================================================

export const rsvpSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { sessionId } = req.params;

        const { data: session, error: fetchError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (fetchError || !session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check if already attending
        if (session.attendees?.includes(userId)) {
            return res.status(400).json({ error: 'Already registered for this session' });
        }

        // Check capacity
        if (session.attendees?.length >= session.maxAttendees) {
            return res.status(400).json({ error: 'Session is full' });
        }

        // Add attendee
        const updatedAttendees = [...(session.attendees || []), userId];

        const { error: updateError } = await supabase
            .from('sessions')
            .update({
                attendees: updatedAttendees,
                attendeeCount: updatedAttendees.length,
                updatedAt: new Date().toISOString()
            })
            .eq('id', sessionId);

        if (updateError) {
            console.error('Error updating session:', updateError);
            return res.status(500).json({ error: 'Failed to register for session' });
        }

        return res.status(200).json({
            success: true,
            message: 'Successfully registered for session!',
            attendeeCount: updatedAttendees.length
        });
    } catch (error) {
        console.error('Error in rsvpSession:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
