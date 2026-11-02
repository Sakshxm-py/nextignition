import { supabase } from './src/utils/supabase';

async function testUpdate() {
    try {
        console.log('Testing update with hypothetical "founder_plan" column...');
        const { data, error } = await supabase
            .from('users')
            .update({ founder_plan: 'test' } as any)
            .eq('id', 'non-existent-id');

        if (error) {
            console.log('Update failed (expected if column missing):', error.message);
        } else {
            console.log('Update "succeeded" (column might exist or silent failure)');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testUpdate();
