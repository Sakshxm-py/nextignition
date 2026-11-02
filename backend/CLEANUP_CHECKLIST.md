# Demo Data Cleanup - Deployment Checklist

## Pre-Cleanup Checklist

- [ ] **Database Backup Created**
  - [ ] Full backup taken before cleanup
  - [ ] Backup verified and tested
  - [ ] Backup location documented

- [ ] **Environment Preparation**
  - [ ] `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] Development environment ready for testing
  - [ ] Staging environment available for pre-production test
  - [ ] Production credentials reviewed

- [ ] **Team Notification**
  - [ ] Stakeholders notified of cleanup timing
  - [ ] Users informed (if needed)
  - [ ] Support team briefed on what's changing
  - [ ] Rollback plan reviewed with team

## Cleanup Execution

### For Staging/Development:

```bash
cd backend
npm run cleanup:demo
```

- [ ] Script runs without errors
- [ ] Output shows posts deleted count
- [ ] Output shows demo startups/communities count
- [ ] All records deleted as expected

### For Production:

**Option A: Using TypeScript Script**
```bash
cd backend
npm run cleanup:demo
```

**Option B: Using SQL Migration**
1. [ ] Open Supabase Dashboard → SQL Editor
2. [ ] Create new query from `migrations/004_cleanup_demo_data.sql`
3. [ ] Review SQL carefully
4. [ ] Run migration
5. [ ] Check success notification

## Post-Cleanup Verification

- [ ] **Verify Demo Data Removed**
  ```sql
  SELECT COUNT(*) FROM posts;
  -- Should return: 0
  
  SELECT COUNT(*) FROM startups WHERE data->>'name' LIKE '%QuantumFlow%';
  -- Should return: 0
  
  SELECT COUNT(*) FROM communities WHERE data->>'name' LIKE '%Demo%';
  -- Should return: 0
  ```

- [ ] **Verify All Users Preserved**
  ```sql
  SELECT COUNT(*) FROM users;
  -- Should show expected number of users
  
  SELECT id, data->>'email' FROM users LIMIT 5;
  -- Should show all users still intact
  ```

- [ ] **Application Functionality**
  - [ ] Backend starts without errors
  - [ ] Can login with any user account
  - [ ] Dashboard loads correctly
  - [ ] No errors related to missing data
  - [ ] Application works as expected

- [ ] **Test Suite Passes**
  ```bash
  npm run test
  ```
  - [ ] All tests pass
  - [ ] No new test failures

## Post-Deployment

- [ ] **Documentation**
  - [ ] Update deployment logs
  - [ ] Record cleanup timestamp
  - [ ] Document any issues encountered
  - [ ] Update runbooks if needed

- [ ] **Monitoring**
  - [ ] Monitor application logs for errors
  - [ ] Check error rates in monitoring
  - [ ] Monitor database performance
  - [ ] Watch for user-reported issues

- [ ] **Team Communication**
  - [ ] Notify team of successful cleanup
  - [ ] Document results and statistics
  - [ ] Share cleanup report
  - [ ] Update deployment checklist

## Rollback Plan (If Needed)

- [ ] **Restore from Backup**
  - [ ] Stop application
  - [ ] Restore database backup
  - [ ] Verify data restoration
  - [ ] Restart application
  - [ ] Run smoke tests

- [ ] **Root Cause Analysis**
  - [ ] Identify why cleanup caused issues
  - [ ] Update cleanup approach if needed
  - [ ] Document lessons learned

- [ ] **Retry**
  - [ ] Fix issues identified
  - [ ] Create new backup
  - [ ] Run cleanup again
  - [ ] Verify success

## Cleanup Statistics Template

Record these numbers for documentation:

```
Cleanup completed: [DATE & TIME]
Environment: [STAGING/PRODUCTION]
Duration: [TIME TAKEN]

Records Deleted:
├── Posts: ____
├── Startups: ____
├── Communities: ____
├── Deal Rooms: ____
├── Investments: ____
└── Funding Applications: ____

Total Records Cleaned: ____

User Verification:
├── Total Users Remaining: ____
└── Status: ✅ ALL PRESERVED

Issues Encountered: [NONE / DESCRIBE]

Next Steps: [MONITORING / TESTING / COMMUNICATION]
```

## Contact & Support

- **Questions?** Review `DEMO_CLEANUP_GUIDE.md`
- **Issues?** Check troubleshooting section
- **Urgent?** Contact [DevOps/Tech Lead]
