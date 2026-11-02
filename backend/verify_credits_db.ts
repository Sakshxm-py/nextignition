import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { supabase } from './src/utils/supabase';

async function verify() {
  console.log('--- Verifying Credit Persistence in Database ---');
  
  // 1. Fetch a test user or the first user in the system
  const { data: users, error: fetchErr } = await supabase.from('users').select('id, data').limit(1);
  if (fetchErr || !users || users.length === 0) {
    console.error('Failed to fetch user or no users exist:', fetchErr);
    process.exit(1);
  }

  const testUser = users[0];
  const userId = testUser.id;
  const originalAiUsage = testUser.data.aiUsage;

  console.log(`Found test user: ${userId}`);
  console.log('Original aiUsage:', originalAiUsage);

  // 2. Modify aiUsage
  const today = new Date().toISOString().split('T')[0];
  const newUsage = {
    queries: (originalAiUsage?.queries || 0) + 1,
    lastQueryDate: today
  };

  testUser.data.aiUsage = newUsage;

  // 3. Update the database
  console.log('Updating user data in database with new aiUsage:', newUsage);
  const { error: updateErr } = await supabase.from('users').update({ data: testUser.data }).eq('id', userId);
  if (updateErr) {
    console.error('Failed to update user:', updateErr);
    process.exit(1);
  }
  console.log('Update query finished successfully.');

  // 4. Retrieve again to confirm persistence
  console.log('Retrieving user data again to confirm persistence...');
  const { data: updatedUser, error: refetchErr } = await supabase.from('users').select('data').eq('id', userId).single();
  if (refetchErr || !updatedUser) {
    console.error('Failed to refetch user:', refetchErr);
    process.exit(1);
  }

  console.log('Refetched aiUsage:', updatedUser.data.aiUsage);
  if (updatedUser.data.aiUsage?.queries === newUsage.queries) {
    console.log('✅ PERSISTENCE VERIFIED: Database saved and loaded correctly!');
  } else {
    console.error('❌ PERSISTENCE FAILED: Refetched data does not match the saved data.');
  }

  // 5. Restore original aiUsage value to keep DB clean
  console.log('Restoring original aiUsage value...');
  testUser.data.aiUsage = originalAiUsage;
  await supabase.from('users').update({ data: testUser.data }).eq('id', userId);
  console.log('Original value restored.');
  
  process.exit(0);
}

verify().catch(err => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
