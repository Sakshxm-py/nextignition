import { supabase } from './src/utils/supabase';

async function findEliteUsers() {
    try {
        console.log('Searching for users with elite plans...');
        const { data, error } = await supabase
            .from('users')
            .select('id, data')
            .or('data->>founder_plan.eq.elite,data->>expert_plan.eq.elite,data->>investor_plan.eq.elite,data->>tier.eq.elite,data->>subscriptionTier.eq.elite');

        if (error) {
            console.error('Error:', error);
        } else if (data && data.length > 0) {
            console.log(`Found ${data.length} elite users:`);
            data.forEach(u => {
                console.log(`- ${u.data.email} (ID: ${u.id})`);
                console.log(`  Plans: Founder: ${u.data.founder_plan}, Expert: ${u.data.expert_plan}, Investor: ${u.data.investor_plan}`);
            });
        } else {
            console.log('No elite users found.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

findEliteUsers();
