# Investor Verification Strategy for NextIgnition

**Issue:** Anyone can claim to be an investor without verification. This threatens platform integrity and founder trust.

**Solution Proposed:** Multi-tier investor verification with progressive access based on verification level.

---

## Current State Analysis

### What EXISTS:
```typescript
// ✅ Social account verification (LinkedIn, Twitter, GitHub, etc.)
export const verifySocialAccount = async (platform, url) => {...}

// ✅ Basic isVerified boolean flag on users
{ ..., isVerified: boolean, ... }

// ✅ Verification banner system
verificationBannerDismissedUntil: timestamp
```

### What DOESN'T EXIST:
```typescript
// ❌ Investor-specific verification requirements
// ❌ Profile lock mechanism
// ❌ Verification status by platform (LinkedIn verified, Twitter verified, etc.)
// ❌ Investor accreditation checks
// ❌ Multi-stage verification workflow
// ❌ Admin verification dashboard for investor reviews
// ❌ Investor tier system (verified investor, accredited investor, fund manager)
```

---

## Recommended Solution: 3-Tier Investor Verification System

### Tier 1: Unverified Investor (Current State)
```
Status: 🔴 RED - Limited Access
Access Level:
- ✅ Can login
- ✅ Can view startups (read-only)
- ✅ Can browse but cannot message
- ❌ Cannot express interest
- ❌ Cannot join deal rooms
- ❌ Cannot see investor-only content

Requirements: None (anyone with email can get this)
```

### Tier 2: Verified Investor (Intermediate)
```
Status: 🟡 YELLOW - Partial Access
Access Level:
- ✅ All Tier 1 features
- ✅ Can message founders
- ✅ Can express interest in startups
- ✅ Can join public deal rooms
- ✅ Can see investor pipeline
- ❌ Cannot access private deal rooms
- ❌ Cannot close deals

Requirements to achieve:
1. LinkedIn profile verified (URL check + validation)
2. Profile 80% complete (bio, avatar, industry focus)
3. At least 1 social account verified
4. Email verified
```

### Tier 3: Accredited Investor (Full Access)
```
Status: 🟢 GREEN - Full Access
Access Level:
- ✅ All Tier 2 features
- ✅ Access all deal rooms
- ✅ Can upload term sheets
- ✅ Can close funding rounds
- ✅ Featured in investor marketplace
- ✅ Can syndicate investments

Requirements to achieve:
1. LinkedIn verified with 5+ years experience shown
2. All Tier 2 requirements met
3. Admin manual review & approval
4. Industry/investment history validation
5. Optional: SEC accreditation proof (self-attestation)
```

---

## Implementation Plan

### Phase 1: Update User Model (Week 1)

**New fields to add to `users` table:**

```typescript
interface InvestorVerification {
  // Verification Tier
  investorTier: 'unverified' | 'verified' | 'accredited';

  // Verification Status by Platform
  verifications: {
    linkedin: {
      verified: boolean;
      url: string;
      verifiedAt: timestamp;
      profileData: {
        name: string;
        headline: string;
        profileUrl: string;
        yearsExperience?: number;
      }
    };
    twitter: {
      verified: boolean;
      url: string;
      verifiedAt: timestamp;
      followers?: number;
    };
    github: {
      verified: boolean;
      url: string;
      verifiedAt: timestamp;
    };
    website: {
      verified: boolean;
      url: string;
      verifiedAt: timestamp;
    };
  };

  // Profile Completion
  profileCompletion: {
    bio: boolean;
    avatar: boolean;
    coverPhoto: boolean;
    investmentFocus: boolean;
    fundSize: boolean;
    yearsInvesting: boolean;
    completionPercentage: number; // 0-100
  };

  // Admin Verification
  adminVerification: {
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string; // admin user id
    reviewedAt?: timestamp;
    notes?: string;
  };

  // Accreditation (Optional)
  accreditation: {
    selfAttested: boolean;
    sECVerified: boolean;
    verifiedAt?: timestamp;
  };
}
```

### Phase 2: Update Verification Controller (Week 1)

**New Endpoints:**

