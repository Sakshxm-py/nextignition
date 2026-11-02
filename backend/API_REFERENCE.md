# 📚 API REFERENCE - Complete Endpoints Guide

## Base URL
```
Backend: http://localhost:5000/api
Staging: https://staging-api.nextignition.com/api
Production: https://api.nextignition.com/api
```

## Authentication
All protected endpoints require header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 ROLES & PROFILES API

### Apply for Role
```
POST /roles/apply
Authorization: Required

Body:
{
  "role": "investor" | "expert" | "founder",
  "profileData": {
    // Role-specific data (required, cannot be empty)
    "fundName": "XYZ Ventures",
    "investorType": "Angel",
    "industries": ["SaaS", "AI/ML"],
    "ticketSize": { "min": 50000, "max": 500000 },
    ...
  }
}

Response 201:
{
  "success": true,
  "message": "Your investor application has been submitted for review - verification required",
  "role": { ... },
  "requiresVerification": true,
  "estimatedReviewTime": "24-48 hours"
}

Response 400:
{
  "error": "Empty profile",
  "message": "Profile data cannot be empty. Please fill in all required fields.",
  "blocked": true
}
```

### Get My Roles
```
GET /roles/my-roles
Authorization: Required

Response 200:
{
  "success": true,
  "roles": [
    {
      "role": "founder",
      "type": "founder",
      "status": "verified",
      "badges": ["Early Adopter"],
      "completeness": 95,
      "verifiedAt": "2026-04-10T10:00:00Z"
    }
  ],
  "badges": [...],
  "trustScore": 92,
  "verificationLevel": "verified",
  "profile": {
    "emailVerified": true,
    "phoneVerified": false,
    "linkedInVerified": true,
    "identityVerified": false
  }
}
```

### Get Public Profile (Privacy Filtered)
```
GET /roles/profile/:userId
Authorization: Optional (better results with auth)
Rate Limited: 30 requests/minute per user

Response 200:
{
  "success": true,
  "profile": {
    "id": "user-123",
    "name": "Alice Chen",
    "primaryRole": "investor",
    "roles": [
      { "type": "investor", "badges": [], "verifiedAt": "..." }
    ],
    "badges": ["Verified Investor", "50+ Investments"],
    "trustScore": 92,
    "verificationLevel": "verified",

    // PRIVACY FILTERED BASED ON VIEWER ROLE
    "roleData": {
      "fundName": "XYZ Ventures",
      "investorType": "Angel",
      "industries": ["SaaS", "AI/ML"],
      "ticketSize": { "min": 50000, "max": 500000 },
      // Portfolio hidden for non-founders
    },

    "verifications": {
      "email": true,
      "phone": false,
      "linkedIn": true,
      "identity": false
    }
  }
}

Response 429 (Rate Limited):
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

### Set Primary Role
```
PUT /roles/set-primary
Authorization: Required

Body:
{
  "role": "investor" | "expert" | "founder"
}

Response 200:
{
  "success": true,
  "message": "Primary role updated to investor",
  "primaryRole": "investor"
}

Response 400:
{
  "error": "Role not verified",
  "message": "You must have a verified investor role to set it as primary"
}
```

### Update Role Profile
```
PUT /roles/update-profile
Authorization: Required

Body:
{
  "role": "investor",
  "profileData": { /* updated fields */ }
}

Response 200:
{
  "success": true,
  "message": "Profile updated",
  "profile": { ... }
}
```

---

## 🎤 PODCAST API

### List Podcasts (Public)
```
GET /podcasts
Parameters:
  - contentType: "original" | "interview" | "roundtable" (optional)
  - sessionType: "recorded" | "live" (optional)
  - featured: "true" | "false" (optional)
  - limit: number (default: 50)

Response 200:
[
  {
    "id": "podcast-123",
    "title": "How to Raise Series A",
    "uploaderName": "Alice Chen",
    "publishDate": "2026-04-10T10:00:00Z",
    "plays": 2540,
    "likes": 320,
    "sessionType": "recorded",
    "contentType": "original"
  }
]
```

### Get NextIgnition Podcasts (Curated Section)
```
GET /podcasts/section/nextignition
Parameters:
  - limit: number (default: 20)
  - offset: number (default: 0)

