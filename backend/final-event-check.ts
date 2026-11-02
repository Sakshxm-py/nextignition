import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching all events from Supabase...");
    const { data: events, error } = await supabase.from('events').select('*');
    if (error) {
        console.log(`Error: ${error.message}`);
    } else {
        console.log(`Found ${events.length} events.`);
        console.log(JSON.stringify(events, null, 2));
    }
}

run();
