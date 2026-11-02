# Investor Verification Phase 1 - Deployment Checklist

## Pre-Deployment

- [ ] **Code Review**
  - [ ] Verify verificationController.ts compiles without errors
  - [ ] Check investorTier.ts middleware syntax
  - [ ] Validate verificationRoutes.ts endpoints
  - [ ] Test auth.ts changes don't break existing auth flow

- [ ] **Database**
  - [ ] Backup current database
  - [ ] Run 002_investor_verification_system.sql migration in staging
  - [ ] Verify tables created: `investor_verifications`, `admin_verification_queue`
  - [ ] Confirm indexes created successfully
  - [ ] Test queries on new tables

- [ ] **Dependencies**
  - [ ] Verify `uuid` package available (used in verificationController.ts)
  - [ ] Check Express version compatibility
  - [ ] Run `npm install` if needed

## Deployment Steps

### 1. Backend Deployment
```bash
# Build
npm run build

# Test
npm run test -- verificationController.test.ts
npm run test -- investorTier.middleware.test.ts

# Deploy
git add .
git commit -m "feat: implement investor verification system phase 1"
npm run deploy:production
```

### 2. Database Migration
```bash
# In production environment
psql -U $DB_USER -d $DB_NAME -f backend/migrations/002_investor_verification_system.sql

# Verify migration
SELECT COUNT(*) FROM investor_verifications;
SELECT COUNT(*) FROM admin_verification_queue;
```

### 3. Environment Setup
Ensure these variables are set in production `.env`:
```
JWT_SECRET=<your_jwt_secret>
ADMIN_JWT_SECRET=<your_admin_secret>
SUPABASE_URL=<supabase_url>
SUPABASE_KEY=<supabase_key>
```

### 4. Verification
- [ ] Test investor can fetch verification status
- [ ] Test LinkedIn URL validation
- [ ] Test profile lock on Tier 1 accounts
- [ ] Test admin approval/rejection endpoints
- [ ] Check logs for errors

## Post-Deployment Monitoring

### Health Checks (First 24 Hours)
- [ ] Monitor error logs for 500 errors in verification endpoints
- [ ] Check verification table row count (should start empty)
- [ ] Monitor auth middleware performance (investorTier lookups)
- [ ] Test all tier-based access endpoints

### Metrics to Watch
- Error rate on `/investor/status` endpoint
- Verification success rate
- Tier distribution (should be mostly Tier 1 initially)
- Admin queue size (should be 0-5)

### Rollback Triggers
- [ ] 404 errors on investors trying to verify (fix: redeploy verificationController)
- [ ] Profile lock blocking legitimate users (fix: adjust middleware logic)
- [ ] Admin endpoints throwing 500 errors (fix: check database connection)
- [ ] High latency on verification endpoints (fix: check database indexes)

## Post-Deployment Tasks

### Day 1
- [ ] Send admin dashboard access to moderators
- [ ] Brief support team on new tier system
- [ ] Monitor logs for errors

### Day 7
- [ ] Pull verification completion metrics
- [ ] Identify common issues/UX problems
- [ ] Plan Phase 2 (LinkedIn OAuth)
- [ ] Optimize slow queries if any

### Day 30
- [ ] Full metrics review
- [ ] User feedback on verification process
- [ ] Plan additional verification methods

## Rollback Procedure (If Needed)

### Option 1: Immediate Code Rollback
```bash
git revert <commit-hash>
npm run build
npm run deploy:production
# Users will default to Tier 1 if investorTier not in JWT
```

### Option 2: Database Rollback
```bash
# Do NOT drop tables immediately, archive first
psql -U $DB_USER -d $DB_NAME -c "
  CREATE TABLE investor_verifications_backup AS SELECT * FROM investor_verifications;
  CREATE TABLE admin_verification_queue_backup AS SELECT * FROM admin_verification_queue;
  DROP TABLE IF EXISTS admin_verification_queue;
  DROP TABLE IF EXISTS investor_verifications;"
```

### Option 3: Feature Disable (Safest)
- Set all new endpoints to return 503 Service Unavailable
- Allows users to use old features while team investigates
- Quick recovery without code redeploy

## Sign-Off

- [ ] Code Review Approved
- [ ] Database Migration Tested
- [ ] QA Testing Complete
- [ ] Documentation Updated
- [ ] Admin Team Briefed
- [ ] Monitoring Configured

**Deployment Date:** _____________
**Deployed By:** _____________
**Approved By:** _____________

## Known Issues & Workarounds

### Issue 1: investorTier undefined in old JWTs
**Solution:** Auth middleware fetches from database, not JWT. Safe for gradual rollout.

### Issue 2: Missing uuid package
**Solution:** Install with `npm install uuid`

### Issue 3: Profile lock too strict
**Solution:** Use `profileLockMiddleware` selectively on endpoints that need it, not globally

### Issue 4: Slow verification lookups
**Solution:** Add Redis cache layer (Phase 3)