Response 200:
{
  "success": true,
  "section": "NextIgnition - Curated startup & investor content",
  "podcasts": [
    {
      "id": "podcast-456",
      "title": "AI/ML Funding Trends 2026",
      "uploaderName": "Bob Smith",
      "publishDate": "2026-04-14T...",
      "plays": 5200,
      "approvalStatus": "approved",
      "approvedAt": "2026-04-12T..."
    }
  ],
  "total": 45
}
```

### Upload Podcast
```
POST /podcasts
Authorization: Required
✓ Eligibility Check: Profile age >= 30 days, Connections >= 50, Engagement >= 30%

Body:
{
  "title": "My Podcast Episode",
  "description": "Discussion about startup funding...",
  "section": "nextignition" | "general",  // nextignition requires approval
  "contentType": "original",
  "sessionType": "recorded",
  "fileUrl": "https://..."
}

Response 201 (Success):
{
  "success": true,
  "message": "Podcast submitted for admin review (NextIgnition section)",
  "podcast": { ... },
  "approvalStatus": "pending"
}

Response 403 (Not Eligible):
{
  "error": "Podcast upload restricted",
  "reason": "Profile must be 30+ days old (5 days)",
  "message": "You do not meet the requirements to upload podcasts",
  "requirements": {
    "minProfileAge": "30 days",
    "minConnections": 50,
    "minEngagement": "30%"
  }
}
```

### Get Podcast Details
```
GET /podcasts/:id
Response 200: { id, title, description, ... }
(Increments play count)
```

### Like Podcast
```
POST /podcasts/:id/like
Authorization: Required

Response 200:
{
  "id": "podcast-123",
  "likes": 321  // Updated count
}
```

### Admin: Get Pending Podcasts
```
GET /podcasts/admin/pending
Authorization: Required (admin only)

Response 200:
{
  "success": true,
  "pending": [
    {
      "id": "podcast-789",
      "title": "Startup Pitch Tips",
      "uploaderName": "Charlie Rivera",
      "uploadedAt": "2026-04-14T12:00:00Z",
      "approvalStatus": "pending",
      "section": "nextignition"
    }
  ],
  "total": 3
}

Response 403:
{
  "message": "Admin access required"
}
```

### Admin: Approve Podcast
```
POST /podcasts/admin/:id/approve
Authorization: Required (admin only)

Body:
{
  "feedback": "Great content! Published to NextIgnition"
}

Response 200:
{
  "success": true,
  "message": "Podcast approved and published!",
  "podcast": { ... }
}
```

### Admin: Reject Podcast
```
POST /podcasts/admin/:id/reject
Authorization: Required (admin only)

Body:
{
  "reason": "Content doesn't align with startup focus"
}

Response 200:
{
  "success": true,
  "message": "Podcast rejected",
  "podcast": {
    "approvalStatus": "rejected",
    "rejectionReason": "Content doesn't align with startup focus"
  }
}
```

---

## 🎉 INVESTOR FEATURES API

### Host Event
```
POST /investor-features/events/host
Authorization: Required (investor/expert only)

Body:
{
  "title": "Pitching 101 Workshop",
  "description": "Learn how to pitch to investors",
  "date": "2026-05-01",
  "time": "14:00",
  "location": "San Francisco, CA",
  "maxAttendees": 50,
  "eventType": "workshop"
}

Response 201:
{
  "success": true,
  "message": "Event created successfully!",
  "event": {
    "id": "event-123",
    "hostId": "user-456",
    "hostName": "Alice Chen",
    "title": "Pitching 101 Workshop",
    "date": "2026-05-01",
    "attendeeCount": 0,
    "status": "active"
  }
}
```

### Get My Events
```
GET /investor-features/events/my-events
Authorization: Required

Response 200:
{
  "success": true,
  "events": [ { id, title, date, attendeeCount, ... } ],
  "total": 5
}
```

### Get Public Events
```
GET /investor-features/events
Parameters:
  - eventType: "workshop" | "networking" (optional)
  - limit: number (default: 20)
  - offset: number (default: 0)

