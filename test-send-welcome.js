require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testWelcomeEmail() {
  try {
    console.log('📧 Sending welcome email...\n');
    
    const result = await resend.emails.send({
      from: 'noreply@nextignition.com',
      to: 'delivered@resend.dev',  // Resend test inbox
      subject: 'Welcome to NextIgnition! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
            <h1 style="color: #2563eb; font-size: 28px; margin: 0;">Welcome to NextIgnition! 🚀</h1>
          </div>
          <div style="padding: 24px 0; color: #1f2937; line-height: 1.7;">
            <h2 style="font-size: 20px; margin-top: 0;">Hello John,</h2>
            <p>We're thrilled to have you join our ecosystem of founders, experts, and investors. Your account is now <strong>fully active</strong></p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://nextignition.com" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
            </div>
          </div>
        </div>`
    });

    if (result.error) {
      console.error('❌ Error:', result.error);
    } else {
      console.log('✅ Welcome email sent successfully!');
      console.log('📧 Email ID:', result.data.id);
      console.log('\n📍 From: noreply@nextignition.com');
      console.log('🎯 To: Users email when they create profile');
      console.log('\n✨ Check Resend dashboard for delivery status');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWelcomeEmail();
