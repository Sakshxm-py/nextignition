const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env');
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

const DEMO_USER_EMAILS = [
  'founder@example.com',
  'investor@example.com',
  'founder@demo.com',
  'investor@demo.com'
];

async function cleanup() {
  console.log('Starting comprehensive demo data cleanup...');

  // 1. Delete Demo Startups
  console.log('Cleaning up startups...');
  for (const name of DEMO_STARTUP_NAMES) {
    const { data: startups, error: fetchError } = await supabase
      .from('startups')
      .select('id')
      .filter('data->>name', 'eq', name);
    
    if (fetchError) {
      console.error(`Error fetching startups named ${name}:`, fetchError.message);
      continue;
    }

    if (startups && startups.length > 0) {
      const ids = startups.map(s => s.id);
      console.log(`Found ${ids.length} instances of "${name}". Deleting...`);
      const { error: deleteError } = await supabase
        .from('startups')
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        console.error(`Error deleting ${name}:`, deleteError.message);
      } else {
        console.log(`Successfully deleted "${name}".`);
      }
    }
  }

  // 2. Delete Demo Users
  console.log('\nCleaning up users...');
  for (const email of DEMO_USER_EMAILS) {
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .filter('data->>email', 'eq', email);

    if (fetchError) {
      console.error(`Error fetching user ${email}:`, fetchError.message);
      continue;
    }

    if (users && users.length > 0) {
      const ids = users.map(u => u.id);
      console.log(`Found ${ids.length} instances of user "${email}". Deleting...`);
      
      // Also delete related followed communities or other records if necessary, 
      // but usually cascade or just deleting user is enough for demo data.
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error(`Error deleting ${email}:`, deleteError.message);
      } else {
        console.log(`Successfully deleted user "${email}".`);
      }
    }
  }

  // 3. Cleanup Demo Communities (NeuroVibe Community, etc.)
  console.log('\nCleaning up communities...');
  const { data: communities, error: commError } = await supabase
    .from('communities')
    .select('id, data');

  if (commError) {
    console.error('Error fetching communities:', commError.message);
  } else if (communities) {
    const demoComms = communities.filter(c => 
      DEMO_STARTUP_NAMES.some(name => c.data?.name?.includes(name)) ||
      c.id.includes('demo')
    );

    for (const comm of demoComms) {
      console.log(`Deleting demo community: ${comm.data?.name} (${comm.id})`);
      await supabase.from('channels').delete().eq('data->>communityId', comm.id);
      await supabase.from('communities').delete().eq('id', comm.id);
    }
  }

  console.log('\nCleanup complete and database is now in a production-ready empty state (for demo data).');
}

cleanup().catch(err => {
  console.error('Fatal error during cleanup:', err);
  process.exit(1);
});
