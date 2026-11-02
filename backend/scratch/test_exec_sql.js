const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing RPC 'exec_sql'...");
  const { data: res1, error: err1 } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1 as val;' });
  if (err1) {
    console.log("exec_sql failed:", err1.message);
  } else {
    console.log("exec_sql worked! Result:", res1);
    return;
  }

  console.log("Testing RPC 'exec'...");
  const { data: res2, error: err2 } = await supabase.rpc('exec', { sql_query: 'SELECT 1 as val;' });
  if (err2) {
    console.log("exec failed:", err2.message);
  } else {
    console.log("exec worked! Result:", res2);
    return;
  }
}

test().catch(console.error);
