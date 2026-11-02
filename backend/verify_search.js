require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
    console.log('Testing Admin User Search Query...');
    const search = 'investor';
    
    const { data: rows, count, error } = await supabase
        .from('users')
        .select('id, data', { count: 'exact' })
        .or(`data->>name.ilike.%${search}%,data->>email.ilike.%${search}%,data->>role.ilike.%${search}%`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Search error:', error);
    } else {
        console.log(`Found ${rows.length} users matching "${search}" (Count: ${count})`);
        rows.forEach(r => {
            console.log(`- ID: ${r.id}, Name: ${r.data.name}, Email: ${r.data.email}, Role: ${r.data.role}`);
        });
    }
    process.exit();
}

test();
