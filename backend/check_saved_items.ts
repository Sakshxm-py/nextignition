import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('Checking for saved_items table...');
  const { error } = await supabase
    .from('saved_items')
    .select('id')
    .limit(1);

  if (error) {
    if (error.code === '42P01') {
      console.error('table "saved_items" does not exist.');
      console.log('SQL to create:');
      console.log(`
        CREATE TABLE IF NOT EXISTS public.saved_items (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'post',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (user_id, item_id, item_type)
        );
        ALTER TABLE public.saved_items DISABLE ROW LEVEL SECURITY;
      `);
    } else {
      console.error('Error checking table:', error.message);
    }
  } else {
    console.log('Table "saved_items" exists.');
  }
}

checkTable();
