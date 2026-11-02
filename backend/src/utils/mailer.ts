import { Resend } from 'resend';

type SendMailInput = {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
};

const getResendClient = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured in .env');
    }
    return new Resend(apiKey);
};

export const sendEmail = async (input: SendMailInput) => {
    const resend = getResendClient();

    console.log('[Mailer] Sending email:', {
        from: 'noreply@nextignition.com',
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
    });

    const payload: any = {
        from: 'noreply@nextignition.com',
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
    };

    if (input.html) {
        payload.html = input.html;
    } else if (input.text) {
        payload.text = input.text;
    }

    const result = await resend.emails.send(payload);

    console.log('[Mailer] API Response:', result);

    if (result.error) {
        console.error('[Mailer] ❌ Resend API Error:', result.error);
        throw new Error(`Resend API error: ${result.error.message}`);
    }

    console.log('[Mailer] ✅ Email sent with ID:', result.data?.id);
    return result;
};
