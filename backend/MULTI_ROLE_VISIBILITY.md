# 👥 Multi-Role Profile Visibility - When Users Have ALL 3 Roles

## Overview
When a user signs up as **ALL 3 roles** (Founder + Expert + Investor), other users can now see **all relevant profile data** with privacy filtering applied to each role separately.

---

## 🎭 API Response Format

### GET `/api/roles/profile/:userId`

**Before (Limited):**
```javascript
{
  "profile": {
    "primaryRole": "founder",
    "roles": [
      { "type": "founder", "badges": [...] },
      { "type": "expert", "badges": [...] },
      { "type": "investor", "badges": [...] }
    ],
    "roleData": { /* ONLY founder profile */ }
  }
}
```

**After (Multi-Role) ✅:**
```javascript
{
  "profile": {
    "id": "user-123",
    "name": "Alice Chen",
    "primaryRole": "founder",
    "roles": [
      {
        "type": "founder",
        "badges": ["Early Adopter", "Verified Founder"],
        "verifiedAt": "2026-01-15",
        "profile": {
          /* FOUNDER data - privacy filtered */
          "companyName": "TechStartup Inc",
          "fundingStage": "Series A",
          "teamSize": 15,
          "website": "https://techstartup.com"
        }
      },
      {
        "type": "expert",
        "badges": ["Published Author", "Verified Expert"],
        "verifiedAt": "2026-01-20",
        "profile": {
          /* EXPERT data - privacy filtered */
          "expertise": ["SaaS", "Product Management"],
          "yearsOfExperience": 12,
          "menteeCount": 25,
          "bio": "Product leader..."
        }
      },
      {
        "type": "investor",
        "badges": ["Verified Investor", "50+ Investments"],
        "verifiedAt": "2026-02-01",
        "profile": {
          /* INVESTOR data - privacy filtered */
          "fundName": "XYZ Ventures",
          "investorType": "Angel",
          "industries": ["SaaS", "AI/ML"],
          "ticketSize": { "min": 50000, "max": 500000 }
          /* portfolioCompanies, aum, thesis HIDDEN based on viewer */
        }
      }
    ],
    "trustScore": 95,
    "badges": ["Verified Founder", "Verified Expert", "Verified Investor"],
    "verifications": {
      "email": true,
      "phone": true,
      "linkedIn": true,
      "identity": true
    }
  }
}
```

---

## 🔐 Privacy Filtering Applied Per Role

### Key: Filtering Rules Applied Automatically

```typescript
// FOUNDER viewing multi-role profile
Alice Chen's Investor Profile Shows:
  ✅ fundName
  ✅ investorType
  ✅ industries
  ✅ ticketSize
  ✅ geography
  ✅ website
  ❌ portfolioCompanies (HIDDEN - competitive protection)
  ❌ investmentThesis (HIDDEN)
  ❌ aum (HIDDEN)

// INVESTOR viewing multi-role profile
Alice Chen's Investor Profile Shows:
  ✅ fundName
  ❌ industries (HIDDEN - competitive protection)
  ❌ ticketSize (HIDDEN)
  ❌ geography (HIDDEN)
  ❌ all strategic data (HIDDEN)

// EXPERT viewing multi-role profile
Alice Chen's Expert Profile Shows:
  ✅ expertise areas
  ✅ yearsOfExperience
  ✅ menteeCount
  ✅ bio

Alice Chen's Investor Profile Shows:
  ✅ fundName
  ❌ Detailed invest strategy (LIMITED)

// PUBLIC/UNAUTH viewing multi-role profile
  Message: "This profile is private. Login to view details."
  ❌ All detailed data (HIDDEN)
```

---

## 📊 Visibility Matrix - All Scenarios

