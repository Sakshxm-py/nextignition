const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanCommunities() {
  let log = '';
  const pushLog = (msg) => { log += msg + '\n'; console.log(msg); };
  
  pushLog('Fetching existing system communities...');
  const { data, error } = await supabase.from('communities').select('id');
  if (error) { pushLog('Error fetching communities: ' + JSON.stringify(error)); fs.writeFileSync('del_log.txt', log); return; }

  const allowedIds = ['sys-general', 'sys-founder-hub', 'sys-expert-hub', 'sys-investor-hub'];
  const toDelete = data.filter(c => c.id.startsWith('sys-') && !allowedIds.includes(c.id)).map(c => c.id);

  if (toDelete.length === 0) { pushLog('No unwanted system communities found to delete.'); fs.writeFileSync('del_log.txt', log); return; }

  pushLog('Deleting communities: ' + toDelete.join(', '));
  
  for (const cid of toDelete) {
    pushLog(`Deleting channels for community ${cid}...`);
    const { error: chErr } = await supabase.from('channels').delete().contains('data', { communityId: cid });
    if (chErr) pushLog(`Error deleting channels for ${cid}: ` + JSON.stringify(chErr));
  }
  
  // also delete community_messages just in case!
  for (const cid of toDelete) {
    const { error: msgErr } = await supabase.from('community_messages').delete().contains('data', { communityId: cid });
    if (msgErr) pushLog(`Error deleting messages for ${cid}: ` + JSON.stringify(msgErr));
  }

  // delete community from communities table
  for (const cid of toDelete) {
    const { error: delErr } = await supabase.from('communities').delete().eq('id', cid);
    if (delErr) pushLog(`Error deleting community ${cid}: ` + JSON.stringify(delErr));
  }

  pushLog('Done.');
  fs.writeFileSync('del_log.txt', log);
}

cleanCommunities();
