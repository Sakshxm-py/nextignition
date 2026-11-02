require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
    const { data: channels } = await supabase.from('channels').select('id');
    if (channels && channels.length > 0) {
        const channelIds = channels.map(c => c.id);
        await supabase.from('community_messages').delete().in('data->>channelId', channelIds);
        await supabase.from('channels').delete().in('id', channelIds);
    }
    await supabase.from('communities').delete().neq('id', 'nevermatch');
    console.log('Cleared all communities, channels, and messages.');
})();
