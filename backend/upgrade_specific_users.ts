import { supabase } from './src/utils/supabase';

const usersToUpgrade = [
    { email: 'founder@gmail.com', role: 'founder' },
    { email: 'expert@gmail.com', role: 'expert' },
    { email: 'investor@gmail.com', role: 'investor' },
    { name: 'Rohan Untawale' } // Role unknown yet
];

async function upgradeUsers() {
    for (const target of usersToUpgrade) {
        let query = supabase.from('users').select('id, data');
        
        if (target.email) {
            query = query.eq('data->>email', target.email);
        } else if (target.name) {
            query = query.ilike('data->>name', `%${target.name}%`);
        }

        const { data: users, error: fetchError } = await query;

        if (fetchError) {
            console.error(`Error searching for ${target.email || target.name}:`, fetchError.message);
            continue;
        }

        if (!users || users.length === 0) {
            console.warn(`User not found: ${target.email || target.name}`);
            continue;
        }

        for (const user of users) {
            const userData = user.data;
            const userEmail = userData.email;
            const currentRole = target.role || userData.role || 'founder';
            const planKey = `${currentRole}_plan`;

            console.log(`Upgrading ${userEmail} (ID: ${user.id}) to Elite ${currentRole}...`);

            const updatedData = {
                ...userData,
                [planKey]: 'elite',
                isVerified: true,
                updatedAt: new Date().toISOString()
            };

            // Also set other plans to free if not already set, or just ensure this one is elite
            // Based on paymentController, it seems they can have multiple roles but each has its own plan.

            const { error: updateError } = await supabase
                .from('users')
                .update({ data: updatedData })
                .eq('id', user.id);

            if (updateError) {
                console.error(`Failed to upgrade ${userEmail}:`, updateError.message);
            } else {
                console.log(`✅ Successfully upgraded ${userEmail} to Elite ${currentRole}!`);
            }
        }
    }
    process.exit();
}

upgradeUsers();
