import { Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from './notificationController';
import crypto from 'crypto';

const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

export const createBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { expert, date, startTime, duration, topic, notes } = req.body;
        const expertId = String(expert);

        if (!expert || !date || !startTime || !duration) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const bookingDate = new Date(date);
        if (Number.isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date' });
        }
        const dayOfWeek = bookingDate.getDay();
        const normalizedDateStr = bookingDate.toISOString().split('T')[0];
        const requestedStartTime = startTime;
        const requestedEndTime = addMinutesToTime(startTime, duration);

        const isServiceBooking = req.body.isServiceBooking === true;

        if (!isServiceBooking) {
            // Check specific date availability
            const specificId = `${expertId}_${normalizedDateStr}`;
            const { data: specificDateEntry } = await supabase
                .from('specific_availabilities')
                .select('data')
                .eq('id', specificId)
                .single();
            
            let availableSlot: { startTime: string; endTime: string } | undefined;
            
            if (specificDateEntry && specificDateEntry.data.slots?.length > 0) {
                availableSlot = specificDateEntry.data.slots.find((slot: any) => slot.startTime === requestedStartTime);
            } else {
                // Fallback to weekly schedule
                const { data: availability } = await supabase
                    .from('availabilities')
                    .select('data')
                    .eq('id', `${expertId}_${dayOfWeek}`)
                    .single();
                
                if (!availability) {
                    return res.status(400).json({ message: 'Expert is not available on this day' });
                }

                const unavailableDates = availability.data.unavailableDates || [];
                if (unavailableDates.some((u: string) => new Date(u).toDateString() === bookingDate.toDateString())) {
                    return res.status(400).json({ message: 'Expert is unavailable on this date' });
                }

                availableSlot = (availability.data.slots || []).find((slot: any) => slot.startTime === requestedStartTime);
            }

            if (!availableSlot) {
                return res.status(400).json({ message: 'Requested time slot is not available' });
            }

            const slotEndMinutes = timeToMinutes(String(availableSlot.endTime));
            if (timeToMinutes(requestedEndTime) > slotEndMinutes) {
                return res.status(400).json({ message: 'Requested duration exceeds available slot time' });
            }
        }

        // Conflict check
        const { data: existingBookings } = await supabase
            .from('bookings')
            .select('data')
            .eq('data->>expert', expertId)
            .eq('data->>bookingDate', normalizedDateStr)
            .in('data->>status', ['pending', 'confirmed']);

        const reqStartMin = timeToMinutes(requestedStartTime);
        const reqEndMin = timeToMinutes(requestedEndTime);
        const overlaps = (existingBookings || []).some((b: any) => {
            const bData = b.data;
            const bStartMin = timeToMinutes(String(bData.startTime));
            const bEndMin = bStartMin + Number(bData.duration || 0);
            return reqStartMin < bEndMin && bStartMin < reqEndMin;
        });
        if (overlaps) {
            return res.status(400).json({ message: 'Time slot is already booked' });
        }

        // Only one active booking per founder per expert
        const { data: existingActive } = await supabase
            .from('bookings')
            .select('id')
            .eq('data->>founder', req.user.id)
            .eq('data->>expert', expertId)
            .in('data->>status', ['pending', 'confirmed'])
            .single();

        if (existingActive) {
            return res.status(400).json({ message: 'You already have an active booking with this expert.' });
        }

        const id = crypto.randomUUID();
        const bookingData = {
            id,
            founder: req.user.id,
            expert: expertId,
            date: bookingDate.toISOString(),
            bookingDate: normalizedDateStr,
            startTime: requestedStartTime,
            duration,
            status: 'pending',
            topic,
            notes,
            createdAt: new Date().toISOString()
        };

        const { data: booking, error } = await supabase
            .from('bookings')
            .insert([{ id, data: bookingData }])
            .select()
            .single();

        if (error) throw error;

        // Notifications
        await createNotification(
            String(req.user.id),
            'booking',
            'Session booked',
            `Your session with the expert is booked for ${bookingDate.toDateString()} at ${requestedStartTime}.`,
            '/dashboard?tab=sessions',
            expertId
        );
        await createNotification(
            expertId,
            'booking',
            'New session booking',
            `You have a new session booking for ${bookingDate.toDateString()} at ${requestedStartTime}.`,
            '/dashboard?tab=sessions',
            String(req.user.id)
        );

        res.status(201).json(booking.data);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
    try {
        let query = supabase.from('bookings').select('data');
        if (req.user.role === 'founder') {
            query = query.eq('data->>founder', req.user.id);
        } else if (req.user.role === 'expert') {
            query = query.eq('data->>expert', req.user.id);
        }

        const { data, error } = await query;
        if (error) {
            console.error('getMyBookings error:', error);
            throw error;
        }

        const bookings = data ? data.map(d => d.data) : [];
        bookings.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Manual population
        const userIds = Array.from(new Set([
            ...bookings.map(b => b.founder),
            ...bookings.map(b => b.expert)
        ]));

        const { data: users } = await supabase
            .from('users')
            .select('id, data')
            .in('id', userIds);

        const userMap = new Map();
        users?.forEach(u => {
            userMap.set(u.id, {
                _id: u.id,
                name: u.data.name,
                avatar: u.data.avatar
            });
        });

        const populated = bookings.map(b => ({
            ...b,
            founder: userMap.get(b.founder) || { _id: b.founder, name: 'Unknown' },
            expert: userMap.get(b.expert) || { _id: b.expert, name: 'Unknown' }
        }));

        res.json(populated);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const { data: bookingRow, error: fetchError } = await supabase
            .from('bookings')
            .select('data')
            .eq('id', id)
            .single();

        if (fetchError || !bookingRow) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const updatedData = { ...bookingRow.data, status, updatedAt: new Date().toISOString() };
        
        const { data: updatedRow, error: updateError } = await supabase
            .from('bookings')
            .update({ data: updatedData })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        const booking = updatedRow.data;
        const bookingDate = new Date(booking.date);
        const time = booking.startTime;
        const founderId = String(booking.founder);
        const expertId = String(booking.expert);

        const statusLabel = String(status || '').toLowerCase();
        await createNotification(
            founderId,
            'booking',
            'Booking updated',
            `Your booking for ${bookingDate.toDateString()} at ${time} is now ${statusLabel}.`,
            '/dashboard?tab=sessions',
            expertId
        );
        await createNotification(
            expertId,
            'booking',
            'Booking updated',
            `A booking for ${bookingDate.toDateString()} at ${time} is now ${statusLabel}.`,
            '/dashboard?tab=sessions',
            founderId
        );

        res.json(booking);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

