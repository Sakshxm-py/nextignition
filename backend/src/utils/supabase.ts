import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Supabase configuration is incomplete. Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
        'environment variables are required.\n' +
        `SUPABASE_URL: ${supabaseUrl ? 'set' : 'MISSING'}\n` +
        `SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? 'set' : 'MISSING'}`
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
