require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
    console.log('Fetching startups...');
    const { data, error } = await supabase.from('startups').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Startups:', JSON.stringify(data, null, 2));
    }
    process.exit();
}
diagnose();
