# Investor Verification System - Phase 1 Implementation Guide

## Overview
This document outlines the investor verification system Phase 1 implementation, which introduces a 3-tier verification system for investor accounts.

## Tier System

### Tier 1: Unverified (Default)
- **Access Level:** View-only (read-only access)
- **Requirements:** None (auto-assigned to all new investor accounts)
- **Features Blocked:**
  - Send messages
  - Express investment interest
  - Create or modify profiles
  - Access private deal rooms
  - Bookmark startups
  - Apply for direct investments
- **Unlock Path:** Complete LinkedIn verification + complete 80% of profile fields

### Tier 2: Verified
- **Access Level:** Full investor features
- **Requirements:**
  - LinkedIn profile verified via URL validation
  - 80% profile completion (6/7 required fields)
- **Auto-Promotion:** Triggered when both conditions met
- **Features Unlocked:**
  - Full messaging access
  - Express investment interest in startups
  - Modify profile
  - Browse all startups
  - Bookmark/save startups
  - Access semi-private deal rooms
  - Submit direct investment applications

### Tier 3: Accredited
- **Access Level:** Full access including accredited investor features
- **Requirements:**
  - Admin manual review and approval
  - Proof of accredited investor status (external verification)
- **Use Case:** Professional VCs, accredited angel investors, institutional investors
- **Features Added:**
  - Access all private deal rooms
  - Special accredited deal terms
  - Priority in funding rounds
  - Direct founder communication priority

## Database Schema

### New Tables

#### `investor_verifications`
Tracks all social account verifications for investors.

```sql
CREATE TABLE investor_verifications (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,     -- 'linkedin', 'twitter', 'github', 'angellist'
  platform_url TEXT,
  verified_at TIMESTAMPTZ,
  verification_method VARCHAR(50),   -- 'url_validation', 'api_validation', 'manual'
  is_valid BOOLEAN,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
```

#### `admin_verification_queue`
Queue for manual Tier 3 accreditation reviews.

```sql
CREATE TABLE admin_verification_queue (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  tier_requested INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  profile_data JSONB,
  notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tier_requested, status) WHERE status = 'pending'
);
```

### User Data Updates

User tier information is stored in the `users` table JSONB data column:

```json
{
  "id": "user-123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "role": "investor",
  "investorTier": 2,
  "verifications": {
    "linkedin": {
      "verified": true,
      "url": "https://linkedin.com/in/johndoe",
      "verifiedAt": "2026-03-31T10:00:00Z"
    }
  },
  "profileCompletion": {
    "percentage": 85,
    "completedFields": ["firstName", "lastName", "email", "company", "role", "profileImage"]
  },
  "adminVerification": {
    "status": "none"
  }
}
```

## API Endpoints

### Investor Endpoints

#### Get Verification Status
```
GET /api/verification/investor/status
Authorization: Bearer <jwt>
```

Response:
```json
{
  "investorTier": 2,
  "tierName": "Verified",
  "verifications": {
    "linkedin": {
      "verified": true,
      "url": "https://linkedin.com/in/johndoe",
      "verifiedAt": "2026-03-31T10:00:00Z"
    }
  },
  "profileCompletion": {
    "percentage": 85,
    "completedFields": ["firstName", "lastName", "email", "company", "role", "profileImage"],
    "requiredFields": ["firstName", "lastName", "email", "company", "role", "profileImage"]
  },
  "adminVerification": {
    "status": "none"
  },
  "isProfileLocked": false
}
```

#### Verify Social Account
```
POST /api/verification/investor/verify-social
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "platform": "linkedin",
  "profileUrl": "https://linkedin.com/in/johndoe"
}
```

Response:
```json
{
  "message": "Social account verified successfully",
  "platform": "linkedin",
  "verified": true,
  "tierPromoted": true,
  "newTier": 2
}
```

Supported Platforms:
- LinkedIn: `https://linkedin.com/in/[username]`
- Twitter: `https://twitter.com/[handle]`
- GitHub: `https://github.com/[username]`
- AngelList: `https://angel.co/[username]`

#### Get Investor Profile
```
GET /api/verification/investor/profile
Authorization: Bearer <jwt>
```

Or read another investor's profile (admin only):
```
GET /api/verification/investor/profile/:investorId
Authorization: Bearer <jwt>
```

Response:
```json
{
  "investorTier": 2,
  "tierName": "Verified",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "company": "Venture Capital",
    "role": "Partner",
    "bio": "Investing in early-stage startups",
    "profileImage": "https://..."
  },
  "verifications": {
    "linkedin": {
      "verified": true,
      "url": "https://linkedin.com/in/johndoe",
      "verifiedAt": "2026-03-31T10:00:00Z"
    }
  },
  "verificationRecords": [
    {
      "platform": "linkedin",
      "is_valid": true,
      "verified_at": "2026-03-31T10:00:00Z"
    }
  ],
  "adminVerification": {
    "status": "none"
  },
  "createdAt": "2026-03-15T00:00:00Z",
  "updatedAt": "2026-03-31T10:00:00Z"
}
```

