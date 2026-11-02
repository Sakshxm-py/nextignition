import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

async function run() {
    const { data: users, error } = await supabase.from('users').select('id, data');
    if (error) {
        console.error(error);
        return;
    }

    const matching = users?.filter(u => {
        const d = u.data || {};
        const json = JSON.stringify(d).toLowerCase();
        return json.includes('invest');
    });

    console.log(`Found ${matching?.length || 0} users related to "invest":`);
    matching?.forEach(u => {
        console.log(`- ID: ${u.id}, Data:`, JSON.stringify(u.data, null, 2));
    });
}

run();
