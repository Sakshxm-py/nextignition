const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function list() {
  const { data } = await supabase.from('communities').select('id, data');
  console.log("Found", data?.length, "communities:");
  data?.forEach(d => console.log(`- ${d.id} (${d.data?.name})`));
}

list();