#### Request Accreditation Review (Tier 3)
```
POST /api/verification/investor/request-accreditation
Authorization: Bearer <jwt>
Content-Type: application/json
```

Response:
```json
{
  "message": "Accreditation request submitted successfully",
  "queueId": "queue-123",
  "status": "pending"
}
```

### Admin Endpoints

#### Get Pending Verifications
```
GET /api/verification/admin/pending?status=pending&limit=50
Authorization: Bearer <admin-jwt>
```

Response:
```json
{
  "total": 5,
  "queue": [
    {
      "id": "queue-123",
      "user_id": "user-456",
      "tier_requested": 3,
      "status": "pending",
      "profile_data": {...},
      "created_at": "2026-03-31T09:00:00Z"
    }
  ]
}
```

#### Approve Investor Verification
```
POST /api/verification/admin/approve/:queueId
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "notes": "Verified credentials, accredited investor status confirmed"
}
```

Response:
```json
{
  "message": "Investor verified successfully",
  "userId": "user-456",
  "newTier": 3
}
```

#### Reject Investor Verification
```
POST /api/verification/admin/reject/:queueId
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "reason": "Credentials could not be verified"
}
```

Response:
```json
{
  "message": "Verification request rejected",
  "userId": "user-456"
}
```

## Middleware

### `enforceInvestorTier(requiredTier)`
Middleware to enforce tier-based access control on endpoints.

```typescript
router.get('/exclusive-feature', protect, enforceInvestorTier(2), exclusiveFeatureHandler);
```

### `profileLockMiddleware`
Blocks all write operations (PUT, POST, DELETE, PATCH) for Tier 1 (Unverified) investors.

### `requireVerifiedInvestor`
Convenience middleware that requires Tier 2+ access.

### `attachInvestorTierInfo`
Automatically attaches tier information to request object for logging/tracking.

## Implementation Steps

### 1. Database Migration
Run the migration to create new tables and indexes:
```bash
psql -U <user> -d <database> -f migrations/002_investor_verification_system.sql
```

### 2. Deploy Backend Changes
- Update verificationController.ts with new endpoints
- Update verificationRoutes.ts with new routes
- Update auth middleware to attach investorTier
- Deploy investorTier middleware

### 3. Frontend Implementation (Phase 1 Partial)
- Profile completion progress UI
- LinkedIn verification button/modal
- Tier status display
- Profile lock message for Tier 1 users

### 4. Testing
- Test profile verification flow
- Test auto-tier promotion
- Test admin approval/rejection
- Test tier-based access control

## Security Considerations

### URL Validation (Phase 1)
- Validates URL format against platform-specific patterns
- No external API calls (simpler, but allows false positives)
- Future Phase 2: API validation for real verification

### Profile Locking
- Tier 1 investors cannot modify profiles until verified
- Enforced at middleware level (fails safely if bypassed)
- Frontend should also hide edit buttons

### Admin Reviews
- Only admins can approve Tier 3 requests
- Admin actions are logged (reviewed_by, reviewed_at)
- Users receive rejection reasons

### Token Leakage Prevention
- investorTier passed from database on each request (no stale JWT tier)
- If user's tier changes, next request reflects new tier immediately

## Monitoring & Analytics

### Metrics to Track
- Tier distribution (% Tier 1, 2, 3)
- Verification completion rate
- Time to first verification
- LinkedIn verification success rate
- Time to Tier 2 conversion

### Error Scenarios
- Invalid profile URL format → 400 Bad Request
- Duplicate platform verification → Overwrite previous
- User not found → 404 Not Found
- Admin access denied → 403 Forbidden
- Queue entry not found → 404 Not Found

## Future Phases

### Phase 2: LinkedIn OAuth Integration
- Real-time profile data extraction
- Auto-tier upgrade based on profile completeness
- One-click verification

### Phase 3: Additional Verification Methods
- Twitter verification via API
- GitHub contributions analysis
- AngelList portfolio review
- Stripe account verification for payment history

### Phase 4: Accredited Investor Documentation
- SEC filing verification
- Document upload for manual review
- Blockchain-based verification (optional)

## Rollback Plan

If issues arise:
1. Revert database migration: `DROP TABLE investor_verifications, admin_verification_queue;`
2. Revert code to previous branch
3. Users default to Tier 1 if investorTier column missing
4. No data loss (all verification records preserved if rollback deferred)

## FAQ

**Q: What happens to existing investors?**
A: Auto-assigned Tier 1 (Unverified), must verify to get Tier 2

**Q: Can Tier 1 view startups?**
A: Yes, view-only. Cannot interact or message.

**Q: Is LinkedIn OAuth required?**
A: No, Phase 1 uses URL validation. OAuth is Phase 2 optional.

**Q: Can tier be downgraded?**
A: Not automatically. Admins can reassign manually if needed.

**Q: How long does admin review take?**
A: Depends on team, ~24-48 hours typical.

**Q: What if LinkedIn URL changes?**
A: Can be re-verified with new URL, maintains Tier 2.
