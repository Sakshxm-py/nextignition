# 👥 ROLE 3 (INVESTOR) PROFILE VISIBILITY - What Users See

## The Question Client Asked:
> "If I signup as a 3 role [Investor], then how user will see us? What they will see on our profile?"

## ANSWER: Privacy-Based Visibility

### 📊 VISIBILITY MATRIX

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WHO SEES WHAT ON YOUR PROFILE                   │
├──────────────────┬──────────────────────────────────────────────────┤
│     VIEWER       │               WHAT THEY SEE                       │
├──────────────────┼──────────────────────────────────────────────────┤
│                  │                                                   │
│ 🔓 YOU (Self)    │ ✓ Portfolio companies                            │
│                  │ ✓ Investment thesis                               │
│                  │ ✓ Deal stage preferences                          │
│                  │ ✓ Fund AUM (Assets Under Management)              │
│                  │ ✓ Preferred industries                            │
│                  │ ✓ ALL personal data                               │
│                  │ (COMPLETE PROFILE)                                │
│                  │                                                   │
├──────────────────┼──────────────────────────────────────────────────┤
│                  │                                                   │
│ 🚀 FOUNDER       │ ✓ Investment focus                               │
│                  │ ✓ Ticket size (how much you invest)               │
│                  │ ✓ Industries you invest in                        │
│                  │ ✓ Geography you cover                             │
│                  │ ✓ Website                                         │
│                  │ ✓ Fund name                                       │
│                  │                                                   │
│                  │ ✗ HIDDEN: Portfolio companies                    │
│                  │ ✗ HIDDEN: Investment thesis/strategy              │
│                  │ ✗ HIDDEN: Deal preferences                        │
│                  │ ✗ HIDDEN: Fund AUM                                │
│                  │                                                   │
│                  │ (CURATED FOR PITCHING)                            │
│                  │                                                   │
├──────────────────┼──────────────────────────────────────────────────┤
│                  │                                                   │
│ 💼 OTHER         │ ✓ Fund name (public info)                       │
│ INVESTOR/EXPERT  │ ✓ Investment type                                │
│                  │                                                   │
│                  │ ✗ HIDDEN: Portfolio companies                    │
│                  │ ✗ HIDDEN: Investment thesis                      │
│                  │ ✗ HIDDEN: Deal preferences                       │
│                  │ ✗ HIDDEN: AUM                                    │
│                  │ ✗ HIDDEN: Specific industries                    │
│                  │ ✗ HIDDEN: Geography                              │
│                  │                                                   │
│                  │ (LIMITED - COMPETITIVE PROTECTION)                │
│                  │                                                   │
├──────────────────┼──────────────────────────────────────────────────┤
│                  │                                                   │
│ 👤 PUBLIC USER   │ ✗ HIDDEN: Portfolio                              │
│ / UNAUTH         │ ✗ HIDDEN: Thesis                                 │
│                  │ ✗ HIDDEN: Deal details                           │
│                  │ ✗ HIDDEN: Fund info                              │
│                  │                                                   │
│                  │ Message: "This profile is private. Login to view  │
│                  │ more details."                                    │
│                  │                                                   │
│                  │ (MAXIMUM PRIVACY)                                 │
│                  │                                                   │
└──────────────────┴──────────────────────────────────────────────────┘
```

## 🎯 HOW THIS WORKS IN CODE

### Your Investment Profile (Role 3)
```javascript
// What you SUBMIT when signing up as investor
{
  "role": "investor",
  "profileData": {
    "investorType": "Angel",
    "industries": ["SaaS", "AI/ML", "FinTech"],
    "ticketSize": { "min": 50000, "max": 500000 },
    "geography": ["North America", "Europe"],
    "website": "https://yourfund.com",
    "fundName": "XYZ Ventures",

    // PRIVATE - Hidden from competitors
    "portfolioCompanies": ["Uber", "Airbnb", "Stripe"],
    "investmentThesis": "We invest in B2B SaaS solving enterprise problems",
    "dealStagePreferences": "Series A-C",
    "aum": 50000000,
    "preferredStage": "growth"
  }
}
```

### When A FOUNDER Views Your Profile
```javascript
// What founder sees (filtered for pitching)
{
  "name": "Alice Chen",
  "foundName": "XYZ Ventures",
  "investorType": "Angel",
  "industries": ["SaaS", "AI/ML", "FinTech"],  // They see what you invest in
  "ticketSize": { "min": 50000, "max": 500000 },  // They know you can fund them
  "geography": ["North America", "Europe"],
  "website": "https://yourfund.com",

  // ❌ PRIVATE FIELDS REMOVED
  // portfolioCompanies: [HIDDEN],
  // investmentThesis: [HIDDEN],
  // dealStagePreferences: [HIDDEN],
  // aum: [HIDDEN],

  badges: ["Verified Investor", "50+ Investments"],
  trustScore: 92,
  verificationLevel: "verified"
}
```

### When ANOTHER INVESTOR Views Your Profile
```javascript
{
  "name": "Alice Chen",
  "fundName": "XYZ Ventures",
  "investorType": "Angel",

  message: "Limited details visible. This investor profile is partially private."

  // ❌ EVERYTHING ELSE HIDDEN
  // industries: [HIDDEN],
  // ticketSize: [HIDDEN],
  // geography: [HIDDEN],
  // portfolioCompanies: [HIDDEN],
  // investmentThesis: [HIDDEN],
}
```

## 🔒 Security & Privacy Features

### 1. Empty Profile Prevention ✅
```
Investor tries to signup with empty profile:
❌ Error: "Profile data cannot be empty"
✓ Must fill: fund name, investment types, ticket size, etc.
```

### 2. LinkedIn Verification Required ✅
```
Investor role application:
→ Status: "PENDING" (until LinkedIn verified)
→ Message: "Verify your LinkedIn to activate investor profile"
→ Auto-promoted to "VERIFIED" tier after LinkedIn check
```

### 3. Audit Logging ✅
```
Every time someone views investor profile:
- Logged: viewerId, timestamp, viewer role
- Used for: Detecting profile scraping/competitors
- Retention: 90 days
```

### 4. Rate Limiting ✅
```
Viewing profiles:
- Limit: 30 requests per minute per user
- Exceeding: 429 error "Rate limit exceeded"
- Purpose: Prevent competitors from scraping all investor data
```

## 📱 FRONTEND MOCKUP - What Investor Sees

### Their Own Profile (COMPLETE)
```
┌────────────────────────────────────────┐
│ 🔓 EDIT MODE - YOUR PROFILE            │
├────────────────────────────────────────┤
│                                        │
│ Alice Chen  [Status: Verified] ✓       │
│ XYZ Ventures                           │
│                                        │
│ Investment Type: Angel                 │
│ Industries: SaaS, AI/ML, FinTech       │
│ Ticket Size: $50K - $500K              │
│ Geography: North America, Europe       │
│                                        │
│ 💼 PORTFOLIO (PRIVATE)                 │
│ ├─ Uber (Series D)                     │
│ ├─ Airbnb (Series C)                   │
│ └─ Stripe (Series B)                   │
│                                        │
│ 📊 INVESTMENT THESIS                   │
│ "We focus on B2B SaaS solving          │
│  enterprise problems with 10x growth"  │
│                                        │
│ 🎯 DEAL PREFERENCES                    │
│ ├─ Stage: Series A-C                   │
│ ├─ Seat: Board observer                │
│ └─ Follow-on: Yes                      │
│                                        │
│ 💰 Fund AUM: $50M                      │
│                                        │
│ [Save Changes] [Delete Profile]        │
└────────────────────────────────────────┘
```

### Founder Viewing Investor (LIMITED)
```
┌────────────────────────────────────────┐
│ 🚀 INVESTOR PROFILE                    │
├────────────────────────────────────────┤
│                                        │
│ Alice Chen                             │
│ XYZ Ventures                           │
│ ✓ Verified Investor                    │
│                                        │
│ 📈 Investment Focus:                   │
│ • SaaS, AI/ML, FinTech                 │
│ • Ticket size: $50K-$500K              │
│ • Geographic focus: NA, Europe         │
│                                        │
│ 🌐 Website:                            │
│ https://xyzvenntures.com               │
│                                        │
│ 📧 [Send Pitch] [Request Meeting]      │
│                                        │
│ ⭐ Trust Score: 92%                    │
│ 🏆 50+ Investments                     │
│                                        │
│ Portfolio & detailed thesis hidden     │
│ to respect investor privacy.           │
│                                        │
└────────────────────────────────────────┘
```

## 🎤 PODCAST FEATURES - What Investors Can Do

### Podcast Upload Requirements
```
✅ REQUIREMENTS TO UPLOAD PODCAST:
  ├─ Profile age: >= 30 days
  ├─ Connections: >= 50
  └─ Engagement score: >= 30%

