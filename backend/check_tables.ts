import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTables() {
    const tables = ['knowledge_content', 'knowledge_hub', 'startup_resources', 'posts', 'users', 'podcast_episodes'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (error) {
            console.log(`Table '${t}': MISSING (${error.message})`);
        } else {
            console.log(`Table '${t}': EXISTS`);
        }
    }
}
checkTables();
