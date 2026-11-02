/**
 * Integration Tests: POST /api/auth/google
 * Uses supertest against an isolated Express app with mocked Supabase.
 * Run: npx jest googleAuth.integration.test.ts
 */
import request from 'supertest';
import express from 'express';

// ── 1. Mock google-auth-library ───────────────────────────────────────────────
const mockGetPayload = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// ── 2. Mock Supabase (replaces real DB calls) ─────────────────────────────────
const mockSupabaseSelect = jest.fn();
const mockSupabaseInsert = jest.fn().mockResolvedValue({ error: null });
const mockSupabaseUpdate = jest.fn().mockResolvedValue({ error: null });
const mockSupabaseSingle = jest.fn();

jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      single: mockSupabaseSingle,
    }),
  },
}));

// ── 3. Mock side-effect utilities ─────────────────────────────────────────────
jest.mock('../utils/mailer', () => ({ sendEmail: jest.fn().mockResolvedValue(true) }));
jest.mock('../utils/userActivityLogger', () => ({
  logUserActivity: jest.fn(),
  updateLoginStats: jest.fn(),
}));
jest.mock('../utils/settingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({ allowRegistration: true }),
}));

// ── 4. Build a minimal Express app ────────────────────────────────────────────
import { verifyGoogleIdToken } from '../middleware/verifyGoogleIdToken';
import { googleLogin } from '../controllers/authController';

const app = express();
app.use(express.json());
// The NEW route wires the middleware first                // <-- IMPORTANT
app.post('/api/auth/google', verifyGoogleIdToken, googleLogin);

// ── Helpers ───────────────────────────────────────────────────────────────────
const VALID_PAYLOAD = {
  sub: 'google-sub-abc123',              // <-- IMPORTANT: immutable Google user key
  email: 'alice@example.com',
  email_verified: true,
  name: 'Alice Test',
  picture: 'https://lh3.googleusercontent.com/photo.jpg',
  iss: 'accounts.google.com',
  aud: 'test-client-id',
};

function setupVerifyIdTokenSuccess(payload = VALID_PAYLOAD) {
  mockGetPayload.mockReturnValue(payload);
  mockVerifyIdToken.mockResolvedValue({ getPayload: mockGetPayload });
}

function setupSupabaseNoExistingUser() {
  // Simulate no existing user found
  mockSupabaseSelect.mockReturnValue({
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: [], error: null }),
    data: [],
    error: null,
  });
}

// ── Test Suite ────────────────────────────────────────────────────────────────
describe('POST /api/auth/google', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-long!!';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  });

  // ── Scenario 1: Valid token → 200 + JWT token in response ────────────────────
  it('returns 200 and a user object for a valid verified token', async () => {
    setupVerifyIdTokenSuccess();

    // Supabase: no existing user → new registration path
    mockSupabaseSelect.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      ilike: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'valid.google.token' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');           // JWT present
    expect(res.body.email).toBe('alice@example.com');
    expect(mockSupabaseInsert).toHaveBeenCalledTimes(1); // user was created
    // googleId stored as sub — the immutable identifier  // <-- IMPORTANT
    const insertedData = mockSupabaseInsert.mock.calls[0][0][0].data;
    expect(insertedData.googleId).toBe('google-sub-abc123');
  });

  // ── Scenario 2: email_verified: false → 401 ──────────────────────────────────
  it('returns 401 when email_verified is false', async () => {
    setupVerifyIdTokenSuccess({ ...VALID_PAYLOAD, email_verified: false });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'unverified.token' });

    expect(res.status).toBe(401);
    expect(mockSupabaseInsert).not.toHaveBeenCalled(); // NO user created
  });

  // ── Scenario 3: Forged token (signature check throws) → 401 ─────────────────
  it('returns 401 for a completely forged token', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token signature'));

    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'header.payload.bad-signature' });

    expect(res.status).toBe(401);
    expect(mockSupabaseInsert).not.toHaveBeenCalled(); // NO user created
  });
});
