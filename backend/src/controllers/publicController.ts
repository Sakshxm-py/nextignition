import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { getGlobalSettings } from '../utils/settingsService';

export const getPlatformStats = async (_req: Request, res: Response) => {
    try {
        // 1. Get all users to count by role
        // For performance in a real app, we would use a simpler count query or a cached value.
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('data');

        if (userError) throw userError;

        let foundersCount = 0;
        let mentorsCount = 0;
        let investorsCount = 0;

        (users || []).forEach((user: any) => {
            const role = user.data?.role;
            if (role === 'founder') foundersCount++;
            else if (role === 'expert') mentorsCount++;
            else if (role === 'investor') investorsCount++;
        });

        // 2. Get total funding / revenue
        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('data')
            .eq('data->>status', 'paid');

        let totalRevenue = 0;
        if (!payError && payments) {
            totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.data?.amount || 0), 0) / 100;
        }

        // 3. Get total startups count
        const { count: startupsCount, error: startupError } = await supabase
            .from('startups')
            .select('*', { count: 'exact', head: true });

        // Calculate a more "relevant" display for the landing page
        const stats = {
            startups: (startupsCount || foundersCount || 0).toString(),
            totalUsers: (((users || []).length) || (foundersCount + mentorsCount + investorsCount) || 0).toString(),
            mentors: (mentorsCount || 0).toString(),
            investors: (investorsCount || 0).toString(),
            funding: totalRevenue > 0 ? `$${(totalRevenue / 1000000).toFixed(1)}M` : '$0',
            successRate: '0%' // Since we have no historical success rate data, default to 0% instead of fake 92%
        };

        res.json(stats);
    } catch (error: any) {
        console.error('[PublicController] getPlatformStats error:', error);
        // Fallback to 0s if DB fails
        res.json({
            startups: '0',
            totalUsers: '0',
            successRate: '0%',
            funding: '$0',
            mentors: '0',
            investors: '0'
        });
    }
};

export const getPublicSettings = async (_req: Request, res: Response) => {
    try {
        const settings = await getGlobalSettings();
        // Return only non-sensitive settings
        res.json({
            maintenanceMode: settings.maintenanceMode,
            allowRegistration: settings.allowRegistration,
            supportEmail: settings.supportEmail
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch platform settings' });
    }
};

// POST /api/public/contact — store a Contact Us form submission.
export const submitContactMessage = async (req: Request, res: Response) => {
    try {
        const { name, email, company, subject, message } = req.body || {};
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email and message are required.' });
        }

        const data = {
            name: String(name).trim().slice(0, 200),
            email: String(email).trim().slice(0, 200),
            company: String(company || '').trim().slice(0, 200),
            subject: String(subject || '').trim().slice(0, 200),
            message: String(message).trim().slice(0, 5000),
            status: 'new',
            submittedAt: new Date().toISOString(),
        };

        const { error } = await supabase.from('contact_messages').insert([{ data }]);
        if (error) throw error;

        res.status(201).json({ success: true, message: 'Message received. We will get back to you soon.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to submit message', error: error?.message });
    }
};