❌ ERROR IF NOT MET:
  "Profile must be 30+ days old (5 days)"
  "Need 50+ connections (12 connections)"
  "Engagement score must be 30%+ (15%)"
```

### NextIgnition Podcast Section
```
┌────────────────────────────────────────┐
│ 🎧 NEXTIGNITION PODCASTS               │
│ Curated startup & investor content     │
├────────────────────────────────────────┤
│                                        │
│ [HOW TO RAISE YOUR SERIES A]           │
│ Alice Chen (XYZ Ventures)              │
│ 32 min • 2.5K plays • ✓Approved        │
│                                        │
│ [AI/ML FUNDING TRENDS 2026]            │
│ Bob Smith (TechCrunch Disrupt)         │
│ 45 min • 5.2K plays • ✓Approved        │
│                                        │
│ [PITCHING TIPS FOR FOUNDERS]           │
│ Charlie Rivera (Y Combinator)          │
│ 28 min • 8.4K plays • ✓Approved        │
│                                        │
│ Admin approves all NextIgnition        │
│ podcasts for quality control           │
│                                        │
└────────────────────────────────────────┘
```

### Upload Flow
```
INVESTOR UPLOADS:
1. Choose section: "NextIgnition" or "General"
2. Fill: Title, description, upload file
3. If "NextIgnition":
   → Status: PENDING
   → Message: "Submitted for admin review"
   → Timeline: 24-48 hours
4. If "General":
   → Status: LIVE
   → Message: "Published!"
   → Visible immediately
```

## 🎉 INVESTOR CAPABILITIES (New Features)

### Events
```
✓ Host networking events
✓ Set max attendees
✓ Track RSVPs
✓ Founders can discover & join
```

### Sessions
```
✓ Host 1-on-1 mentoring sessions
✓ Set duration & availability
✓ Founders can request slots
✓ Auto-scheduling
```

### Podcasts
```
✓ Upload long-form content
✓ Eligibility gates (30 days, 50 connections, 30% engagement)
✓ NextIgnition curation (admin approved)
✓ Public discovery + listening
```

## 📞 SUMMARY FOR CLIENT

**Question:** "If I signup as investor (Role 3), what will users see?"

**Answer:**
- **🔓 You see everything** in your profile
- **🚀 Founders see** what helps them pitch (investment focus, ticket size, industries)
- **💼 Competitors see** almost nothing (competitive protection)
- **👤 Public sees** nothing (maximum privacy)
- **🎤 You can host** podcasts, events, mentoring sessions
- **🔒 Security:** LinkedIn verification required, rate limiting blocks scrapers

---

*Generated: 2026-04-14*
*Phase 1-2 Implementation Complete*
