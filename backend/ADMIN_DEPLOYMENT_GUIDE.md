# 2-Level Admin RBAC - Deployment Guide

**Last Updated:** April 14, 2026
**Status:** Ready for Staging/Production
**Estimated Deployment Time:** 15-30 minutes

---

## Pre-Deployment Checklist

- [ ] Database backups created
- [ ] ADMIN_JWT_SECRET environment variable prepared
- [ ] PRIMARY_ADMIN password hash generated
- [ ] ADMIN_CREDENTIALS environment variable value ready
- [ ] Testing completed on staging environment
- [ ] Rollback procedure documented and tested
- [ ] Team is aware of deployment and any downtime implications

---

## Deployment Steps

### Step 1: Prepare Environment Variables (5 min)

Add to your `.env` or deployment secrets:

```bash
# Generate a strong secret (at least 32 characters)
ADMIN_JWT_SECRET="your-super-secure-random-secret-key-min-32-characters"

# Generate password hash for PRIMARY_ADMIN
# Run: node -e "require('bcryptjs').hash('YOUR_PASSWORD_HERE',10).then(console.log)"
# Example output: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvMvOm

ADMIN_CREDENTIALS="admin@nextignition.io:$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvMvOm:Admin Full Name"
```

**Notes:**
- Keep `ADMIN_JWT_SECRET` secret (use your cloud provider's secret manager)
- Format ADMIN_CREDENTIALS as: `email:passwordHash:displayName`
- Only one PRIMARY_ADMIN per deployment (more can be created via API later)

### Step 2: Run Database Migration (5-10 min)

**Option A: Using Supabase Dashboard**
1. Login to Supabase dashboard
2. Go to SQL Editor
3. Copy contents of `backend/migrations/003_admin_access_control.sql`
4. Paste into SQL Editor
5. Click "Execute"
6. Verify success: Check "admin_users" and "admin_activity_logs" tables exist

**Option B: Using CLI/Script**
```bash
# Using supabase CLI
supabase db push --linked

# Or using psql directly
psql $DATABASE_URL < backend/migrations/003_admin_access_control.sql
```

**Verify Migration Success:**
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('admin_users', 'admin_activity_logs');

-- Check indexes created
SELECT indexname FROM pg_indexes
WHERE tablename IN ('admin_users', 'admin_activity_logs');

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('admin_users', 'admin_activity_logs');
```

### Step 3: Deploy Backend Code (5 min)

```bash
# Build
npm install
npm run build

# Deploy to your environment (example for Vercel)
vercel deploy --prod

# Or for your deployment method:
# - Docker: docker build -t nextignition-backend . && push
# - ECS: Update task definition with new image
# - Railway/Render: Push to main/production branch
```

### Step 4: Verify Environment Variables (2 min)

Check your deployment environment has the new variables set:

```bash
# Verify on deployed server
echo $ADMIN_JWT_SECRET        # Should not be empty
echo $ADMIN_CREDENTIALS      # Should not be empty

# Or via your cloud provider dashboard
# - Vercel: Settings → Environment Variables
# - Railway: Variables tab
- Render: Environment tab
```

### Step 5: Smoke Test (5 min)

Test the deployment:

```bash
# Test admin health endpoint
curl https://your-api.com/api/admin/health

# Expected response:
# {"status":"admin-healthy","timestamp":"2026-04-14T..."}

# Test admin login
curl -X POST https://your-api.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nextignition.io",
    "password": "YOUR_PASSWORD_HERE"
  }'

# Expected response:
# {"token":"eyJhb...", "role":"PRIMARY_ADMIN", ...}
```

### Step 6: Verify Database (3 min)

```sql
-- Check admin_users table created
SELECT * FROM admin_users;

-- Check admin_activity_logs table
SELECT * FROM admin_activity_logs LIMIT 5;

-- Verify indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'admin_users';
SELECT * FROM pg_indexes WHERE tablename = 'admin_activity_logs';
```

### Step 7: Create Secondary Admins (Optional, 5 min)

After PRIMARY_ADMIN successfully logs in:

```bash
# 1. Login as PRIMARY_ADMIN
TOKEN=$(curl -s -X POST https://your-api.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nextignition.io",
    "password": "YOUR_PASSWORD"
  }' | jq -r '.token')

