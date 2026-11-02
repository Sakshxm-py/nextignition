const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // We'll create the tables using raw SQL if possible, or via a remote RPC if available.
  // Wait, Supabase JS client cannot execute arbitrary DDL queries directly unless we use an RPC.
  // Instead, let's just log the SQL the user needs to run, or we can use the postgres connection string if available.
  
  // Let's check if the connection string is available
  console.log("To create the tables, please run the following SQL in your Supabase SQL Editor:");
  console.log(`
CREATE TABLE IF NOT EXISTS public.admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'SECONDARY_ADMIN',
  status VARCHAR NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  admin_id VARCHAR NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  module VARCHAR NOT NULL,
  target_id VARCHAR,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Note: We also need a seed PRIMARY admin since we're transitioning from .env
-- INSERT INTO public.admin_users (name, email, password_hash, role, status) VALUES ('Super Admin', 'admin@nextignition.io', '$2b$10$...', 'PRIMARY_ADMIN', 'ACTIVE');
  `);
}

run();
