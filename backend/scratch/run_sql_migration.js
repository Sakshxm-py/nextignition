// One-off migration runner. Usage: node scratch/run_sql_migration.js <path-to-sql> [--probe-only]
// Executes the SQL file against Supabase via the exec_sql RPC (service role).
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('MISSING_CREDS: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in backend/.env');
  process.exit(2);
}
const supabase = createClient(url, key);

async function execSql(sql) {
  return supabase.rpc('exec_sql', { sql_query: sql });
}

(async () => {
  // 1. Non-destructive probe to confirm exec_sql exists and is callable.
  const probe = await execSql('SELECT 1;');
  if (probe.error) {
    console.error('PROBE_FAILED:', probe.error.message);
    console.error('exec_sql RPC is not available — run the migration manually in the Supabase SQL Editor.');
    process.exit(3);
  }
  console.log('PROBE_OK: exec_sql is callable.');

  const fileArg = process.argv[2];
  if (!fileArg || process.argv.includes('--probe-only')) {
    console.log('Probe-only mode (no file executed).');
    process.exit(0);
  }

  // 2. Execute the migration file.
  const sqlPath = path.resolve(fileArg);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Executing migration: ${sqlPath} (${sql.length} bytes)`);
  const res = await execSql(sql);
  if (res.error) {
    console.error('MIGRATION_FAILED:', res.error.message);
    process.exit(1);
  }
  console.log('MIGRATION_OK');
})();
