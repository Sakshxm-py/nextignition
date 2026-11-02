// Creates saved_items table via Supabase REST API
const https = require('https');

const SUPABASE_URL = 'https://btxdxwyvloucxdfjlfhb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eGR4d3l2bG91Y3hkZmpsZmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxNjA1OCwiZXhwIjoyMDg4MjkyMDU4fQ.3bqRew_ZwhhiFWHQXq3gGMPQic_LdQ5fRATPZ61imq8';

const sql = `
CREATE TABLE IF NOT EXISTS public.saved_items (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'post',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_id, item_type)
);
ALTER TABLE public.saved_items DISABLE ROW LEVEL SECURITY;
`;

const body = JSON.stringify({ query: sql });

const options = {
  hostname: 'btxdxwyvloucxdfjlfhb.supabase.co',
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Length': Buffer.byteLength(body),
  },
};

// Try using the pg endpoint instead
const pgOptions = {
  hostname: 'btxdxwyvloucxdfjlfhb.supabase.co',
  path: '/pg/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Length': Buffer.byteLength(body),
  },
};

function postRequest(opts, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Try the Supabase SQL endpoint
  const sqlBody = JSON.stringify({ query: sql });
  
  // Use supabase-js approach instead
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    db: { schema: 'public' }
  });

  // Use the rpc approach with raw SQL
  let data = null, error = null;
  try {
    const res = await supabase.rpc('exec', { sql_query: sql });
    data = res.data;
    error = res.error;
  } catch (err) {
    error = { message: 'rpc not available', details: err.message };
  }
  
  if (error) {
    console.log('RPC exec not available. Trying direct insert to test table existence...');
    
    // Try inserting a test row to see if table exists
    const { error: insertErr } = await supabase
      .from('saved_items')
      .insert({ user_id: 'test', item_id: 'test', item_type: 'test' });
    
    if (insertErr && insertErr.message.includes('not found') || insertErr?.code === '42P01') {
      console.log('❌ Table does not exist. Please run this SQL manually in Supabase SQL Editor:');
      console.log(sql);
    } else if (insertErr) {
      // The table exists but insert failed for another reason (e.g. unique constraint)
      console.log('✅ Table appears to exist! Error was:', insertErr.message);
      // Clean up test row
      await supabase.from('saved_items').delete().eq('user_id', 'test').eq('item_id', 'test');
    } else {
      console.log('✅ Table exists and is writable!');
      await supabase.from('saved_items').delete().eq('user_id', 'test').eq('item_id', 'test');
    }
  } else {
    console.log('✅ Table created successfully!', data);
  }
}

main().catch(console.error);
