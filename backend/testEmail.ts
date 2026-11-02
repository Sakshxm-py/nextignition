import 'dotenv/config';
import { sendEmail } from './src/utils/mailer';

async function test() {
    const to = process.argv[2];
    if (!to) {
        console.error('Please provide an email address as an argument.');
        console.error('Usage: npx ts-node testEmail.ts <your-email@example.com>');
        process.exit(1);
    }

    try {
        console.log(`Sending test email to ${to}...`);
        const result = await sendEmail({
            to,
            subject: 'Test Email from NextIgnition',
            text: 'Hello! This is a test email to verify the Resend configuration.',
            html: '<p>Hello! This is a <b>test email</b> to verify the Resend configuration.</p>',
        });
        console.log('Success:', result);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

test();
