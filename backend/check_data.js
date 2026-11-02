
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    try {
        console.log('--- Users ---');
        const { data: users, error: uError } = await supabase.from('users').select('id, data').limit(100);
        if (uError) console.error(uError);
        users?.forEach(u => console.log(`ID: ${u.id}, Name: ${u.data.name}, Avatar: ${u.data.avatar}`));

        console.log('\n--- Posts ---');
        const { data: posts, error: pError } = await supabase.from('posts').select('id, data').limit(10);
        if (pError) console.error(pError);
        posts?.forEach(p => {
            const author = p.data.author;
            console.log(`ID: ${p.id}, Author: ${JSON.stringify(author)}, Content: ${p.data.content?.substring(0, 50)}...`);
        });
    } catch (e) {
        console.error(e);
    }
}

checkData();
