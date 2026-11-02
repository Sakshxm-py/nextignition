#!/usr/bin/env node

/**
 * Admin Credentials Generator
 * 
 * This script helps generate secure admin credentials for the ADMIN_CREDENTIALS environment variable.
 * 
 * Usage:
 *   node generate-admin-credentials.js
 *   
 * You will be prompted for:
 *   - Admin email/username
 *   - Display name
 *   - Password
 * 
 * The script will output the properly formatted credential string to add to your .env file.
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const generateAdminCredential = async () => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('          Next Ignition Admin Credentials Generator    ');
    console.log('═══════════════════════════════════════════════════════\n');

    const username = await question('Enter admin username/email: ');
    if (!username || !username.trim()) {
        console.error('❌ Username is required');
        rl.close();
        return;
    }

    const displayName = await question('Enter display name: ');
    if (!displayName || !displayName.trim()) {
        console.error('❌ Display name is required');
        rl.close();
        return;
    }

    const password = await question('Enter password (min 8 characters): ');
    if (!password || password.length < 8) {
        console.error('❌ Password must be at least 8 characters');
        rl.close();
        return;
    }

    console.log('\n⏳ Generating secure password hash...\n');

    const passwordHash = await bcrypt.hash(password, 10);

    console.log('✅ Admin credential generated successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Add this to your .env file:\n');
    console.log('ADMIN_CREDENTIALS=\\');
    console.log(`${username.trim()}:${passwordHash}:${displayName.trim()}`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 To add multiple admins, separate entries with commas:\n');
    console.log('ADMIN_CREDENTIALS=\\');
    console.log(`admin1@example.com:$2b$10$hash1:Admin One,\\`);
    console.log(`admin2@example.com:$2b$10$hash2:Admin Two`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   1. Keep this credential secure - do not commit to git');
    console.log('   2. Use strong, unique passwords for each admin');
    console.log('   3. Change the ADMIN_JWT_SECRET in production');
    console.log('   4. Consider implementing 2FA for admin accounts\n');

    rl.close();
};

generateAdminCredential().catch((error) => {
    console.error('❌ Error generating admin credential:', error);
    rl.close();
    process.exit(1);
});
