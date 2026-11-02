require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
    console.log('Testing Supabase OR search with JSONB...');
    const search = 'investor';
    
    // Attempt 1: The current logic
    console.log('--- Attempt 1 (Current) ---');
    const { data: d1, error: e1 } = await supabase
        .from('users')
        .select('id, data')
        .or(`data->>name.ilike.%${search}%,data->>email.ilike.%${search}%,data->>role.ilike.%${search}%,data->>username.ilike.%${search}%`)
        .limit(5);

    if (e1) console.error('Attempt 1 Error:', JSON.stringify(e1, null, 2));
    else console.log('Attempt 1 Success, found:', d1.length);

    // Attempt 2: Parentheses around JSONB extraction
    console.log('--- Attempt 2 (Parentheses) ---');
    const { data: d2, error: e2 } = await supabase
        .from('users')
        .select('id, data')
        .or(`(data->>name).ilike.%${search}%,(data->>email).ilike.%${search}%,(data->>role).ilike.%${search}%,(data->>username).ilike.%${search}%`)
        .limit(5);

    if (e2) console.error('Attempt 2 Error:', JSON.stringify(e2, null, 2));
    else console.log('Attempt 2 Success, found:', d2.length);

    process.exit();
}

test();
