require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSearch() {
    const search = 'investor';
    console.log(`Searching for "${search}" across all users...`);
    
    // This replicates the logic now in adminController.ts
    const { data: rows, count, error } = await supabase
        .from('users')
        .select('id, data', { count: 'exact' })
        .or(`data->>name.ilike.%${search}%,data->>email.ilike.%${search}%,data->>role.ilike.%${search}%`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Search error:', error);
        return;
    }

    console.log(`Found ${rows.length} users (Total count: ${count}):`);
    rows.forEach(r => {
        console.log(`- ID: ${r.id}, Name: ${r.data.name}, Email: ${r.data.email}, Role: ${r.data.role}`);
    });
    
    if (rows.length === 0) {
        console.log('No users found. Let\'s check all users to see what exists.');
        const { data: all } = await supabase.from('users').select('id, data').limit(10);
        console.log('Sample of users in DB:', JSON.stringify(all, null, 2));
    }
}

testSearch();
