import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

export const matchExperts = async (req: AuthRequest, res: Response) => {
    try {
        const startupId = req.params.startupId;
        const { data: startupRow, error: fetchErr } = await supabase.from('startups').select('id, data').eq('id', startupId).single();

        if (fetchErr || !startupRow) {
            return res.status(404).json({ message: 'Startup not found' });
        }

        const industry = startupRow.data?.industry || '';

        // Basic matching logic based on industry and skills
        const { data: expertRows, error } = await supabase.from('users')
            .select('id, data, created_at, updated_at')
            .eq('data->>role', 'expert');
            
        if (error) throw error;

        let experts = expertRows || [];
        
        if (industry) {
            experts = experts.filter(e => {
                const exInd = e.data?.profile?.expertise || '';
                const skills = e.data?.profile?.skills || [];
                return exInd === industry || skills.includes(industry);
            });
        }

        experts = experts.slice(0, 10);
        
        const mapped = experts.map(e => ({ ...e.data, _id: e.id, id: e.id }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
