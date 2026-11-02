
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    try {
        const { data: users } = await supabase.from('users').select('id, data');
        console.log('--- Search Results ---');
        users.forEach(u => {
            const name = u.data.name || '';
            if (name.toLowerCase().includes('sanket') || name.toLowerCase().includes('rohan')) {
                console.log(`ID: ${u.id}, Name: ${name}, Avatar: ${u.data.avatar}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

checkData();
