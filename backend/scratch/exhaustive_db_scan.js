const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEMO_KEYWORDS = ['demo', 'test', 'example', 'quantumflow', 'finledger', 'saasstack', 'payrail', 'cliniccloud', 'tradepulse', 'ecotrace', 'neurovibe', 'pitchdeck flow'];

function matchesDemo(val) {
  if (!val) return false;
  const s = String(val).toLowerCase();
  return DEMO_KEYWORDS.some(kw => s.includes(kw));
}

async function scan() {
  console.log("=== EXHAUSTIVE DATABASE SCAN FOR DEMO DATA ===");
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  // 1. Scan Users
  console.log("--- Scanning Users ---");
  const { data: users, error: uErr } = await supabase.from('users').select('id, data, created_at');
  if (uErr) {
    console.error("Error fetching users:", uErr.message);
  } else {
    console.log(`Total users in DB: ${users.length}`);
    const demoUsers = users.filter(u => {
      const email = u.data?.email || '';
      const name = u.data?.name || '';
      return matchesDemo(email) || matchesDemo(name);
    });
    console.log(`Found ${demoUsers.length} potential demo/test users:`);
    demoUsers.forEach(u => {
      console.log(` - ID: ${u.id}, Name: ${u.data?.name}, Email: ${u.data?.email}, Created: ${u.created_at}`);
    });
  }

  // 2. Scan Startups
  console.log("\n--- Scanning Startups ---");
  const { data: startups, error: sErr } = await supabase.from('startups').select('id, data, created_at');
  if (sErr) {
    console.error("Error fetching startups:", sErr.message);
  } else {
    console.log(`Total startups in DB: ${startups.length}`);
    const demoStartups = startups.filter(s => {
      const name = s.data?.name || '';
      return matchesDemo(name);
    });
    console.log(`Found ${demoStartups.length} potential demo startups:`);
    demoStartups.forEach(s => {
      console.log(` - ID: ${s.id}, Name: ${s.data?.name}, Created: ${s.created_at}`);
    });
  }

  // 3. Scan Communities
  console.log("\n--- Scanning Communities ---");
  const { data: comms, error: cErr } = await supabase.from('communities').select('id, data, created_at');
  if (cErr) {
    console.error("Error fetching communities:", cErr.message);
  } else {
    console.log(`Total communities in DB: ${comms.length}`);
    const demoComms = comms.filter(c => {
      const name = c.data?.name || '';
      return matchesDemo(name) || matchesDemo(c.id);
    });
    console.log(`Found ${demoComms.length} potential demo communities:`);
    demoComms.forEach(c => {
      console.log(` - ID: ${c.id}, Name: ${c.data?.name}, Created: ${c.created_at}`);
    });
  }

  // 4. Scan Posts
  console.log("\n--- Scanning Posts ---");
  const { data: posts, error: pErr } = await supabase.from('posts').select('id, data, created_at');
  if (pErr) {
    console.error("Error fetching posts:", pErr.message);
  } else {
    console.log(`Total posts in DB: ${posts.length}`);
    const demoPosts = posts.filter(p => {
      const content = p.data?.content || '';
      const title = p.data?.title || '';
      return matchesDemo(content) || matchesDemo(title);
    });
    console.log(`Found ${demoPosts.length} potential demo/test posts (Note: Production standard deletes ALL posts, or selective ones):`);
    demoPosts.slice(0, 10).forEach(p => {
      console.log(` - ID: ${p.id}, Author: ${p.data?.author}, Content: ${p.data?.content?.substring(0, 60)}...`);
    });
    if (demoPosts.length > 10) {
      console.log(` ... and ${demoPosts.length - 10} more`);
    }
  }

  // 5. Scan Admin Users
  console.log("\n--- Scanning Admin Users ---");
  const { data: admins, error: aErr } = await supabase.from('admin_users').select('id, email, name, role, status, created_at');
  if (aErr) {
    console.error("Error fetching admin users:", aErr.message);
  } else {
    console.log(`Total admin users in DB: ${admins.length}`);
    admins.forEach(a => {
      console.log(` - ID: ${a.id}, Name: ${a.name}, Email: ${a.email}, Role: ${a.role}, Status: ${a.status}, Created: ${a.created_at}`);
    });
  }

  // 6. Scan other tables for general counts
  const tables = [
    'deal_rooms', 'funding_applications', 'investments', 'availabilities', 'bookings',
    'cofounder_profiles', 'saved_items', 'admin_logs', 'reports', 'platform_settings'
  ];
  console.log("\n--- Checking Counts in Other Tables ---");
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(` - ${t}: Error (${error.message})`);
    } else {
      console.log(` - ${t}: ${count} record(s)`);
    }
  }

  console.log("\n=== SCAN COMPLETE ===");
}

scan().catch(e => console.error("Fatal:", e));