Response 200:
{
  "success": true,
  "events": [ ... ],
  "total": 127
}
```

### RSVP Event
```
POST /investor-features/events/:eventId/rsvp
Authorization: Required

Response 200:
{
  "success": true,
  "message": "Successfully registered for event!",
  "attendeeCount": 23
}

Response 400:
{
  "error": "Event is full"
}
```

### Host Session (1-on-1 Mentoring)
```
POST /investor-features/sessions/host
Authorization: Required (expert/investor)

Body:
{
  "title": "Founder Mentoring - First Steps",
  "description": "30-min mentoring for new founders",
  "startTime": "2026-05-05T14:00:00Z",
  "duration": 30,
  "maxAttendees": 1,
  "sessionType": "mentoring"
}

Response 201:
{
  "success": true,
  "message": "Session scheduled successfully!",
  "session": { ... }
}
```

### Get My Sessions
```
GET /investor-features/sessions/my-sessions
Authorization: Required

Response 200:
{
  "success": true,
  "sessions": [ ... ],
  "total": 12
}
```

### Get Public Sessions
```
GET /investor-features/sessions
Parameters:
  - sessionType: "mentoring" | "consulting" (optional)
  - limit: number (default: 20)

Response 200:
{
  "success": true,
  "sessions": [ ... ],
  "total": 89
}
```

### RSVP Session
```
POST /investor-features/sessions/:sessionId/rsvp
Authorization: Required

Response 200:
{
  "success": true,
  "message": "Successfully registered for session!",
  "attendeeCount": 1
}
```

---

## 🛡️ ERROR RESPONSES

### Invalid Role Application
```
400 Invalid role
{
  "error": "Invalid role",
  "message": "Role must be one of: investor, expert, founder"
}
```

### Profile Validation Failed
```
400 Validation Failed
{
  "error": "Profile validation failed",
  "missingRequired": [
    { "field": "fundName", "label": "Fund Name" },
    { "field": "industries", "label": "Investment Industries" }
  ],
  "completeness": 65,
  "requiredCompleteness": 85,
  "blocked": true
}
```

### User Not Found
```
404 Not Found
{
  "error": "User not found"
}
```

### Unauthorized
```
401 Unauthorized
{
  "message": "Authentication required"
}
```

### Forbidden (Admin Only)
```
403 Forbidden
{
  "message": "Admin access required"
}
```

### Rate Limit Exceeded
```
429 Too Many Requests
Headers:
  X-RateLimit-Limit: 30
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1713101045000

Body:
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

---

## 📝 EXAMPLE WORKFLOWS

### Investor Signup & First Podcast
```
1. POST /roles/apply
   → role: "investor"
   → profileData: { fundName, investorType, ... }
   → Response: { status: "pending", requiresVerification: true }

2. GET /roles/my-roles
   → Check LinkedIn verification status

3. POST /podcasts
   → Check eligibility: 30 days old ✓, 50+ connections ✓, 30% engagement ✓
   → section: "nextignition"
   → Response: { approvalStatus: "pending" }

4. Wait for admin approval (24-48 hours)

5. GET /podcasts/section/nextignition
   → Your podcast now visible in curated section
```

### Founder Discovering Investor Profile
```
1. GET /investor-features/events
   → Find investor-hosted events

2. GET /roles/profile/:investorId
   → See limited profile (fund name, industries, ticket size only)
   → Portfolio & thesis hidden

3. GET /investor-features/sessions
   → Book mentoring session with investor

4. POST /investor-features/events/:eventId/rsvp
   → Register for investor event
```

---

## 🔄 HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Profile retrieved successfully |
| 201 | Created | Event created successfully |
| 400 | Bad Request | Empty profile data |
| 401 | Unauthorized | Missing auth token |
| 403 | Forbidden | Admin endpoint, user not admin |
| 404 | Not Found | User profile doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Database error |

---

## 📊 Rate Limits

| Endpoint | Limit | Duration |
|----------|-------|----------|
| Profile access | 30 req/user | 60 sec |
| Event hosting | 100 req/day | 24 hr |
| Podcast upload | 5 req/day | 24 hr |
| All others | Standard | N/A |

---

*API Reference Generated: 2026-04-14*
*Version: 1.0 (Phase 1-2 Complete)*
