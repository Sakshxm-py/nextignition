# 🚀 DEPLOYMENT GUIDE - Phase 1 + 2 Complete

## Summary of Changes Implemented

### ✅ Phase 1: Security & Privacy Fixes (COMPLETE)
1. **Empty Profile Prevention** - `roleApplicationController.ts:72-79`
   - Validates profile data not empty before signup
   - Blocks submission with clear error message

2. **Role Verification Required** - `roleApplicationController.ts:116-133`
   - Investor/Expert roles now require LinkedIn verification
   - Auto status tracking with `requiresVerification` flag

3. **Privacy Filtering** - `roleApplicationController.ts:22-53, 231-238`
   - Investor data hidden from other investors/competitors
   - Founders see investment focus only
   - Audit logging of profile access

4. **Rate Limiting** - `middleware/rateLimiter.ts` + `routes/roleApplicationRoutes.ts:34`
   - 30 requests/minute per user for profile access
   - Prevents profile scraping by competitors

### ✅ Phase 2: Podcast System (COMPLETE)
- **New File:** `controllers/podcastController.ts` - Enhanced with eligibility checks
- **Eligibility Requirements:**
  - Profile age: >= 30 days
  - Connections: >= 50
  - Engagement score: >= 30%

- **Feature:** NextIgnition Podcast Section
  - Dedicated curated section for startup/investor content
  - Admin approval required before publishing
  - Endpoint: `GET /api/podcasts/section/nextignition`

- **Admin Controls:**
  - `GET /api/podcasts/admin/pending` - View pending podcasts
  - `POST /api/podcasts/admin/:id/approve` - Approve with feedback
  - `POST /api/podcasts/admin/:id/reject` - Reject with reason

### ✅ Phase 2: Investor Features (COMPLETE)
- **New Files:**
  - `controllers/investorFeaturesController.ts` - Events, sessions, interactions
  - `routes/investorFeaturesRoutes.ts` - All endpoints

- **Events (Investors/Experts):**
  - Host event: `POST /api/investor-features/events/host`
  - View my events: `GET /api/investor-features/events/my-events`
  - List public events: `GET /api/investor-features/events`
  - RSVP event: `POST /api/investor-features/events/:eventId/rsvp`

- **Sessions (1-on-1 Mentoring):**
  - Host session: `POST /api/investor-features/sessions/host`
  - View my sessions: `GET /api/investor-features/sessions/my-sessions`
  - List public sessions: `GET /api/investor-features/sessions`
  - RSVP session: `POST /api/investor-features/sessions/:sessionId/rsvp`

### ✅ Phase 3: Profile Visibility Rules (COMPLETE)

Role 3 (Investor) Profile Shows:

**To Founders:**
- Investment focus ✓
- Ticket size ✓
- Industries ✓
- Geography ✓
- Fund name ✓

**To Other Investors:**
- Limited info only ✗ Portfolio companies
- No investment thesis
- No deal preferences

**To Self:**
- Everything

**To Public/Unauth:**
- "Profile is private" message

### ✅ Phase 4: Database Schema Updates Required

Run these migrations in Supabase:

```sql
-- NextIgnition Podcast Section
ALTER TABLE podcast_episodes
ADD COLUMN section VARCHAR(50) DEFAULT 'general',
ADD COLUMN approvalStatus VARCHAR(50) DEFAULT 'auto_approved',
ADD COLUMN approvedBy UUID,
ADD COLUMN approvedAt TIMESTAMP,
ADD COLUMN rejectionReason TEXT;

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  hostId UUID NOT NULL,
  hostName VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE,
  time TIME,
  location VARCHAR(255),
  maxAttendees INT DEFAULT 50,
  eventType VARCHAR(50),
  attendees UUID[] DEFAULT '{}',
  attendeeCount INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  hostId UUID NOT NULL,
  hostName VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  startTime TIMESTAMP NOT NULL,
  duration INT DEFAULT 60,
  maxAttendees INT DEFAULT 20,
  sessionType VARCHAR(50),
  attendees UUID[] DEFAULT '{}',
  attendeeCount INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'scheduled',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Profile Access Audit
CREATE TABLE IF NOT EXISTS profile_access_audit (
  id UUID PRIMARY KEY,
  viewerId UUID,
  profileUserId UUID NOT NULL,
  accessType VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_events_hostId ON events(hostId);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_sessions_hostId ON sessions(hostId);
CREATE INDEX idx_sessions_startTime ON sessions(startTime);
CREATE INDEX idx_podcast_section ON podcast_episodes USING GIN(data);
CREATE INDEX idx_profile_access ON profile_access_audit(profileUserId, timestamp);
```

## Testing Checklist

### 1. Security Tests
- [ ] Attempt empty role signup → BLOCKED
- [ ] Try investor profile without LinkedIn → SHOWS pending status
- [ ] View investor profile as founder → SHOWS investment focus only
- [ ] View investor profile as other investor → HIDES portfolio + thesis
- [ ] Rapid profile access (>30/min) → RATE LIMITED with 429 error

