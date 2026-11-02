import { supabase } from './src/utils/supabase';

async function checkSchema() {
    try {
        console.log('Checking "users" table columns...');
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (userError) {
            console.error('Error fetching from "users":', userError);
        } else if (userData && userData.length > 0) {
            console.log('Users table sample columns:', Object.keys(userData[0]));
            console.log('Sample data:', JSON.stringify(userData[0], null, 2));
        } else {
            console.log('Users table is empty.');
        }

        console.log('\nChecking "subscriptions" table existence and columns...');
        const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .limit(1);

        if (subError) {
            console.error('Error fetching from "subscriptions":', subError);
        } else if (subData && subData.length > 0) {
            console.log('Subscriptions table sample columns:', Object.keys(subData[0]));
            console.log('Sample data:', JSON.stringify(subData[0], null, 2));
        } else {
            console.log('Subscriptions table is empty or does not exist.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkSchema();
