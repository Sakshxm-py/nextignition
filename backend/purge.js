const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function purge() {
  const { data: communities } = await supabase.from('communities').select('id');
  const toDelete = communities.filter(c => !c.id.startsWith('system-')).map(c => c.id);

  console.log(`Deleting ${toDelete.length} non-system communities...`);
  
  for (const cid of toDelete) {
    // 1. Find all channels for this community
    const { data: channels } = await supabase.from('channels').select('id').eq('data->>communityId', cid);
    const channelIds = channels ? channels.map(c => c.id) : [];

    // 2. Delete all messages in these channels
    for (const chId of channelIds) {
      await supabase.from('community_messages').delete().eq('data->>channelId', chId);
    }

    // 3. Delete the channels themselves
    await supabase.from('channels').delete().eq('data->>communityId', cid);

    // 4. Delete invites for this community
    await supabase.from('community_invites').delete().eq('data->>communityId', cid);

    // 5. Delete the community
    const { error } = await supabase.from('communities').delete().eq('id', cid);
    if (error) {
      console.error('Error deleting community', cid, error.message);
    } else {
      console.log('Deleted community:', cid);
    }
  }

  console.log('Purge complete.');
}
purge();
