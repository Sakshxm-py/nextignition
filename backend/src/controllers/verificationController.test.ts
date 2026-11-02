import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  INVESTOR_TIERS,
  TIER_NAMES,
  VERIFICATION_MESSAGES,
  REQUIRED_PROFILE_FIELDS,
  QUEUE_STATUS,
} from '../constants';

vi.mock('../utils/supabase', () => {
  const updateChain: any = {
    eq: async () => ({ data: null, error: null }),
  };

  const selectChain: any = {
    select: () => selectChain,
    eq: () => selectChain,
    single: async () => ({
      data: {
        id: 'user-1',
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          company: 'Tech Corp',
          role: 'founder',
          profileImage: 'http://example.com/avatar.png',
          investorTier: INVESTOR_TIERS.UNVERIFIED,
          verifications: {},
          profileCompletion: { percentage: 50, completedFields: ['firstName', 'lastName', 'email'] },
          adminVerification: { status: 'none' }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null,
    }),
    update: () => updateChain,
    insert: async () => ({ data: null, error: null }),
    order: () => selectChain,
    limit: async () => [],
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'investor_verifications') {
          return {
            select: () => selectChain,
            insert: async () => ({ data: null, error: null }),
          };
        }
        if (table === 'admin_verification_queue') {
          return {
            select: () => selectChain,
            insert: async () => ({ data: null, error: null }),
            update: () => updateChain,
            order: () => selectChain,
            limit: async () => [],
          };
        }
        return selectChain;
      },
    },
  };
});

import { createTestApp } from '../testUtils/createTestApp';

const signTestToken = (payload: Record<string, unknown>) => jwt.sign(payload, 'secret');

