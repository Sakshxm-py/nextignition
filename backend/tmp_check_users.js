require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('users').select('id, data');
    if (error) console.error(error);
    else {
        data.forEach(u => {
            if (JSON.stringify(u.data).toLowerCase().includes('invest')) {
                console.log(JSON.stringify(u.data, null, 2));
            }
        });
    }
    process.exit();
}
check();
