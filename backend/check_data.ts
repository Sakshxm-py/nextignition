
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkData() {
    console.log('--- Users ---');
    const { data: users } = await supabase.from('users').select('id, data').limit(10);
    users?.forEach((u: any) => console.log(`ID: ${u.id}, Name: ${u.data?.name}, Avatar: ${u.data?.avatar}`));

    console.log('\n--- Posts ---');
    const { data: posts } = await supabase.from('posts').select('id, data').limit(5);
    posts?.forEach((p: any) => console.log(`ID: ${p.id}, Author: ${p.data?.author}, Content Summary: ${p.data?.content?.substring(0, 30)}...`));
}

checkData();