### Scenario 1: Founder Views Multi-Role Profile (Founder + Expert + Investor)
```
┌─────────────────────────────────────────────────┐
│ Alice Chen - Founder + Expert + Investor        │
├─────────────────────────────────────────────────┤
│                                                  │
│ 🚀 FOUNDER PROFILE (Full)                      │
│ ├─ Company: TechStartup Inc                    │
│ ├─ Stage: Series A                             │
│ ├─ Team: 15 people                             │
│ └─ Website: techstartup.com                    │
│                                                  │
│ 👨‍💼 EXPERT PROFILE (Full)                       │
│ ├─ Expertise: SaaS, Product Management         │
│ ├─ Experience: 12 years                        │
│ ├─ Mentees: 25                                 │
│ └─ Bio: Product leader...                      │
│                                                  │
│ 💼 INVESTOR PROFILE (Limited)                  │
│ ├─ Fund: XYZ Ventures                          │
│ ├─ Type: Angel                                 │
│ ├─ Industries: SaaS, AI/ML ✓                   │
│ ├─ Ticket: $50K-$500K ✓                        │
│ └─ [Portfolio]: HIDDEN (competitive)           │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Scenario 2: Investor Views Multi-Role Profile
```
┌─────────────────────────────────────────────────┐
│ Alice Chen - Founder + Expert + Investor        │
├─────────────────────────────────────────────────┤
│                                                  │
│ 🚀 FOUNDER PROFILE (Full)                      │
│ ├─ Company: TechStartup Inc                    │
│ ├─ Stage: Series A                             │
│ ├─ Team: 15 people                             │
│ └─ Website: techstartup.com                    │
│                                                  │
│ 👨‍💼 EXPERT PROFILE (Full)                       │
│ ├─ Expertise: SaaS, Product Management         │
│ ├─ Experience: 12 years                        │
│ └─ Mentees: 25                                 │
│                                                  │
│ 💼 INVESTOR PROFILE (Minimal)                  │
│ ├─ Fund: XYZ Ventures                          │
│ ├─ Type: Angel                                 │
│ └─ [Details]: HIDDEN (competitive)             │
│    "Limited details to protect investor        │
│     strategy and portfolio composition"        │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Scenario 3: Expert Views Multi-Role Profile
```
┌─────────────────────────────────────────────────┐
│ Alice Chen - Founder + Expert + Investor        │
├─────────────────────────────────────────────────┤
│                                                  │
│ 🚀 FOUNDER PROFILE (Full)                      │
│ ├─ Company: TechStartup Inc                    │
│ ├─ Stage: Series A                             │
│ └─ Team: 15 people                             │
│                                                  │
│ 👨‍💼 EXPERT PROFILE (Full)                       │
│ ├─ Expertise: SaaS, Product Management         │
│ ├─ Experience: 12 years                        │
│ ├─ Mentees: 25                                 │
│ └─ Bio: Product leader...                      │
│                                                  │
│ 💼 INVESTOR PROFILE (Limited)                  │
│ ├─ Fund: XYZ Ventures                          │
│ └─ [Details]: HIDDEN (competitive)             │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Details

### Code Location
**File:** `backend/src/controllers/roleApplicationController.ts:226-242`

### How It Works

```typescript
// Step 1: Get all verified roles
const verifiedRoles = (user.roles || []).filter(
    (r: UserRole) => r.status === ROLE_STATUS.VERIFIED
);

// Step 2: For each role, apply privacy filtering
const rolesWithData = verifiedRoles.map((r: UserRole) => {
    const profileData = (user as any)[`${r.type}ProfileData`] || {};

    // Apply privacy filter based on viewer's role
    const filteredData = filterRoleDataByViewerRole(
        profileData,
        r.type,              // This role type (founder/expert/investor)
        viewerRoleType,      // Viewer's role (who's looking)
        viewerId || '',
        userId               // Profile owner's ID
    );

    return {
        type: r.type || r.role,
        badges: r.badges,
        verifiedAt: r.verifiedAt,
        profile: filteredData  // Privacy-filtered data
    };
});

// Step 3: Return all roles with filtered data
{
  "roles": rolesWithData,  // ✅ Includes profile for each role
  "primaryRole": "founder"
}
```

### Privacy Filter Rules
Located in: `filterRoleDataByViewerRole` function (line 22)

```typescript
const filterRoleDataByViewerRole = (
  roleData: any,         // Data to filter
  roleType: string,      // What role is this? (investor/expert/founder)
  viewerRole: string,    // Who's looking? (what's viewer's primary role)
  viewerId: string,      // Who are they? (ID)
  profileUserId: string  // Profile owner's ID
) => {
    // Self always sees everything
    if (viewerId === profileUserId) return roleData;

    // Admins see everything
    if (viewerRole === 'admin') return roleData;

    // Apply role-specific rules
    if (roleType === 'investor') {
        // Founders see: investorType, industries, ticketSize, geography, website
        // Other investors see: only fundName
        // Public sees: nothing
    }

    // Founder & Expert roles have less strict filtering
}
```

---

## 📱 Frontend Structure

### Example: Render All Roles

```typescript
// response.profile.roles = [
//   { type: 'founder', badges: [...], profile: {...} },
//   { type: 'expert', badges: [...], profile: {...} },
//   { type: 'investor', badges: [...], profile: {...} }
// ]

