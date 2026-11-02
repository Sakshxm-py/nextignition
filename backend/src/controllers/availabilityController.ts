import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';

export const getMyAvailability = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('availabilities')
            .select('data')
            .eq('data->>expert', String(req.user.id));

        if (error) {
            console.error('getMyAvailability error:', error);
            throw error;
        }
        
        let result = data ? data.map(d => d.data) : [];
        result.sort((a: any, b: any) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0));
        res.json(result);
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const setAvailability = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { dayOfWeek, slots, unavailableDates } = req.body;

        if (dayOfWeek === undefined || !Array.isArray(slots)) {
            return res.status(400).json({ message: 'dayOfWeek and slots are required' });
        }

        const seen = new Set<string>();
        const uniqueSlots = slots.filter((slot: { startTime: string; endTime: string }) => {
            const key = `${slot.startTime}-${slot.endTime}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const expertId = String(req.user.id);
        const id = `${expertId}_${dayOfWeek}`;
        const availabilityData = {
            expert: expertId,
            dayOfWeek,
            slots: uniqueSlots,
            unavailableDates: unavailableDates || [],
            updatedAt: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('availabilities')
            .upsert([{ id, data: availabilityData }])
            .select()
            .single();

        if (error) throw error;
        res.json(data.data);
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const deleteAvailability = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { dayOfWeek } = req.params;
        const expertId = String(req.user.id);
        const id = `${expertId}_${dayOfWeek}`;

        const { error } = await supabase
            .from('availabilities')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Availability deleted' });
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getExpertAvailability = async (req: Request, res: Response) => {
    try {
        const { expertId } = req.params;
        const { data, error } = await supabase
            .from('availabilities')
            .select('data')
            .eq('data->>expert', String(expertId));

        if (error) {
            console.error('getExpertAvailability error:', error);
            throw error;
        }
        
        let result = data ? data.map(d => d.data) : [];
        result.sort((a: any, b: any) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0));
        res.json(result);
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getSpecificDateAvailability = async (req: Request, res: Response) => {
    try {
        const { expertId, date } = req.params;
        const expertIdStr = String(expertId);
        const id = `${expertIdStr}_${date}`;
        
        const { data, error } = await supabase
            .from('specific_availabilities')
            .select('data')
            .eq('id', id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            return res.json({ date, slots: data.data.slots });
        }
        
        res.json({ date, slots: [] });
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getSpecificDateSlots = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const { data, error } = await supabase
            .from('specific_availabilities')
            .select('data')
            .eq('data->>expert', String(req.user.id));

        if (error) throw error;
        res.json(data ? data.map(d => d.data) : []);
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const setSpecificDateSlots = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const { date, slots } = req.body;
        
        if (!date || !Array.isArray(slots)) {
            return res.status(400).json({ message: 'date and slots are required' });
        }
        
        const seen = new Set<string>();
        const uniqueSlots = slots.filter((slot: { startTime: string; endTime: string }) => {
            const key = `${slot.startTime}-${slot.endTime}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const userId = String(req.user.id);
        const id = `${userId}_${date}`;
        const specificData = {
            expert: userId,
            date,
            slots: uniqueSlots,
            updatedAt: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('specific_availabilities')
            .upsert([{ id, data: specificData }])
            .select()
            .single();
        
        if (error) throw error;
        res.json(data.data);
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const deleteSpecificDateSlots = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const { date } = req.params;
        const userId = String(req.user.id);
        const id = `${userId}_${date}`;
        
        const { error } = await supabase
            .from('specific_availabilities')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        res.json({ message: 'Specific date slots deleted' });
    } catch (error: any) {
        return res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

