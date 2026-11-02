import { supabase } from './src/utils/supabase';

async function test() {
    console.log('Testing Admin User Search Query...');
    const search = 'investor';
    
    // Attempt with current syntax
    console.log('--- Current Syntax ---');
    const { data: d1, error: e1 } = await supabase
        .from('users')
        .select('id, data')
        .or(`data->>name.ilike.%${search}%,data->>email.ilike.%${search}%,data->>role.ilike.%${search}%,data->>username.ilike.%${search}%`)
        .limit(5);

    if (e1) console.error('Current Syntax Error:', e1);
    else console.log('Current Result Count:', d1?.length);

    // Attempt with parentheses (often required for PostgREST parsing of JSONB in OR)
    console.log('--- Parentheses Syntax ---');
    const { data: d2, error: e2 } = await supabase
        .from('users')
        .select('id, data')
        .or(`data->>name.ilike.%${search}%,data->>email.ilike.%${search}%,data->>role.ilike.%${search}%,data->>username.ilike.%${search}%`)
        // Wait, some docs say use double quotes for the path if it contains ->>
        .limit(5);

    // Actually, let's try a different approach: multiple separate filters if possible? 
    // No, OR must be one call.
    
    process.exit();
}

test();
