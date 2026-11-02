import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define demo data patterns
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

interface DbRow {
  id: string;
  data?: Record<string, any>;
}

interface CleanupStats {
  startups: number;
  communities: number;
  dealRooms: number;
  investments: number;
  fundingApps: number;
  posts: number;
  total: number;
}

const stats: CleanupStats = {
  startups: 0,
  communities: 0,
  dealRooms: 0,
  investments: 0,
  fundingApps: 0,
  posts: 0,
  total: 0
};

async function isDemoStartup(row: DbRow): Promise<boolean> {
  const name = row.data?.name || '';
  return DEMO_STARTUP_NAMES.some(demoName => name === demoName) ||
         name.toLowerCase().includes('demo') ||
         name.toLowerCase().includes('test');
}

async function cleanup() {
  console.log('🚀 Starting demo data cleanup...\n');

  try {
    // Step 1: Delete all posts (regardless of author)
    console.log('📋 Deleting all posts...');
    const { data: allPosts, error: postsFetchError } = await supabase
      .from('posts')
      .select('id')
      .limit(10000);

    if (postsFetchError) {
      console.error('❌ Error fetching posts:', postsFetchError.message);
    } else if (allPosts && allPosts.length > 0) {
      const postIds = allPosts.map(p => p.id);
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .in('id', postIds);

      if (deleteError) {
        console.error('❌ Error deleting posts:', deleteError.message);
      } else {
        stats.posts = allPosts.length;
        console.log(`✓ Successfully deleted ${allPosts.length} post(s)\n`);
      }
    }

    // Step 2: Find and delete demo startups
    console.log('📋 Finding demo startups...');
    const { data: allStartups, error: startupFetchError } = await supabase
      .from('startups')
      .select('id, data')
      .limit(1000);

    if (startupFetchError) {
      console.error('❌ Error fetching startups:', startupFetchError.message);
      return;
    }

    const demoStartups: DbRow[] = [];
    for (const startup of (allStartups || [])) {
      if (await isDemoStartup(startup)) {
        demoStartups.push(startup);
      }
    }

    if (demoStartups.length > 0) {
      console.log(`✓ Found ${demoStartups.length} demo startup(s)`);
      const demoStartupIds = demoStartups.map(s => s.id);

      // Delete dependent records for demo startups
      console.log('  Deleting related deal rooms...');
      await supabase
        .from('deal_rooms')
        .delete()
        .in('data->>startupId', demoStartupIds);
      stats.dealRooms++;

      console.log('  Deleting related investments...');
      await supabase
        .from('investments')
        .delete()
        .in('data->>startupId', demoStartupIds);
      stats.investments++;

      console.log('  Deleting related funding applications...');
      await supabase
        .from('funding_applications')
        .delete()
        .in('data->>startupId', demoStartupIds);
      stats.fundingApps++;

      console.log('  Deleting startup documents...');
      await supabase
        .from('startup_documents')
        .delete()
        .in('data->>startupId', demoStartupIds);

      // Delete startups
      console.log('  Deleting startups...');
      const { error: startupDeleteError } = await supabase
        .from('startups')
        .delete()
        .in('id', demoStartupIds);

      if (startupDeleteError) {
        console.error('  ❌ Error deleting startups:', startupDeleteError.message);
      } else {
        stats.startups += demoStartups.length;
        console.log(`✓ Successfully deleted ${demoStartups.length} startup(s)\n`);
      }
    }

    // Step 3: Find and delete demo communities
    console.log('📋 Finding demo communities...');
    const { data: allCommunities, error: commFetchError } = await supabase
      .from('communities')
      .select('id, data')
      .limit(1000);

    if (commFetchError) {
      console.error('❌ Error fetching communities:', commFetchError.message);
    } else if (allCommunities && allCommunities.length > 0) {
      const demoCommunities = allCommunities.filter(c =>
        (c.data?.name || '').toLowerCase().includes('demo') ||
        (c.data?.name || '').toLowerCase().includes('neurovibe') ||
        (c.id || '').toLowerCase().includes('demo')
      );

      if (demoCommunities.length > 0) {
        console.log(`✓ Found ${demoCommunities.length} demo community(ies)`);
        const demoCommunityIds = demoCommunities.map(c => c.id);

        // Delete channels in demo communities
        console.log('  Deleting channels...');
        await supabase.from('channels').delete().in('data->>communityId', demoCommunityIds);

        // Delete community members
        console.log('  Deleting community members...');
        await supabase.from('community_members').delete().in('data->>communityId', demoCommunityIds);

        // Delete communities
        console.log('  Deleting communities...');
        const { error: commDeleteError } = await supabase
          .from('communities')
          .delete()
          .in('id', demoCommunityIds);

        if (commDeleteError) {
          console.error('  ❌ Error deleting communities:', commDeleteError.message);
        } else {
          stats.communities += demoCommunities.length;
          console.log(`✓ Successfully deleted ${demoCommunities.length} community(ies)\n`);
        }
      }
    }

    // Print summary
    console.log('\n📊 Cleanup Summary:');
    console.log('─'.repeat(40));
    console.log(`  Posts deleted:           ${stats.posts}`);
    console.log(`  Startups removed:        ${stats.startups}`);
    console.log(`  Communities removed:     ${stats.communities}`);
    console.log(`  Deal rooms deleted:      ${stats.dealRooms}`);
    console.log(`  Investments deleted:     ${stats.investments}`);
    console.log(`  Funding apps deleted:    ${stats.fundingApps}`);
    console.log('─'.repeat(40));
    console.log(`  ✅ Total records cleaned: ${
      stats.posts + stats.startups + stats.communities +
      stats.dealRooms + stats.investments + stats.fundingApps
    }`);
    console.log('\n✨ Cleanup complete!');
    console.log('📌 NOTE: All users have been preserved\n');

  } catch (err) {
    console.error('❌ Fatal error during cleanup:', err);
    process.exit(1);
  }
}

cleanup();
