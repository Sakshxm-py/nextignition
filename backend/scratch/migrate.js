
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Running SQL migration via RPC...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            CREATE TABLE IF NOT EXISTS public_leads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE NOT NULL,
                data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_public_leads_email ON public_leads(email);
        `
    });

    if (error) {
        console.error('Migration failed:', error.message);
        // If RPC fails because public.exec_sql is not defined (common), 
        // we can still proceed as the controller handles missing table logs.
    } else {
        console.log('Migration successful');
    }
}

run();