```typescript
// GET /api/verification/investor-status
// Returns current tier and what's needed for next tier
export const getInvestorVerificationStatus = async (req: AuthRequest, res: Response) => {
  // Returns:
  // {
  //   currentTier: 'unverified' | 'verified' | 'accredited',
  //   profileCompletion: 65%,
  //   verifications: { linkedin: ✅, twitter: ❌, ... },
  //   nextTierRequirements: [
  //     { requirement: 'LinkedIn verified', status: 'pending', action: 'verify_linkedin' },
  //     { requirement: 'Profile 80% complete', status: 'pending', completion: 65 }
  //   ]
  // }
};

// POST /api/verification/verify-social-account
// { platform: 'linkedin', url: 'https://linkedin.com/in/...' }
// Verifies and stores the account
export const verifySocialAccount = async (req: AuthRequest, res: Response) => {
  // 1. Validate URL format
  // 2. Verify account existence (using existing verifySocialAccount function)
  // 3. Extract profile data (especially for LinkedIn)
  // 4. Store verification in database
  // 5. Check if tier upgrade is possible
  // 6. If yes, trigger tier 2 badges
};

// POST /api/verification/request-accreditation-review
// Submits investor profile for admin manual review to tier 3
export const requestAccreditationReview = async (req: AuthRequest, res: Response) => {
  // 1. Check if user meets tier 2 requirements
  // 2. If not, reject with specific missing items
  // 3. If yes, submit for admin review
  // 4. Admin gets notified
  // 5. Return success with "review pending" status
};

// GET /api/verification/admin/pending-reviews (ADMIN ONLY)
// Lists all investors pending accreditation review
export const getPendingAccreditationReviews = async (req: AdminRequest, res: Response) => {
  // Returns list of investors with:
  // - Profile data
  // - LinkedIn verification details
  // - Investment experience
  // - Years as investor
  // - Verification status by platform
};

// POST /api/verification/admin/approve/:userId (ADMIN ONLY)
export const approveInvestorAccreditation = async (req: AdminRequest, res: Response) => {
  // Upgrades investor to tier 3 'accredited'
};

// POST /api/verification/admin/reject/:userId (ADMIN ONLY)
export const rejectInvestorAccreditation = async (req: AdminRequest, res: Response) => {
  // Rejects with reason, stays at tier 2
};
```

### Phase 3: Frontend Profile Lock (Week 2)

**Profile Lock Mechanism:**

```typescript
// Check at each investor action:
if (user.investorTier === 'unverified') {
  // Show modal: "Complete verification to unlock this feature"
  // Display:
  // - Current progress (LinkedIn ✅, Twitter ❌, Profile 60%)
  // - What's needed (LinkedIn + 80% profile complete)
  // - Quick links to verify each platform
  // - Estimated time: 5 minutes
}

// Lock specific features based on tier:
const featureAccess = {
  'express_interest': ['verified', 'accredited'],
  'message_founder': ['verified', 'accredited'],
  'view_deal_room': {
    'public': ['verified', 'accredited'],
    'private': ['accredited'] // only
  },
  'close_funding': ['accredited'],
  'upload_term_sheet': ['accredited']
};
```

### Phase 4: LinkedIn Deep Integration (Week 2-3)

**Option A: OAuth2 LinkedIn Integration (Recommended)**
```typescript
// POST /api/auth/linkedin
// Redirects to LinkedIn OAuth
// Once authenticated, automatically:
// 1. Fetches LinkedIn profile data (name, company, position, etc.)
// 2. Verifies it's a real LinkedIn account
// 3. Extracts years of experience
// 4. Stores profile data
// 5. Auto-upgrades to tier 2 if requirements met

// LinkedIn scopes needed:
// - r_liteprofile (basic info)
// - r_emailaddress (email)
// - r_basicprofile (experience, education)

// This is MUCH more reliable than URL scraping
```

**Option B: URL Verification (Current Approach - Enhanced)**
```typescript
// Keep the current verifySocialAccount but enhance it:
// 1. User provides LinkedIn URL
// 2. System verifies URL validity
// 3. System displays: "LinkedIn profile found - Profile name, Company, Years"
// 4. User confirms it's theirs
// 5. Stored as verified

// Problem: Can't extract detailed data without OAuth
// Solution: User manually confirms details match their profile
```

**My Recommendation:** Use OAuth2 for LinkedIn + URL verification fallback
- OAuth = 95% accurate, real data extraction
- URL verification = fallback if OAuth unavailable

---

## Database Schema Changes

### Users Table Additions:

