require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  try {
    console.log('🔍 Testing Resend API...');
    console.log('API Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
    
    const result = await resend.emails.send({
      from: 'noreply@nextignition.com',
      to: 'delivered@resend.dev',  // Resend test email
      subject: 'NextIgnition Test Email',
      html: '<h1>✅ Resend is working!</h1><p>Your email service is properly configured.</p>'
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Email ID:', result.data?.id);
    return result;
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

test();
