
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    const { data, error } = await supabase
        .from('public_leads')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Table check error:', error.message);
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
            console.log('Creating public_leads table...');
            // Try to create it if it doesn't exist
            const { error: createError } = await supabase.rpc('exec_sql', {
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
            if (createError) {
                console.error('Failed to create table:', createError.message);
            } else {
                console.log('Table created successfully');
            }
        }
    } else {
        console.log('Table exists');
    }
}

checkTable();
