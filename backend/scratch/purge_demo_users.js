const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEMO_EMAILS = [
  'testfounder@example.com',
  'investor@test.com',
  'test_verify@example.com',
  'testh@gmail.com',
  'fixverify123@example.com',
  'testinvestor123@example.com',
  'founder_test@example.com',
  'founder@test.com',
  'expert@test.com',
  'founder@example.com',
  'final_test_1775218662209@example.com',
  'test@example.com',
  'testuser@gmail.com'
];

function isDemoEmail(email) {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (DEMO_EMAILS.includes(e)) return true;
  if (e.endsWith('@example.com') || e.endsWith('@test.com')) return true;
  if (e.startsWith('test') || e.startsWith('demo')) return true;
  return false;
}

async function purge() {
  console.log("=== DB CLEANUP: RETRIEVING ALL USERS ===");
  const { data: users, error: uErr } = await supabase.from('users').select('id, data, created_at');
  if (uErr) {
    console.error("Error reading users table:", uErr.message);
    process.exit(1);
  }

  const demoUsers = users.filter(u => {
    const email = u.data?.email || '';
    const name = u.data?.name || '';
    return isDemoEmail(email) || name.toLowerCase().includes('demo') || name.toLowerCase().includes('test user');
  });

  console.log(`Total users in database: ${users.length}`);
  console.log(`Identified ${demoUsers.length} demo/test users to purge:`);
  
  if (demoUsers.length === 0) {
    console.log("No demo users found. Database is already clean!");
    return;
  }

  demoUsers.forEach(u => {
    console.log(` - ID: ${u.id}, Name: ${u.data?.name}, Email: ${u.data?.email}`);
  });

  const demoUserIds = demoUsers.map(u => u.id);

  console.log("\n=== STARTING TARGETED DELETIONS ===");

  // 1. Bookings
  console.log("\n--- Purging bookings ---");
  let bookingDeleteCount = 0;
  // Since we cannot run raw sql delete directly for jsonb matching, we retrieve matching records first and delete by id
  const { data: bookings, error: bkErr } = await supabase.from('bookings').select('id, data');
  if (bkErr) {
    console.error("Error reading bookings:", bkErr.message);
  } else {
    const matchedBookings = bookings.filter(b => {
      const founderId = b.data?.founder || '';
      const expertId = b.data?.expert || '';
      return demoUserIds.includes(founderId) || demoUserIds.includes(expertId);
    });
    console.log(`Found ${matchedBookings.length} booking records referencing demo users.`);
    for (const b of matchedBookings) {
      const { error: delErr } = await supabase.from('bookings').delete().eq('id', b.id);
      if (delErr) {
        console.error(`Failed to delete booking ${b.id}:`, delErr.message);
      } else {
        bookingDeleteCount++;
      }
    }
    console.log(`Successfully deleted ${bookingDeleteCount} bookings.`);
  }

  // 2. Availabilities
  console.log("\n--- Purging availabilities ---");
  let availDeleteCount = 0;
  const { data: avails, error: avErr } = await supabase.from('availabilities').select('id, data');
  if (avErr) {
    console.error("Error reading availabilities:", avErr.message);
  } else {
    const matchedAvails = avails.filter(a => {
      const expertId = a.data?.expert || '';
      return demoUserIds.includes(expertId);
    });
    console.log(`Found ${matchedAvails.length} availability records referencing demo users.`);
    for (const a of matchedAvails) {
      const { error: delErr } = await supabase.from('availabilities').delete().eq('id', a.id);
      if (delErr) {
        console.error(`Failed to delete availability ${a.id}:`, delErr.message);
      } else {
        availDeleteCount++;
      }
    }
    console.log(`Successfully deleted ${availDeleteCount} availabilities.`);
  }

  // 3. Cofounder Profiles
  console.log("\n--- Purging cofounder_profiles ---");
  let cofounderDeleteCount = 0;
  const { data: cofounders, error: cfErr } = await supabase.from('cofounder_profiles').select('id, data');
  if (cfErr) {
    console.error("Error reading cofounder_profiles:", cfErr.message);
  } else {
    const matchedCofounders = cofounders.filter(c => {
      const userId = c.data?.user || '';
      return demoUserIds.includes(userId) || demoUserIds.includes(c.id);
    });
    console.log(`Found ${matchedCofounders.length} cofounder_profiles referencing demo users.`);
    for (const c of matchedCofounders) {
      const { error: delErr } = await supabase.from('cofounder_profiles').delete().eq('id', c.id);
      if (delErr) {
        console.error(`Failed to delete cofounder profile ${c.id}:`, delErr.message);
      } else {
        cofounderDeleteCount++;
      }
    }
    console.log(`Successfully deleted ${cofounderDeleteCount} cofounder_profiles.`);
  }

  // 4. Saved Items
  console.log("\n--- Purging saved_items ---");
  const { data: savedItemsDel, error: siErr } = await supabase
    .from('saved_items')
    .delete()
    .in('user_id', demoUserIds);
  if (siErr) {
    console.error("Error deleting saved_items:", siErr.message);
  } else {
    console.log("Successfully ran delete query on saved_items table.");
  }

  // 5. Posts
  console.log("\n--- Purging posts ---");
  let postsDeleteCount = 0;
  const { data: posts, error: pErr } = await supabase.from('posts').select('id, data');
  if (pErr) {
    console.error("Error reading posts:", pErr.message);
  } else {
    const matchedPosts = posts.filter(p => {
      const authorId = p.data?.author || '';
      return demoUserIds.includes(authorId);
    });
    console.log(`Found ${matchedPosts.length} posts referencing demo users.`);
    for (const p of matchedPosts) {
      const { error: delErr } = await supabase.from('posts').delete().eq('id', p.id);
      if (delErr) {
        console.error(`Failed to delete post ${p.id}:`, delErr.message);
      } else {
        postsDeleteCount++;
      }
    }
    console.log(`Successfully deleted ${postsDeleteCount} posts.`);
  }

  // 6. Startups
  console.log("\n--- Purging startups ---");
  let startupsDeleteCount = 0;
  const { data: startups, error: stErr } = await supabase.from('startups').select('id, data');
  if (stErr) {
    console.error("Error reading startups:", stErr.message);
  } else {
    const matchedStartups = startups.filter(s => {
      const founderId = s.data?.founder || '';
      return demoUserIds.includes(founderId);
    });
    console.log(`Found ${matchedStartups.length} startups referencing demo users.`);
    for (const s of matchedStartups) {
      const { error: delErr } = await supabase.from('startups').delete().eq('id', s.id);
      if (delErr) {
        console.error(`Failed to delete startup ${s.id}:`, delErr.message);
      } else {
        startupsDeleteCount++;
      }
    }
    console.log(`Successfully deleted ${startupsDeleteCount} startups.`);
  }

  // 7. Deal Rooms
  console.log("\n--- Purging deal_rooms ---");
  let dealRoomsDeleteCount = 0;
  const { data: dealRooms, error: drErr } = await supabase.from('deal_rooms').select('id, data');
  if (drErr) {
    console.error("Error reading deal_rooms:", drErr.message);
  } else {
    const matchedDealRooms = dealRooms.filter(d => {
      const founderId = d.data?.founder || '';
      return demoUserIds.includes(founderId);
    });
    console.log(`Found ${matchedDealRooms.length} deal_rooms referencing demo users.`);
    for (const d of matchedDealRooms) {
      const { error: delErr } = await supabase.from('deal_rooms').delete().eq('id', d.id);
      if (delErr) {
        console.error(`Failed to delete deal room ${d.id}:`, delErr.message);
      } else {
        dealRoomsDeleteCount++;
      }
    }
    console.log(`Successfully deleted ${dealRoomsDeleteCount} deal_rooms.`);
  }

  // 8. Funding Applications
  console.log("\n--- Purging funding_applications ---");
  let fundingAppsDeleteCount = 0;
  const { data: fundingApps, error: faErr } = await supabase.from('funding_applications').select('id, data');
  if (faErr) {
    console.error("Error reading funding_applications:", faErr.message);
  } else {
    const matchedFundingApps = fundingApps.filter(f => {
      const founderId = f.data?.founder || '';
      return demoUserIds.includes(founderId);
    });
    console.log(`Found ${matchedFundingApps.length} funding_applications referencing demo users.`);
    for (const f of matchedFundingApps) {
      const { error: delErr } = await supabase.from('funding_applications').delete().eq('id', f.id);
      if (delErr) {
        console.error(`Failed to delete funding application ${f.id}:`, delErr.message);
      } else {
        fundingAppsDeleteCount++;
      }
    }
    console.log(`Successfully deleted ${fundingAppsDeleteCount} funding_applications.`);
  }

  // 9. Users table
  console.log("\n--- Purging users ---");
  let userDeleteCount = 0;
  for (const uid of demoUserIds) {
    const { error: delErr } = await supabase.from('users').delete().eq('id', uid);
    if (delErr) {
      console.error(`Failed to delete user record ${uid}:`, delErr.message);
    } else {
      userDeleteCount++;
    }
  }
  console.log(`Successfully deleted ${userDeleteCount} out of ${demoUserIds.length} user records.`);

  console.log("\n=== PURGE PROCEDURE COMPLETED SUCCESSFULLY ===");
}

purge().catch(e => console.error("Fatal:", e));
