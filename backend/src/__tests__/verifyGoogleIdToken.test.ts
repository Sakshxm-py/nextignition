/**
 * Unit Tests: verifyGoogleIdToken middleware
 * Run: npx jest verifyGoogleIdToken.test.ts
 */
import { Request, Response, NextFunction } from 'express';

// ── Mock google-auth-library BEFORE importing the module under test ──────────
const mockGetPayload = jest.fn();
const mockVerifyIdToken = jest.fn().mockResolvedValue({ getPayload: mockGetPayload });

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken, // <-- IMPORTANT: intercepts real network call
  })),
}));

import { verifyGoogleIdToken } from '../middleware/verifyGoogleIdToken';

// ── Helpers ──────────────────────────────────────────────────────────────────
const makeReq = (body: object): Partial<Request> => ({ body });
const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

// ── Test Suite ────────────────────────────────────────────────────────────────
describe('verifyGoogleIdToken middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── 1. Valid, verified token ────────────────────────────────────────────────
  it('attaches req.googleUser and calls next() for a valid verified token', async () => {
    const payload = {
      sub: 'google-sub-12345',
      email: 'alice@example.com',
      email_verified: true,              // <-- IMPORTANT: must be true
      name: 'Alice',
      iss: 'accounts.google.com',
      aud: process.env.GOOGLE_CLIENT_ID ?? 'test-client-id',
    };
    mockGetPayload.mockReturnValue(payload);

    const req = makeReq({ token: 'valid.google.token' }) as any;
    const res = makeRes();
    const next: NextFunction = jest.fn();

    await verifyGoogleIdToken(req, res, next);

    expect(mockVerifyIdToken).toHaveBeenCalledTimes(1);
    expect(req.googleUser).toEqual(payload);          // payload attached
    expect(next).toHaveBeenCalledTimes(1);            // pipeline continues
    expect(res.status).not.toHaveBeenCalled();        // no error response
  });

  // ── 2a. email_verified: false → 401 ────────────────────────────────────────
  it('returns 401 when email_verified is false', async () => {
    mockGetPayload.mockReturnValue({
      sub: 'google-sub-unverified',
      email: 'unverified@example.com',
      email_verified: false,             // <-- IMPORTANT: the exploit path
      iss: 'accounts.google.com',
    });

    const req = makeReq({ token: 'unverified.token' }) as any;
    const res = makeRes();
    const next: NextFunction = jest.fn();

    await verifyGoogleIdToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('not verified') })
    );
    expect(next).not.toHaveBeenCalled();              // pipeline STOPS
    expect(req.googleUser).toBeUndefined();
  });

  // ── 2b. Forged / signature failure → 401 ───────────────────────────────────
  it('returns 401 when verifyIdToken throws (forged token)', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Token used too late'));

    const req = makeReq({ token: 'forged.jwt.token' }) as any;
    const res = makeRes();
    const next: NextFunction = jest.fn();

    await verifyGoogleIdToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── 2c. Missing token → 400 ─────────────────────────────────────────────────
  it('returns 400 when no token is provided', async () => {
    const req = makeReq({}) as any;
    const res = makeRes();
    const next: NextFunction = jest.fn();

    await verifyGoogleIdToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ── 2d. Bad issuer → 401 ────────────────────────────────────────────────────
  it('returns 401 when issuer is not Google', async () => {
    mockGetPayload.mockReturnValue({
      sub: 'evil-sub',
      email: 'hacker@evil.com',
      email_verified: true,
      iss: 'https://evil.com',           // <-- IMPORTANT: wrong issuer
    });

    const req = makeReq({ token: 'bad-issuer.token' }) as any;
    const res = makeRes();
    const next: NextFunction = jest.fn();

    await verifyGoogleIdToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
