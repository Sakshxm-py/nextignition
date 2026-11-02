const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking Supabase DB Schema and Tables...");
  
  // Try querying a dummy query to get table list if possible, or try fetching 1 row from each expected table
  const expectedTables = [
    'users', 'posts', 'startups', 'communities', 'channels', 'community_members',
    'deal_rooms', 'funding_applications', 'investments', 'availabilities', 'bookings',
    'cofounder_profiles', 'saved_items', 'admin_users', 'admin_logs', 'reports', 'platform_settings',
    'public_leads'
  ];

  for (const table of expectedTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${table}': ERROR (${error.message})`);
    } else {
      console.log(`✅ Table '${table}': EXISTS (count limit 1: ${data.length} row)`);
    }
  }
}

check().catch(console.error);
