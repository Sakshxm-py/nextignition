const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const tables = ['admin_users', 'admin_logs', 'platform_settings'];
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t).select('*').limit(1);
      if (error) {
          if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
              console.log('Table ' + t + ' exists (empty)');
          } else {
              console.log('Table ' + t + ' error: ' + error.message + ' (Code: ' + error.code + ')');
          }
      }
      else console.log('Table ' + t + ' exists');
    } catch (e) {
      console.log('Table ' + t + ' exception: ' + e.message);
    }
  }
}
check();
