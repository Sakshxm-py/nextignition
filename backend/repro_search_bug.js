require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSearch(search) {
    console.log(`[Test] Searching for "${search}"...`);
    
    // Attempt the exact query used in adminController.ts
    const { data: rows, count, error } = await supabase
        .from('users')
        .select('id, data', { count: 'exact' })
        .or(`data->>name.ilike.%${search}%,data->>email.ilike.%${search}%,data->>role.ilike.%${search}%,data->>username.ilike.%${search}%`);

    if (error) {
        console.error('Search error:', JSON.stringify(error, null, 2));
    } else {
        console.log(`Found ${rows.length} users (Total: ${count}):`);
        rows.forEach(r => {
            console.log(`- ID: ${r.id}, Name: ${r.data?.name}, Email: ${r.data?.email}`);
        });
    }
}

async function run() {
    await testSearch('investor');
    await testSearch('admin');
    process.exit();
}

run();
