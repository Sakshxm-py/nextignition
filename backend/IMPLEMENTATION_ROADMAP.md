# IMPLEMENTATION ROADMAP - Security & Features
**Short Deadline Mode - 72 Hours**

---

## PHASE 1: CRITICAL SECURITY FIXES (Next 24 Hours)

### 1.1 - Fix Signup Validation Bug
**File:** `backend/src/controllers/roleApplicationController.ts`
**Change:** Stricter validation on `applyForRole`

```typescript
// BEFORE (Line 36-45)
const validation = validateProfileData(profileData, role);
if (!validation.isValid) {
    return res.status(400).json({...}); // Just returns error message, allows retry
}

// AFTER - Clearer error blocking
const validation = validateProfileData(profileData, role);
if (!validation.isValid) {
    console.log(`[BLOCKED] Invalid ${role} profile from ${userId}:`, validation.missingRequired);
    return res.status(400).json({
        error: 'Incomplete profile',
        message: `Missing required fields: ${validation.missingRequired.join(', ')}`,
        missingRequired: validation.missingRequired,
        completeness: validation.completeness,
        requiredCompleteness: PROFILE_REQUIREMENTS[role].minCompleteness,
        blockedUntil: 'All required fields filled'  // ← NEW: Explicit blocking message
    });
}
```

---

### 1.2 - Add Role Verification Requirement
**File:** `backend/src/controllers/roleApplicationController.ts`
**Change:** Add verification checks before role approval

```typescript
const newRole: UserRole = {
    role: role as 'founder' | 'expert' | 'investor',
    status: ROLE_STATUS.PENDING,  // ← REQUIRED PENDING STATUS
    appliedAt: new Date().toISOString(),
    verificationLevel: 'unverified',  // ← Start unverified
    requiresVerification: ['investor', 'expert'].includes(role),  // ← NEW
    requiredVerifications: role === 'investor'
        ? ['linkedIn', 'profileCompletion_85%', 'adminReview']  // ← NEW
        : role === 'expert'
        ? ['linkedIn', 'profileCompletion_80%', 'credentialCheck']  // ← NEW
        : ['linkedIn', 'profileCompletion_70%'],
    badges: [],
    profileData: profileData,
    completeness: validation.completeness
};
```

---

### 1.3 - Filter Investor Data in Public Profiles
**File:** `backend/src/controllers/roleApplicationController.ts`
**Change:** Implement privacy-aware data filtering

```typescript
// NEW HELPER FUNCTION
const filterRoleDataByViewerRole = (roleData: any, roleType: string, viewerRole: string) => {
    if (roleType !== 'investor') return roleData;

    const privateFields = ['investmentThesis', 'portfolioCompanies', 'dealStagePreferences', 'aum'];
    const founderVisibleFields = ['investorType', 'industries', 'ticketSize', 'geography'];

    if (viewerRole === 'investor' || viewerRole === 'expert') {
        // Other investors see less
        const filtered = { ...roleData };
        privateFields.forEach(f => delete filtered[f]);
        return filtered;
    }

    if (viewerRole === 'founder') {
        // Founders see only what helps them pitch
        return Object.keys(roleData)
            .filter(k => founderVisibleFields.includes(k))
            .reduce((acc, k) => ({ ...acc, [k]: roleData[k] }), {});
    }

    // Public/unauth see almost nothing
    return { publicNotice: 'This investor profile is private' };
};

// IN getPublicProfile (Line 333)
const roleData = viewerRole === 'admin'
    ? (user as any)[`${primaryRole}ProfileData`] || {}  // Admins see everything
    : filterRoleDataByViewerRole(
        (user as any)[`${primaryRole}ProfileData`] || {},
        primaryRole,
        viewerRole  // ← Pass viewer's role
    );
```

---

### 1.4 - Require Authentication for Profile Access
**File:** `backend/src/controllers/roleApplicationController.ts`
**Change:** Modified `getPublicProfile` to check auth

```typescript
// BEFORE - No auth check
export const getPublicProfile = async (req: Request, res: Response) => {

// AFTER - Auth required with public option
export const getPublicProfile = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const viewerId = (req as any).user?.id;  // ← NEW: Get viewer's ID/role
    const viewerRole = (req as any).user?.role || 'public';

    // Optional: Log profile access for audit
    if (viewerId) {
        console.log(`[AUDIT] ${viewerId} viewed profile of ${userId}`);
    }

    // Get viewer's role for privacy filtering
    let viewerData = null;
    if (viewerId) {
        const { data: viewer } = await supabase
            .from('users')
            .select('roles')
            .eq('id', viewerId)
            .single();
        viewerRole = viewer?.roles?.[0]?.type || 'founder';
    }
```

---

## PHASE 2: NEW FEATURES (24-48 Hours)

### 2.1 - Podcast System Setup
**New File:** `backend/src/controllers/podcastController.ts`