# 2. Create a secondary admin
curl -X POST https://your-api.com/api/admin/admins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ops@nextignition.io",
    "password": "SecondaryPassword123!",
    "name": "Operations Manager",
    "role": "SECONDARY_ADMIN"
  }'

# 3. Test SECONDARY_ADMIN login
curl -X POST https://your-api.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ops@nextignition.io",
    "password": "SecondaryPassword123!"
  }'

# Expected: Returns token with role: SECONDARY_ADMIN
```

---

## Post-Deployment

### Immediate (First 1 hour)
- [ ] Monitor application logs for errors
- [ ] Monitor database for slow queries
- [ ] Test all admin endpoints working
- [ ] Verify activity logs being created

### Short-term (First 24 hours)
- [ ] Monitor admin_activity_logs growth (should have entries)
- [ ] Check for any 403 Forbidden errors (expected for SECONDARY)
- [ ] Verify token refresh endpoint working
- [ ] Spot-check permissions are enforced correctly

### Medium-term (First 7 days)
- [ ] Review admin_activity_logs for unusual patterns
- [ ] Verify session timeouts working (30 min expiry)
- [ ] Test backup/restore procedures
- [ ] Document any issues/workarounds

---

## Rollback Procedure

If issues occur and immediate rollback is needed:

### Option A: Rollback Code Only (Keeps DB)
```bash
# Revert to previous deploy
# Example for Vercel: Go to Deployments → Click previous deployment → Rollback
# Example for Docker: Roll back image tag
# Example for git-based: git revert <commit_hash> && git push

# Test old version still works with new schema
curl https://your-api.com/api/admin/login

# Note: Old code will not enforce new permissions
# Admin endpoints may fail due to new JWT structure
```

### Option B: Full Rollback (Code + Database)
```bash
# Reverse migration
psql $DATABASE_URL < rollback_migration.sql

# OR using Supabase:
# 1. Go to Backups in dashboard
# 2. Restore to point before migration
# 3. Revert backend code deployment
```

### Option C: Partial Rollback (Keep New Schema)
```bash
# Most conservative approach:
# 1. Keep new database tables
# 2. Revert code to previous deployment
# 3. Fix issues while keeping DB state
# 4. Redeploy fixed code

# This preserves:
# - Activity log entries
# - New admin_users table
# - Migration state
```

**Rollback Decision Tree:**
```
If issue is in code logic:
  → Roll back code only (Option A)

If issue is in database schema:
  → Full rollback recommended (Option B)

If unsure / want to investigate:
  → Partial rollback (Option C) + debug in secondary env
```

---

## Staging Deployment (RECOMMENDED FIRST)

Before deploying to production, test in staging:

```bash
# 1. Deploy to staging environment
git checkout -b staging-test
# Make any necessary staging-specific changes
git push origin staging-test

# 2. Run migration in staging database
# (Same steps as production, but against staging DB)

# 3. Run full test suite
npm test

# 4. Manual testing in staging admin panel
# - Create secondary admin
# - Test permission denials
# - Check audit logs
# - Test session timeout
# - Verify token refresh

# 5. Load testing (optional)
# - Simulate multiple admins logging in
# - Monitor database performance
# - Check for connection pool issues

# 6. Rollback testing (optional but recommended)
# - Practice rolling back migration
# - Verify rollback completeness
# - Document any issues