```sql
-- Add these columns to users.data (JSON)
ALTER TABLE public.users
ADD COLUMN investor_tier TEXT DEFAULT 'unverified'; -- unverified, verified, accredited

-- Add JSON structure for verifications
-- investor_verifications: { linkedin: {...}, twitter: {...}, ... }

-- Add profile completion tracking
-- profile_completion: { bio: 0/1, avatar: 0/1, ... }

-- Add admin review tracking
-- admin_verification: { status: 'pending'|'approved'|'rejected', ... }

-- Create new table for verification audit log
CREATE TABLE verification_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT, -- 'tier_upgraded', 'verification_submitted', 'manual_verification_completed'
  previous_tier TEXT,
  new_tier TEXT,
  verified_platforms TEXT[], -- array of platforms
  admin_id UUID, -- if admin action
  timestamp TIMESTAMP,
  notes TEXT
);

-- Create admin verification queue
CREATE TABLE investor_verification_queue (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status TEXT, -- 'pending', 'approved', 'rejected'
  submitted_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  profile_snapshot JSONB -- snapshot of user profile at time of submission
);
```

---

## Verification Flow - Visual

### User Journey:

```
┌─ Login as Investor
│
├─ TIER 1: UNVERIFIED (Default)
│  └─ See banner: "Verify your profile to unlock investor features"
│     └─ Complete 3 of 5 actions:
│        ├─ Verify LinkedIn (click → verify → confirm)
│        ├─ Verify Twitter (click → verify → confirm)
│        ├─ Complete Bio (edit profile → save)
│        ├─ Upload Avatar (upload → save)
│        └─ Set Investment Focus (select → save)
│
├─ TIER 2: VERIFIED (When ~80% complete + 1 social verified)
│  ✅ Can now:
│  ├─ Message founders
│  ├─ Express interest in startups
│  ├─ View investor pipeline
│  └─ Join public deal rooms
│
│  See banner: "Become an accredited investor (optional)"
│  └─ Need Admin approval:
│     ├─ LinkedIn verified with 5+ years experience shown
│     ├─ All tier 2 requirements met
│     └─ Click "Request Accreditation Review"
│        └─ Submitted to admin queue
│
└─ TIER 3: ACCREDITED (After admin approval)
   ✅ Can now:
   ├─ Access all private deal rooms
   ├─ Upload term sheets
   ├─ Close funding rounds
   └─ Featured as "Verified Investor"
```

---

## Configuration & Environment Variables

```env
# LinkedIn OAuth (if implementing OAuth)
LINKEDIN_CLIENT_ID=xxxxx
LINKEDIN_CLIENT_SECRET=xxxxx
LINKEDIN_REDIRECT_URI=https://yourapp.com/auth/linkedin/callback

# Microlink API for scraping verification
MICROLINK_API_KEY=xxxxx (optional for LinkedIn scraping)

# Feature flags
INVESTOR_VERIFICATION_ENABLED=true
REQUIRE_INVESTOR_VERIFICATION_TIER2=verified
REQUIRE_FOR_MESSAGING=verified
REQUIRE_FOR_DEAL_ROOMS=accredited
```

---

## Implementation Timeline

| Phase | Task | Timeline | Effort |
|-------|------|----------|--------|
| 1 | Database schema + user model | Week 1 | 4 hours |
| 2 | Verification controller endpoints | Week 1 | 6 hours |
| 3 | Frontend - profile lock warnings | Week 2 | 4 hours |
| 4 | LinkedIn OAuth integration | Week 2-3 | 8 hours |
| 5 | Admin review dashboard | Week 2 | 6 hours |
| 6 | Tier-based access control | Week 3 | 4 hours |
| 7 | Testing + edge cases | Week 3 | 6 hours |
| **Total** | | **3 weeks** | **38 hours** |

---

## Security Considerations

### ✅ DO:
```typescript
// 1. Verify social accounts are real before storing
if (!(await verifySocialAccount(platform, url))) {
  return res.status(400).json({ message: 'Invalid social URL - account not found' });
}

// 2. Store verification timestamp (prevents fake verifications)
verifications.linkedin.verifiedAt = new Date().toISOString();

// 3. Admin can see audit log of all verifications
// Track: who verified, when, which accounts

// 4. Re-verify periodically (LinkedIn link may go dead)
// Check if verification is still valid on login

// 5. Prevent tier downgrade after funding (trust stays)
// ie. If investor already invested and is tier 3, stays tier 3
```