response.profile.roles.forEach(role => {
  // Render role tab/section
  console.log(`${role.type} Profile`);
  console.log(`Badges: ${role.badges.join(', ')}`);
  console.log(`Data:`, role.profile);  // Privacy-filtered
});
```

---

## ✅ Example: Complete Response for Multi-Role User

```json
{
  "success": true,
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Alice Chen",
    "email": null,
    "primaryRole": "founder",
    "roles": [
      {
        "type": "founder",
        "badges": ["Early Adopter", "Verified Founder"],
        "verifiedAt": "2026-01-15T10:30:00Z",
        "profile": {
          "companyName": "TechStartup Inc",
          "fundingStage": "Series A",
          "teamSize": 15,
          "website": "https://techstartup.com",
          "productDescription": "SaaS platform for enterprise automation",
          "targetMarket": "US & Europe"
        }
      },
      {
        "type": "expert",
        "badges": ["Published Author", "Verified Expert"],
        "verifiedAt": "2026-01-20T14:22:00Z",
        "profile": {
          "expertise": ["SaaS", "Product Management", "Fundraising"],
          "yearsOfExperience": 12,
          "menteeCount": 25,
          "bio": "15+ years in product. Built teams from 0-100. Now mentoring founders.",
          "hourlyRate": 150,
          "availability": "2 hours/week"
        }
      },
      {
        "type": "investor",
        "badges": ["Verified Investor", "50+ Investments"],
        "verifiedAt": "2026-02-01T09:15:00Z",
        "profile": {
          "fundName": "XYZ Ventures",
          "investorType": "Angel",
          "industries": ["SaaS", "AI/ML", "FinTech"],
          "ticketSize": {
            "min": 50000,
            "max": 500000
          },
          "geography": ["North America", "Europe"],
          "website": "https://xyzventures.com"
        }
      }
    ],
    "badges": [
      "Early Adopter",
      "Verified Founder",
      "Published Author",
      "Verified Expert",
      "Verified Investor",
      "50+ Investments"
    ],
    "trustScore": 95,
    "verificationLevel": "verified",
    "verifications": {
      "email": true,
      "phone": true,
      "linkedIn": true,
      "identity": true
    }
  }
}
```

---

## 🎯 Benefits

✅ **Users see ALL relevant data** - No information loss
✅ **Privacy-filtered per role** - Competitive info still protected
✅ **Clear role indicators** - Badges show all active roles
✅ **Better networking** - Can connect with people in multiple capacities
✅ **Flexible relationships** - Work with someone as founder AND investor

---

## 🔒 Security Notes

- **Email hidden** from non-self viewers (appears as `null`)
- **Each role filtered separately** based on viewer's role
- **Audit logging** tracks all profile access
- **Rate limiting** prevents scraping (30 req/min per user)
- **Public users** see private message, no data

---

## 📝 Testing

### Test Case 1: Founder Views Multi-Role Profile
```bash
GET /api/roles/profile/{userId}
Authorization: Bearer {founderToken}

Expected: Sees all 3 roles with founder-level filtering on investor data
```

### Test Case 2: Investor Views Multi-Role Profile
```bash
GET /api/roles/profile/{userId}
Authorization: Bearer {investorToken}

Expected: Sees all 3 roles with investor-level filtering
```

### Test Case 3: Self Views Own Profile
```bash
GET /api/roles/profile/{ownUserId}
Authorization: Bearer {ownToken}

Expected: Sees 100% unfiltered data for all roles
```

---

## 📌 Summary

| Scenario | Founder Profile | Expert Profile | Investor Profile |
|----------|-----------------|-----------------|-----------------|
| **Self** | ✅ Full | ✅ Full | ✅ Full |
| **Founder viewing** | ✅ Full | ✅ Full | ⚠️ Limited |
| **Investor viewing** | ✅ Full | ✅ Full | ⚠️ Minimal |
| **Expert viewing** | ✅ Full | ✅ Full | ⚠️ Limited |
| **Public viewing** | ❌ Hidden | ❌ Hidden | ❌ Hidden |

---

*Implementation: April 14, 2026*
*Feature: Multi-Role Profile Visibility*