# 7. If all tests pass, merge and deploy to production
git checkout main
git merge staging-test
git push origin main
```

---

## Performance Considerations

### Database Load
- **New Tables:** admin_users ~10-100 rows, admin_activity_logs ~10,000/day
- **Indexes:** 4 new indexes added, minimal write overhead
- **Queries:** Most queries finish < 50ms

### API Performance
- **Login:** ~100-200ms (bcrypt comparison + JWT generation)
- **Permission Check:** ~20-30ms (cache miss) or ~5ms (cache hit)
- **Activity Logging:** ~50-100ms (async, non-blocking)

### Expected Impact
- **User API:** Minimal impact (existing endpoints unchanged)
- **Admin API:** New permission checks add ~20-30ms per request
- **Database:** ~10-20% increase in query volume (from permission checks)
- **Storage:** ~10-50MB per year (activity logs)

---

## Monitoring & Alerts

### Set Up Monitoring For

1. **Error Rate**
   - Alert if admin endpoints return 5XX errors
   - Alert if permission checks consistently fail (403)

2. **Performance**
   - Alert if admin login > 500ms
   - Alert if permission check > 100ms

3. **Database**
   - Monitor admin_users table size
   - Monitor admin_activity_logs growth
   - Alert if disk usage > 80%

4. **Security**
   - Alert on multiple failed login attempts
   - Alert if admin account suspended
   - Alert if permission denials spike

### Example Monitoring Query
```sql
-- Alert if activity logs growing abnormally
SELECT DATE(timestamp), COUNT(*)
FROM admin_activity_logs
GROUP BY DATE(timestamp)
ORDER BY DATE(timestamp) DESC
LIMIT 30;

-- Alert if specific admin having permission issues
SELECT admin_id, action, COUNT(*) as count
FROM admin_activity_logs
WHERE action LIKE '%DENIED' AND timestamp > NOW() - '1 hour'::interval
GROUP BY admin_id, action;
```

---

## Troubleshooting During Deployment

### Problem: "Migration failed: relation already exists"
**Solution:** Check if tables were already created in a previous attempted deployment
```sql
DROP TABLE IF EXISTS admin_activity_logs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
-- Then re-run migration
```

### Problem: "ADMIN_JWT_SECRET not set"
**Solution:** Verify environment variable is set in deployment platform
```bash
# Vercel
vercel env ls  # Check if variable exists
vercel env pull  # Pull latest env vars
```

### Problem: "PRIMARY_ADMIN login returns 401"
**Possible causes:**
- [ ] ADMIN_CREDENTIALS env variable not set
- [ ] Password in ADMIN_CREDENTIALS is hashed incorrectly
- [ ] Email doesn't match exactly
- [ ] Whitespace in env variable value

**Solution:**
```bash
# Regenerate password hash
node -e "require('bcryptjs').hash('PASSWORD',10).then(h => console.log(h))"

# Update ADMIN_CREDENTIALS with exact format:
# email:hash:displayname (no spaces)
export ADMIN_CREDENTIALS="admin@example.com:$2b$10$xxxxxxxx:Admin"
```

### Problem: "403 Forbidden on all endpoints"
**Possible cause:** Permission matrix not loaded correctly
**Solution:**
```bash
# Check that adminConstants.ts is being imported
grep -r "ADMIN_PERMISSIONS" backend/src

# Verify middleware is applied
grep -r "enforceAdminPermission" backend/src/routes
```

---

## Verification Checklist

After deployment, verify:

- [ ] `GET /admin/health` returns 200
- [ ] `POST /admin/login` works with PRIMARY_ADMIN credentials
- [ ] JWT token contains: id, role, email, username, displayName
- [ ] Token expiry is 30 minutes from now
- [ ] `GET /admin/users` works
- [ ] `POST /admin/admins` (create SECONDARY) works
- [ ] SECONDARY_ADMIN can view users but not delete
- [ ] `DELETE /admin/delete/:id` returns 403 for SECONDARY
- [ ] `GET /admin/activity-logs` returns data
- [ ] Activity logs show permission denials
- [ ] Session validation returns 401 for expired token
- [ ] `POST /admin/refresh` returns new access token
- [ ] Cannot promote/suspend/delete own admin account

---

## Contact & Support

**Deployment Issues:** Contact your platform ops team
**Code Issues:** Check ADMIN_RBAC_IMPLEMENTATION.md
**Emergency Rollback:** Have rollback command ready, test on staging first

**Success Criteria:**
✓ All users can login
✓ Admin panel loads without errors
✓ Permissions enforced correctly
✓ Activity logs being created
✓ No performance degradation
