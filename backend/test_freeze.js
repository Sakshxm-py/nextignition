require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
s.from('users').select('id, data').eq('data->>email', 'testfreeze@test.com').then(async res => {
  const row = res.data[0];
  const updated = { ...row.data, isFrozen: true };
  await s.from('users').update({ data: updated }).eq('id', row.id);
  console.log('frozen test user');
  process.exit(0);
});
