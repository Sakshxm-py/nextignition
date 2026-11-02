require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkUser() {
    console.log('Searching for users related to "investor"...');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, data');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    const filtered = users.filter(u => {
        const d = u.data || {};
        const str = JSON.stringify(d).toLowerCase();
        return str.includes('investor');
    });

    console.log(`Found ${filtered.length} users matching "investor":`);
    filtered.forEach(u => {
        console.log(`- ID: ${u.id}, Name: ${u.data.name}, Email: ${u.data.email}, Role: ${u.data.role}`);
    });
}

checkUser();