### ❌ DON'T:
```typescript
// ❌ Allow profile lock to be dismissed permanently
// User can dismiss banner but should see it on next login

// ❌ Auto-upgrade to accredited without admin review
// Accreditation is manual process only

// ❌ Trust only URL without verification
// Must actually validate account exists

// ❌ Share verification details publicly
// Keep LinkedIn data private (admin eyes only)

// ❌ Allow same investor account to use multiple profiles
// One investor = one account (prevent fraud)
```

---

## Investor Tier Usage in Code

### Middleware to Enforce Tiers:

```typescript
// Protect routes that require investor verification
export const requireInvestorTier = (tier: 'verified' | 'accredited') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const { data } = await supabase.from('users').select('data').eq('id', user.id).single();

    const userTier = data.investorTier || 'unverified';

    const tierHierarchy = { unverified: 0, verified: 1, accredited: 2 };
    if (tierHierarchy[userTier] < tierHierarchy[tier]) {
      return res.status(403).json({
        message: `This feature requires ${tier} investor status`,
        currentTier: userTier,
        requiredTier: tier,
        action: 'verify_profile'
      });
    }
    next();
  };
};

// Usage in routes:
router.post('/api/deal-rooms/:id/access',
  requireInvestorTier('accredited'),
  accessDealRoom
);

router.post('/api/startups/:id/express-interest',
  requireInvestorTier('verified'),
  expressInterest
);
```

---

## Success Metrics

After implementation, track:

| Metric | Baseline | Target (3 months) |
|--------|----------|------------------|
| % Investors Verified | 0% | 60%+ |
| % Investors Accredited | 0% | 15%+ |
| Avg profile completion | 40% | 75%+ |
| Social links verified | 5% | 50%+ |
| Founder-Investor matches | baseline | +40% |
| Deal room activity | baseline | +60% |
| False investor claims | High | <5% |

---

## Recommended Approach: Hybrid Strategy

### Week 1-2: Quick Win (URL Verification Enhanced)
- ✅ Add investor tiers to user model
- ✅ Enhance URL verification (what we have now)
- ✅ Add profile lock for tier 1
- ✅ Profile completion tracking
- Timeline: 2 weeks, minimal risk

### Week 3-4: Long Term (LinkedIn OAuth)
- ✅ Add LinkedIn OAuth integration
- ✅ Auto-extract years of experience
- ✅ Admin review dashboard
- Timeline: 2 weeks, more reliable

### Result:
- Day 1: Basic tiers active, URL verification required
- Week 2: LinkedIn OAuth available (users can choose between OAuth or URL)
- Week 3: Most users tier 2+, admin reviewing accreditations

---

## Questions to Decide:

1. **LinkedIn OAuth or URL Verification?**
   - OAuth: More secure, auto-extract data, better UX
   - URL: Faster to implement, less user friction
   - **Recommendation:** Start with URL, add OAuth later

2. **Profile Lock Strictness?**
   - Strict: Tier 1 can only view startups (current proposal)
   - Relaxed: Tier 1 can message but marked as "unverified investor"
   - **Recommendation:** Strict approach better for founder trust

3. **Admin Review Requirement for Tier 2?**
   - Auto-upgrade: User gets tier 2 automatically after LinkedIn verification
   - Manual: Tier 2 also requires admin review
   - **Recommendation:** Auto-upgrade to tier 2, manual only for tier 3

4. **Accreditation Proof?**
   - Self-attestation only (honor system)
   - Request SEC documents (US only, complex)
   - Bank statements (very invasive)
   - **Recommendation:** Self-attestation + admin can manually verify

---

## Files You'll Need to Create/Modify

### New Files:
```
backend/src/models/InvestorVerification.ts (interface)
backend/migrations/add_investor_verification.sql
backend/src/middleware/requireInvestorTier.ts
backend/src/routes/investorVerificationRoutes.ts
frontend/hooks/useInvestorVerification.ts
frontend/components/VerificationBanner.tsx
frontend/pages/InvestorVerification.tsx
```

### Modified Files:
```
backend/src/controllers/verificationController.ts (add new endpoints)
backend/src/utils/socialVerifier.ts (enhance LinkedIn detection)
backend/src/controllers/userController.ts (add tier checks)
frontend/components/StartupCard.tsx (show verification badges)
frontend/pages/DealRoom.tsx (enforce tier access)
```

---

**This ensures only serious, credible investors can access senior deal rooms while giving new investors a clear path to full platform access.**
