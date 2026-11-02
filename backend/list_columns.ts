import { supabase } from './src/utils/supabase';

async function listColumns() {
    try {
        console.log('Listing columns for "users" table...');
        const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'users' });

        if (error) {
            // If RPC doesn't exist, try a direct query to information_schema (if allowed)
            console.log('RPC failed, trying direct query...');
            const { data: cols, error: colError } = await supabase
                .from('users')
                .select('*')
                .limit(1);
            
            if (colError) {
                console.error('Error:', colError);
            } else if (cols && cols.length > 0) {
                console.log('Columns found in first row:', Object.keys(cols[0]));
            }
        } else {
            console.log('Columns:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

listColumns();