```typescript
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

// ============================================================================
// Constants for Podcast Restrictions
// ============================================================================
const PODCAST_REQUIREMENTS = {
    MIN_PROFILE_AGE_DAYS: 30,
    MIN_CONNECTIONS: 50,
    MIN_ENGAGEMENT_SCORE: 0.3,  // 30% profile completion + activity
    REQUIRES_ADMIN_APPROVAL: true,
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
    MAX_FILE_SIZE_MB: 2000,
    NEXTIGNITION_PODCAST_CATEGORY: 'nextignition_podcast'
};

// ============================================================================
// Check Podcast Upload Eligibility
// ============================================================================
export const checkPodcastEligibility = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const { data: user, error } = await supabase
            .from('users')
            .select('createdAt, profile, connections')  // Adjust based on your schema
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate eligibility
        const profileAgeDays = Math.floor(
            (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        const connectionCount = user.connections?.length || 0;

        const engagementScore = calculateEngagementScore(user.profile);

        const eligible =
            profileAgeDays >= PODCAST_REQUIREMENTS.MIN_PROFILE_AGE_DAYS &&
            connectionCount >= PODCAST_REQUIREMENTS.MIN_CONNECTIONS &&
            engagementScore >= PODCAST_REQUIREMENTS.MIN_ENGAGEMENT_SCORE;

        return res.status(200).json({
            eligible,
            requirements: {
                profileAge: {
                    required: PODCAST_REQUIREMENTS.MIN_PROFILE_AGE_DAYS,
                    current: profileAgeDays,
                    met: profileAgeDays >= PODCAST_REQUIREMENTS.MIN_PROFILE_AGE_DAYS
                },
                connections: {
                    required: PODCAST_REQUIREMENTS.MIN_CONNECTIONS,
                    current: connectionCount,
                    met: connectionCount >= PODCAST_REQUIREMENTS.MIN_CONNECTIONS
                },
                engagement: {
                    required: PODCAST_REQUIREMENTS.MIN_ENGAGEMENT_SCORE,
                    current: engagementScore,
                    met: engagementScore >= PODCAST_REQUIREMENTS.MIN_ENGAGEMENT_SCORE
                }
            },
            message: eligible
                ? 'You are eligible to upload podcasts'
                : 'You do not meet the requirements yet. ' + getMissingRequirements(profileAgeDays, connectionCount, engagementScore)
        });
    } catch (error) {
        console.error('Error checking podcast eligibility:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Upload Podcast with Approval Queue
// ============================================================================
export const uploadPodcast = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, description, category, videoUrl, duration } = req.body;

        // 1. Check eligibility
        const { data: user, error } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Create podcast record in PENDING status
        const podcastId = crypto.randomUUID();
        const podcast = {
            id: podcastId,
            userId,
            title,
            description,
            category,
            videoUrl,
            duration,
            status: 'pending_review',  // ← Requires approval
            createdAt: new Date().toISOString(),
            uploadedBy: user.name,
            views: 0,
            likes: 0,
            shares: 0
        };

        // 3. Insert into database
        const { error: insertError } = await supabase
            .from('podcasts')
            .insert(podcast);

        if (insertError) {
            console.error('Error uploading podcast:', insertError);
            return res.status(500).json({ error: 'Failed to upload podcast' });
        }

        // 4. Create admin review task
        await createPodcastReviewTask(userId, user.email, podcast);

        return res.status(201).json({
            success: true,
            message: 'Podcast uploaded! Admin review pending...',
            podcast: { id: podcastId, status: 'pending_review' }
        });
    } catch (error) {
        console.error('Error in uploadPodcast:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Helper Functions
// ============================================================================
const calculateEngagementScore = (profile: any): number => {
    let score = 0;
    const profileData = profile || {};

    // Profile completion (0-0.3)
    const completionPercent = /^\d+/.exec(profile?.completionPercent || '0')?.[0];
    score += (parseInt(completionPercent) || 0) / 100 * 0.3;

    // Activity metrics (0-0.3)
    const postCount = profileData.postCount || 0;
    score += Math.min(postCount / 20, 0.3);  // Cap at 20 posts = 0.3

    // Connection activity (0-0.4)
    const messageCount = profileData.messageCount || 0;
    score += Math.min(messageCount / 50, 0.4);  // Cap at 50 messages = 0.4

    return Math.min(score, 1.0);
};

const getMissingRequirements = (ageDays: number, connections: number, engagement: number): string => {
    const missing = [];
    if (ageDays < 30) missing.push(`Profile age: ${30 - ageDays} days remaining`);
    if (connections < 50) missing.push(`${50 - connections} more connections needed`);
    if (engagement < 0.3) missing.push('Build more profile engagement');
    return missing.join('. ');
};

const createPodcastReviewTask = async (userId: string, email: string, podcast: any) => {
    try {
        await supabase.from('admin_tasks').insert({
            type: 'podcast_review',
            userId,
            userEmail: email,
            podcastId: podcast.id,
            title: `Review Podcast: "${podcast.title}"`,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to create review task:', error);
    }
};
```

**New File:** `backend/src/routes/podcastRoutes.ts`

```typescript
import { Router } from 'express';
import { checkPodcastEligibility, uploadPodcast } from '../controllers/podcastController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/eligibility', authMiddleware, checkPodcastEligibility);
router.post('/upload', authMiddleware, uploadPodcast);

export default router;
```