### 2. Podcast Tests
- [ ] Upload podcast < 30 days old → REJECTED (age requirement)
- [ ] Upload podcast < 50 connections → REJECTED (connection requirement)
- [ ] Upload podcast < 30% engagement → REJECTED (engagement requirement)
- [ ] Upload to NextIgnition section → PENDING (requires admin approval)
- [ ] Admin list pending podcasts → SHOWS all pending
- [ ] Admin approve podcast → PUBLISHED + notification to user
- [ ] Admin reject podcast → REJECTED with reason stored

### 3. Investor Features Tests
- [ ] Host event as investor → CREATED + viewable
- [ ] RSVP event as founder → SUCCESS
- [ ] Host session as expert → CREATED + scheduled
- [ ] List public events → RETURNS all active events
- [ ] RSVP full session → REJECTED (capacity check)

### 4. Frontend Updates Needed
- [ ] Show profile lock icon for Tier 1 users
- [ ] Display verification status badge
- [ ] Add podcast eligibility checker pre-upload
- [ ] Show NextIgnition podcast section separately
- [ ] Add event/session hosting UI for investors
- [ ] Display rate limit warnings

## Deployment Steps

### Step 1: Database Migration
```bash
# In Supabase SQL Editor, run all migrations above
```

### Step 2: Environment Variables
Verify `.env` has:
```
JWT_SECRET=<your-secret>
PORT=5000
SUPABASE_URL=<url>
SUPABASE_KEY=<key>
```

### Step 3: Build Backend
```bash
cd backend
npm install
npm run build
```

### Step 4: Deploy
```bash
# Vercel (recommended)
vercel deploy --prod

# Or manual Docker
docker build -t nextignition-backend .
docker run -p 5000:5000 nextignition-backend
```

### Step 5: Frontend Updates
```bash
cd frontend
npm install
npm run build
# Update to show:
# - Profile privacy icons
# - Podcast eligibility checker
# - NextIgnition podcast section
# - Event/session hosting forms
```

## API Endpoints Summary

### Profile & Roles
- `POST /api/roles/apply` - Apply for role
- `GET /api/roles/my-roles` - Get my roles
- `GET /api/roles/profile/:userId` - Get public profile (RATE LIMITED)
- `PUT /api/roles/update-profile` - Update role data

### Podcasts
- `GET /api/podcasts` - List all podcasts
- `POST /api/podcasts` - Upload podcast (ELIGIBILITY CHECK)
- `GET /api/podcasts/section/nextignition` - NextIgnition curated
- `GET /api/podcasts/admin/pending` - Admin only
- `POST /api/podcasts/admin/:id/approve` - Admin approve
- `POST /api/podcasts/admin/:id/reject` - Admin reject

### Investor Features
- `POST /api/investor-features/events/host` - Host event
- `GET /api/investor-features/events` - List public events
- `POST /api/investor-features/sessions/host` - Host session
- `GET /api/investor-features/sessions` - List public sessions

## Verification Commands

```bash
# Test empty profile prevention
curl -X POST http://localhost:5000/api/roles/apply \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "investor",
    "profileData": {}
  }'
# Expected: 400 { "error": "Empty profile", ... }

# Test rate limiting
for i in {1..31}; do
  curl http://localhost:5000/api/roles/profile/<userId>
done
# Expected: 30th request succeeds, 31st returns 429

# Test podcast eligibility
curl -X POST http://localhost:5000/api/podcasts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Podcast",
    "section": "nextignition"
  }'
# Expected: 403 if requirements not met

# List NextIgnition podcasts
curl http://localhost:5000/api/podcasts/section/nextignition
# Expected: { "section": "NextIgnition - Curated...", "podcasts": [...] }
```

## What Users Will See (Role 3 - Investor)

### Their Own Profile:
✓ Portfolio companies
✓ Investment thesis
✓ Deal stage preferences
✓ AUM
✓ Preferred industries
✓ ALL personal data

### Founder Viewing Investor:
✓ Investment focus
✓ Ticket size
✓ Industries
✓ Geography
✓ Fund name
✗ Portfolio
✗ Strategy

### Other Investor Viewing:
✓ Name
✓ Fund name
✗ Portfolio companies
✗ Investment thesis
✗ Deal preferences
✗ AUM

## Next Steps (Post-Deployment)

1. LinkedIn OAuth Integration - Replace URL validation with real API
2. Engagement Score Calculation - Implement real-time scoring
3. Podcast Auto-Transcription - Add captions/search
4. Investment Matching - Connect compatible investors/founders
5. Performance Caching - Redis for podcast/profile data

## Support

Questions? Check:
- `backend/SECURITY_PRIVACY_ANALYSIS.md` - Detailed security architecture
- `backend/IMPLEMENTATION_ROADMAP.md` - Technical implementation details
- Database migrations folder for schema reference
