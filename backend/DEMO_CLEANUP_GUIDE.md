# Demo Data Cleanup Guide

## What Gets Deleted & What's Preserved

### ❌ DELETED
- **All Posts** - Every post in the database
- **Demo Startups** - QuantumFlow, FinLedger, SaaSStack, PayRail, ClinicCloud, TradePulse, EcoTrace AI, NeuroVibe, and any startup with "demo" in the name
- **Demo Communities** - Communities with "Demo", "NeuroVibe" in the name or "demo" in the ID
- **Related Records** - Deal rooms, investments, funding applications, and startup documents for demo startups

### ✅ PRESERVED
- **All Users** - Every user account is kept (founder@gmail.com, founder@example.com, investor@example.com, etc.)

## Overview

This cleanup script removes all posts, demo startups, and demo communities while preserving all user accounts.

## Demo Data Patterns Detected

### Demo Startups
- QuantumFlow
- FinLedger
- SaaSStack
- PayRail
- ClinicCloud
- TradePulse
- EcoTrace AI
- NeuroVibe
- Demo Startup - PitchDeck Flow
- Any startup with "demo" or "test" in the name

### Demo Communities
- Communities with "NeuroVibe" in the name
- Communities with "Demo" in the name
- Communities with "demo" in the ID

### Posts
- **All posts are deleted** regardless of author

## Before You Start

⚠️ **IMPORTANT WARNINGS:**
1. **Backup your database** before running any cleanup
2. **Test in a staging environment first** before running in production
3. This is a **destructive operation** - deleted data cannot be recovered
4. **All posts will be deleted** - not just demo posts, but every post in the system
5. **All users will be preserved** - no user accounts will be deleted

## Cleanup Methods

### Method 1: TypeScript Script (Recommended)

#### Setup
```bash
cd backend
npm install
```

#### Run Cleanup
```bash
npm run cleanup:demo
```

**What it does:**
1. Deletes all posts
2. Finds and deletes demo startups and their related records
3. Finds and deletes demo communities and their related records
4. Preserves all user accounts
5. Shows a detailed cleanup summary

#### Example Output
```
🚀 Starting demo data cleanup...

📋 Deleting all posts...
✓ Successfully deleted 45 post(s)

📋 Finding demo startups...
✓ Found 5 demo startup(s)
  Deleting related deal rooms...
  Deleting related investments...
  Deleting related funding applications...
  Deleting startup documents...
  Deleting startups...
✓ Successfully deleted 5 startup(s)

📋 Finding demo communities...
✓ Found 2 demo community(ies)
  Deleting channels...
  Deleting community members...
  Deleting communities...
✓ Successfully deleted 2 community(ies)

📊 Cleanup Summary:
────────────────────────────────
  Posts deleted:           45
  Startups removed:        5
  Communities removed:     2
  Deal rooms deleted:      8
  Investments deleted:     3
  Funding apps deleted:    2
────────────────────────────────
  ✅ Total records cleaned: 65

✨ Cleanup complete!
📌 NOTE: All users have been preserved
```

### Method 2: SQL Migration (For Production)

If you prefer to use Supabase's SQL editor directly:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy the contents of `migrations/004_cleanup_demo_data.sql`
4. Review the SQL carefully
5. Run with careful attention to the deletion order

#### Steps in SQL Migration
1. Deletes all posts
2. Identifies demo startups and communities
3. Deletes related records in correct order:
   - Channels and community members
   - Deal rooms and investments
   - Funding applications
   - Startup documents
   - Demo startups and communities
4. Provides success notification

## Files Created/Updated

### 1. `cleanup_demo_data.ts` (TypeScript Script)
- ✅ Deletes all posts
- ✅ Deletes demo startups
- ✅ Deletes demo communities
- ✅ Preserves all users
- ✅ Proper error handling
- ✅ Detailed logging and statistics

### 2. `migrations/004_cleanup_demo_data.sql` (SQL Migration)
- ✅ Can be version-controlled like other migrations
- ✅ Uses proper SQL for deletion
- ✅ Respects foreign key constraints
- ✅ Preserves all users

### 3. `package.json` Update
- ✅ Added `cleanup:demo` npm script

## Safety Features

Both scripts include these safety measures:

✅ **User Preservation:** All user accounts are preserved
✅ **Cascading Deletes:** Removes related records (deal rooms, investments, etc.)
✅ **Transaction Safety:** All deletions happen with proper ordering
✅ **Logging:** Detailed output of what was deleted
✅ **Error Handling:** Gracefully handles missing data or errors

## Verification Steps

After running cleanup:

### 1. Verify Demo Data is Gone
```sql
-- Check for deleted posts (should return 0)
SELECT COUNT(*) as post_count FROM posts;

-- Check for deleted demo startups (should return 0)
SELECT COUNT(*) as demo_startup_count FROM startups 
WHERE data->>'name' LIKE '%QuantumFlow%' 
   OR data->>'name' LIKE '%FinLedger%';

-- Check for deleted demo communities (should return 0)
SELECT COUNT(*) as demo_community_count FROM communities 
WHERE data->>'name' LIKE '%Demo%';
```

### 2. Verify Users are Intact
```sql
-- Count all users (should show all preserved)
SELECT COUNT(*) as total_users FROM users;

-- Check specific test users are still there
SELECT id, data->>'email' FROM users 
WHERE data->>'email' IN ('founder@gmail.com', 'founder@example.com', 'investor@example.com');
```

## Troubleshooting

### Script fails with "SUPABASE_URL not found"
**Solution:** Ensure your `.env` file in `backend/` contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Script times out
**Solution:** May be too much data to process at once. Try the SQL migration method instead.

### Not all posts deleted
**Solution:** The script deletes posts in batches. If you have more than 10,000 posts, run the script multiple times or use the SQL migration method.

### Some demo data still exists
**Solution:** The script may have missed patterns. Check the database for variations in naming. Contact your team to identify additional patterns.

## Rollback (If Needed)

If you want to undo the cleanup:

1. **Stop the application** to prevent further writes
2. **Restore your database backup** from before the cleanup
3. **Rerun the cleanup** if needed after fixing any issues

## Next Steps

After successful cleanup:

1. ✅ Verify all users are still accessible
2. ✅ Confirm demo data is gone
3. ✅ Run your test suite to ensure functionality
4. ✅ Test login with all user accounts
5. ✅ Add this to your deployment checklist for new environments

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review database backups
3. Check Supabase logs for detailed errors
4. Contact the development team with error messages