---

### 2.2 - Add Investor Features (Events, Sessions)
**New File:** `backend/src/controllers/investorFeaturesController.ts`

```typescript
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

// ============================================================================
// Host Event (Investor Feature)
// ============================================================================
export const hostEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, description, date, time, location, maxAttendees, eventType } = req.body;

        // Verify investor role
        const { data: user } = await supabase
            .from('users')
            .select('roles')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hasInvestorRole = user.roles?.some((r: any) => r.type === 'investor' && r.status === 'verified');
        if (!hasInvestorRole) {
            return res.status(403).json({ error: 'Only verified investors can host events' });
        }

        // Create event
        const event = {
            id: crypto.randomUUID(),
            hostId: userId,
            title,
            description,
            date,
            time,
            location,
            maxAttendees,
            eventType,  // 'pitch', 'networking', 'workshop', 'demo'
            attendees: [],
            status: 'active',
            createdAt: new Date().toISOString()
        };

        const { error } = await supabase.from('events').insert(event);
        if (error) throw error;

        return res.status(201).json({ success: true, event });
    } catch (error) {
        console.error('Error hosting event:', error);
        return res.status(500).json({ error: 'Failed to create event' });
    }
};

// ============================================================================
// Host Session (Expert/Investor Feature)
// ============================================================================
export const hostSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, description, duration, maxAttendees, sessionType } = req.body;

        // Verify verified role
        const { data: user } = await supabase
            .from('users')
            .select('roles')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hasVerifiedRole = user.roles?.some((r: any) => r.status === 'verified');
        if (!hasVerifiedRole) {
            return res.status(403).json({ error: 'Profile must be verified to host sessions' });
        }

        // Create session
        const session = {
            id: crypto.randomUUID(),
            hostId: userId,
            title,
            description,
            duration,
            maxAttendees,
            sessionType,  // 'mentoring', 'workshop', 'office-hours', 'demo'
            attendees: [],
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };

        const { error } = await supabase.from('sessions').insert(session);
        if (error) throw error;

        return res.status(201).json({ success: true, session });
    } catch (error) {
        console.error('Error hosting session:', error);
        return res.status(500).json({ error: 'Failed to create session' });
    }
};
```

---

## PHASE 3: DATABASE MIGRATIONS (Immediate)

**New File:** `backend/migrations/003_add_podcast_and_investor_features.sql`

```sql
-- Add podcasts table
CREATE TABLE podcasts (
    id UUID PRIMARY KEY,
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    videoUrl TEXT NOT NULL,
    duration INTEGER,
    status VARCHAR(50) DEFAULT 'pending_review',  -- 'pending_review', 'approved', 'rejected'
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_category (category)
);

-- Add events table
CREATE TABLE events (
    id UUID PRIMARY KEY,
    hostId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255),
    maxAttendees INTEGER,
    eventType VARCHAR(50),  -- 'pitch', 'networking', 'workshop', 'demo'
    attendees JSON DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    INDEX idx_hostId (hostId),
    INDEX idx_date (date),
    INDEX idx_status (status)
);

-- Add sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    hostId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    maxAttendees INTEGER,
    sessionType VARCHAR(50),  -- 'mentoring', 'workshop', 'office-hours', 'demo'
    attendees JSON DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'scheduled',
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    INDEX idx_hostId (hostId),
    INDEX idx_status (status)
);

-- Update users table for podcast tracking
ALTER TABLE users ADD COLUMN podcastsUploadedCount INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN podcastEngagementScore REAL DEFAULT 0;

-- Add audit table for security logging
CREATE TABLE profile_access_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewerId UUID REFERENCES users(id),
    profileUserId UUID REFERENCES users(id),
    accessType VARCHAR(100),  -- 'full', 'limited', 'private'
    timestamp TIMESTAMP DEFAULT NOW(),
    INDEX idx_timestamp (timestamp),
    INDEX idx_viewerId (viewerId)
);
```

---

## DEPLOYMENT CHECKLIST

- [ ] Backup production database
- [ ] Run Phase 1 migrations (privacy, validation)
- [ ] Deploy backend fixes (auth, validation, privacy)
- [ ] Test signup validation (attempt empty forms)
- [ ] Verify investor data is filtered correctly
- [ ] Load test public profile endpoint
- [ ] Run Phase 2 migrations (podcast, events, sessions)
- [ ] Deploy podcast & investor features
- [ ] Test podcast upload flow (eligibility check)
- [ ] Test event/session creation
- [ ] Frontend: Update role signup flow
- [ ] Frontend: Add privacy settings UI
- [ ] Frontend: Add podcast section
- [ ] Run full regression tests
- [ ] Production rollout with monitoring

---

## SUCCESS CRITERIA

✅ **Phase 1 (48 Hours)**
- No empty profiles can be created
- Investor data filtered from non-admins
- Auth required for profile access
- All validation tests passing

✅ **Phase 2 (72 Hours)**
- Podcast eligibility checks working
- Investor can host events/sessions
- Admin podcast review queue functional
- Profile access audit logging active

---

**End of Implementation Roadmap**
