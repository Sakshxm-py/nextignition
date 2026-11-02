import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Searching for 'Demo Day' in all tables...");
    const tables = ['events', 'startups', 'communities', 'posts', 'news_articles', 'podcast_episodes', 'funding_applications'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('id, data').limit(100);
        if (error) {
            console.log(`Table ${table} error: ${error.message}`);
            continue;
        }
        const matches = data.filter(row => JSON.stringify(row.data).toLowerCase().includes('demo day'));
        if (matches.length > 0) {
            console.log(`Found ${matches.length} matches in ${table}:`);
            console.log(JSON.stringify(matches, null, 2));
        }
    }
}

run();
