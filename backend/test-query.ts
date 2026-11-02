import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const userId = "test-user";
    console.log("Running Query 1...");
    const query = supabase.from('events').select('id, data, created_at, updated_at').filter('data->registeredUsers', 'cs', `["${userId}"]`);
    const { data: test1, error: err1 } = await query;
    console.log("Events err:", err1 || "SUCCESS", "Count:", test1?.length);
    
    if (test1 && test1.length > 0) {
        const hostUserIds = [...new Set(test1.map(e => e.data?.hostUser).filter(Boolean))];
        console.log("hostUserIds:", hostUserIds);
        if (hostUserIds.length > 0) {
            const { data: usersData, error: uErr } = await supabase.from('users').select('id, data').in('id', hostUserIds);
            console.log("Users err:", uErr || "SUCCESS");
        }
    }
}

run();
