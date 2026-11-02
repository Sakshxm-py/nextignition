import 'dotenv/config';
import { supabase } from './src/utils/supabase';
import { sendEmail } from './src/utils/mailer';

async function sendBlast() {
    console.log("Fetching users from 'users' table...");
    const { data: usersData, error: dbError } = await supabase.from('users').select('data');
    
    if (dbError) {
        console.error("Error fetching users from DB:", dbError);
        process.exit(1);
    } 

    if (!usersData || usersData.length === 0) {
        console.error("No users found.");
        process.exit(0);
    }
    
    console.log(`Found ${usersData.length} users in 'users' table.`);

    // Extract emails from the data json
    const allEmails = usersData
        .map(row => row.data?.email)
        .filter(Boolean) as string[];
    
    console.log("Emails to send:", allEmails);
    
    let successCount = 0;
    for (const email of allEmails) {
        try {
            console.log(`Sending to ${email}...`);
            await sendEmail({
                to: email,
                subject: 'Test Email from NextIgnition',
                text: 'Hello! This is an automated test email from NextIgnition. Please ignore.',
                html: '<p>Hello! This is an automated <b>test email</b> from <b>NextIgnition</b>. Please ignore.</p>'
            });
            successCount++;
        } catch (err) {
            console.error(`Failed for ${email}:`, err);
        }
        // Small delay to prevent rate limit issues
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Finished sending. Success: ${successCount}/${allEmails.length}`);
}

sendBlast();