describe('Investor Verification Tests', () => {
  const app = createTestApp();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Investor Endpoints', () => {
    it('GET /investor/status returns verification status', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .get('/api/verification/investor/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('investorTier');
      expect(res.body).toHaveProperty('tierName');
      expect(res.body).toHaveProperty('verifications');
      expect(res.body).toHaveProperty('profileCompletion');
      expect(res.body).toHaveProperty('isProfileLocked');
      expect(res.body.investorTier).toBe(INVESTOR_TIERS.UNVERIFIED);
      expect(res.body.tierName).toBe(TIER_NAMES[INVESTOR_TIERS.UNVERIFIED]);
      expect(res.body.isProfileLocked).toBe(true);
    });

    it('POST /investor/verify-social verifies LinkedIn account', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'linkedin',
          profileUrl: 'https://www.linkedin.com/in/johndoe/'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('platform');
      expect(res.body).toHaveProperty('verified');
      expect(res.body.platform).toBe('linkedin');
      expect(res.body.verified).toBe(true);
    });

    it('POST /investor/verify-social rejects invalid URL', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'linkedin',
          profileUrl: 'not-a-url'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('POST /investor/verify-social requires platform and URL', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    it('POST /investor/verify-social validates platform', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'invalid-platform',
          profileUrl: 'https://example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid platform');
    });

    it('POST /investor/request-accreditation submits for Tier 3 review', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.VERIFIED
      });

      const res = await request(app)
        .post('/api/verification/investor/request-accreditation')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('queueId');
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe(QUEUE_STATUS.PENDING);
    });

    it('GET /investor/profile returns investor profile', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.VERIFIED
      });

      const res = await request(app)
        .get('/api/verification/investor/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('investorTier');
      expect(res.body).toHaveProperty('tierName');
      expect(res.body).toHaveProperty('profile');
      expect(res.body).toHaveProperty('verifications');
      expect(res.body).toHaveProperty('verificationRecords');
      expect(res.body).toHaveProperty('adminVerification');
    });

    it('GET /investor/profile/:investorId returns admin view', async () => {
      const token = signTestToken({
        id: 'admin-user',
        role: 'admin'
      });

      const res = await request(app)
        .get('/api/verification/investor/profile/user-1')
        .set('Authorization', `Bearer ${token}`);

      // Admin can view any profile
      expect(res.status).toBe(200);
    });

    it('GET /investor/profile/:investorId forbidden for non-admin', async () => {
      const token = signTestToken({
        id: 'user-2',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .get('/api/verification/investor/profile/user-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Admin Endpoints', () => {
    it('GET /admin/pending returns verification queue', async () => {
      const token = signTestToken({
        id: 'admin-user',
        role: 'admin'
      });

      const res = await request(app)
        .get('/api/verification/admin/pending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('queue');
    });

    it('GET /admin/pending forbidden for non-admin', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.VERIFIED
      });

      const res = await request(app)
        .get('/api/verification/admin/pending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Admin access required');
    });

    it('POST /admin/approve/:queueId approves verification', async () => {
      const token = signTestToken({
        id: 'admin-user',
        role: 'admin'
      });

      const res = await request(app)
        .post('/api/verification/admin/approve/queue-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          notes: 'Verified legitimate VC'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('newTier');
    });

    it('POST /admin/approve/:queueId requires queueId', async () => {
      const token = signTestToken({
        id: 'admin-user',
        role: 'admin'
      });

      const res = await request(app)
        .post('/api/verification/admin/approve/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          notes: 'Test'
        });

      expect(res.status).toBe(404);
    });

    it('POST /admin/approve/:queueId forbidden for non-admin', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor'
      });

      const res = await request(app)
        .post('/api/verification/admin/approve/queue-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          notes: 'Test'
        });

      expect(res.status).toBe(403);
    });

    it('POST /admin/reject/:queueId rejects verification', async () => {
      const token = signTestToken({
        id: 'admin-user',
        role: 'admin'
      });

      const res = await request(app)
        .post('/api/verification/admin/reject/queue-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'Profile incomplete'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('userId');
    });

    it('POST /admin/reject/:queueId forbidden for non-admin', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor'
      });

      const res = await request(app)
        .post('/api/verification/admin/reject/queue-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'Test'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Existing Endpoints', () => {
    it('POST /complete marks verification complete', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor'
      });

      const res = await request(app)
        .post('/api/verification/complete')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isVerified');
      expect(res.body.isVerified).toBe(true);
    });

    it('POST /banner sets verification banner state', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor'
      });

      const res = await request(app)
        .post('/api/verification/banner')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dismissedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('verificationBannerDismissedUntil');
    });

    it('POST /banner rejects invalid date', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor'
      });

      const res = await request(app)
        .post('/api/verification/banner')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dismissedUntil: 'invalid-date'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Authentication Tests', () => {
    it('Requires authentication for investor endpoints', async () => {
      const res = await request(app)
        .get('/api/verification/investor/status');

      expect(res.status).toBe(401);
    });

    it('Requires authentication for admin endpoints', async () => {
      const res = await request(app)
        .get('/api/verification/admin/pending');

      expect(res.status).toBe(401);
    });

    it('Accepts valid Bearer token', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .get('/api/verification/investor/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Platform Validation Tests', () => {
    const token = signTestToken({
      id: 'user-1',
      role: 'investor',
      investorTier: INVESTOR_TIERS.UNVERIFIED
    });

    it('Validates Twitter profile URLs', async () => {
      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'twitter',
          profileUrl: 'https://twitter.com/username'
        });

      expect(res.status).toBe(200);
      expect(res.body.platform).toBe('twitter');
    });

    it('Validates GitHub profile URLs', async () => {
      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'github',
          profileUrl: 'https://github.com/username'
        });

      expect(res.status).toBe(200);
      expect(res.body.platform).toBe('github');
    });

    it('Validates AngelList profile URLs', async () => {
      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'angellist',
          profileUrl: 'https://angel.co/username'
        });

      expect(res.status).toBe(200);
      expect(res.body.platform).toBe('angellist');
    });

    it('Rejects invalid Twitter URLs', async () => {
      const res = await request(app)
        .post('/api/verification/investor/verify-social')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'twitter',
          profileUrl: 'https://twitter.com'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Tier System Tests', () => {
    it('Returns correct tier name for Tier 1', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .get('/api/verification/investor/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.tierName).toBe('Unverified');
    });

    it('Returns correct tier name for Tier 2', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: 2
      });

      const res = await request(app)
        .get('/api/verification/investor/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.tierName).toBe('Verified');
    });

    it('Returns correct tier name for Tier 3', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: 3
      });

      const res = await request(app)
        .get('/api/verification/investor/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.tierName).toBe('Accredited');
    });

    it('Tier 1 investors are marked as locked', async () => {
      const token = signTestToken({
        id: 'user-1',
        role: 'investor',
        investorTier: INVESTOR_TIERS.UNVERIFIED
      });

      const res = await request(app)
        .get('/api/verification/investor/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.isProfileLocked).toBe(true);
    });
  });
});
