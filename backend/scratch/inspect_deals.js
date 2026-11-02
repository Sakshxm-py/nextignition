const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const tables = ['deal_rooms', 'funding_applications'];
  for (const table of tables) {
    console.log(`--- ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Error reading ${table}:`, error.message);
    } else if (data.length === 0) {
      console.log(`Table ${table} is empty.`);
    } else {
      console.log(`Record columns/keys for ${table}:`, Object.keys(data[0]));
      console.log(`Sample record:`, JSON.stringify(data[0], null, 2));
    }
  }
}

inspect().catch(console.error);
