require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function listUsers() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, data')
        .limit(50);

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Checking ${users.length} users...`);
    users.forEach(u => {
        const d = u.data || {};
        console.log(`ID: ${u.id} | Name: "${d.name}" | Email: "${d.email}" | Role: "${d.role}" | Username: "${d.username}"`);
    });
    process.exit();
}

listUsers();
