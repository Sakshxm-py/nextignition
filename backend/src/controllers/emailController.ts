import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendEmail } from '../utils/mailer';

// Minimal internal endpoint for testing SMTP configuration.
// Not intended for production exposure.
export const sendTestEmail = async (req: AuthRequest, res: Response) => {
    try {
        const { to, subject, text, html } = req.body as {
            to?: string | string[];
            subject?: string;
            text?: string;
            html?: string;
        };

        if (!to || !subject) {
            return res.status(400).json({ message: 'to and subject are required' });
        }

        await sendEmail({
            to,
            subject,
            text,
            html,
        });

        return res.json({ sent: true });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to send email', error: error?.message });
    }
};
