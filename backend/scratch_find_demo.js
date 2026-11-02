const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEMO_STARTUP_NAMES = [
  'QuantumFlow',
  'FinLedger',
  'SaaSStack',
  'PayRail',
  'ClinicCloud',
  'TradePulse',
  'EcoTrace AI',
  'NeuroVibe',
  'Demo Startup - PitchDeck Flow'
];

async function check() {
  console.log("Searching for demo data in Supabase...");

  // 1. Check startups
  const { data: startups, error: startupError } = await supabase.from('startups').select('id, data');
  if (startupError) {
    console.error("Error startups:", startupError.message);
  } else {
    const demoStartups = (startups || []).filter(s => {
      const name = s.data?.name || '';
      return DEMO_STARTUP_NAMES.some(dn => name.includes(dn)) || 
             name.toLowerCase().includes('demo') || 
             name.toLowerCase().includes('test');
    });
    console.log(`\nStartups: Found ${demoStartups.length} demo startup(s) out of ${(startups || []).length} total:`);
    demoStartups.forEach(s => console.log(` - ID: ${s.id}, Name: ${s.data?.name}`));
  }

  // 2. Check communities
  const { data: communities, error: commError } = await supabase.from('communities').select('id, data');
  if (commError) {
    console.error("Error communities:", commError.message);
  } else {
    const demoComms = (communities || []).filter(c => {
      const name = c.data?.name || '';
      return DEMO_STARTUP_NAMES.some(dn => name.includes(dn)) || 
             name.toLowerCase().includes('demo') || 
             c.id.toLowerCase().includes('demo');
    });
    console.log(`\nCommunities: Found ${demoComms.length} demo community(ies) out of ${(communities || []).length} total:`);
    demoComms.forEach(c => console.log(` - ID: ${c.id}, Name: ${c.data?.name}`));
  }

  // 3. Check posts
  const { data: posts, error: postError } = await supabase.from('posts').select('id, data');
  if (postError) {
    console.error("Error posts:", postError.message);
  } else {
    console.log(`\nPosts: Found ${(posts || []).length} total post(s) in database (all posts are considered demo data for cleanup).`);
  }

  // 4. Check users
  const { data: users, error: userError } = await supabase.from('users').select('id, data');
  if (userError) {
    console.error("Error users:", userError.message);
  } else {
    const demoUsers = (users || []).filter(u => {
      const email = u.data?.email || '';
      return email.toLowerCase().includes('example.com') || email.toLowerCase().includes('demo.com');
    });
    console.log(`\nUsers: Found ${demoUsers.length} demo user(s) out of ${(users || []).length} total:`);
    demoUsers.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.data?.email}, Name: ${u.data?.name}`));
  }
}

check().catch(err => console.error("Fatal:", err));
