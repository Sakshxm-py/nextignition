import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  aud: string | string[];
  iss: string;
}

/** Extends Express Request with verified Google payload */
export interface GoogleRequest extends Request {
  googleUser?: GoogleTokenPayload;
}

const VALID_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * verifyGoogleIdToken
 * --------------------------------------------------
 * 1. Reads `id_token` (or `credential` / `token`) from req.body
 * 2. Verifies signature against Google's public keys
 * 3. Checks audience matches GOOGLE_CLIENT_ID env var
 * 4. REJECTS tokens where email_verified !== true       // <-- SECURITY FIX
 * 5. Attaches verified payload to req.googleUser
 */
export const verifyGoogleIdToken = async (
  req: GoogleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idToken: string | undefined =
    req.body?.id_token ?? req.body?.credential ?? req.body?.token;

  if (!idToken) {
    res.status(400).json({ message: 'No Google ID token provided' });
    return;
  }

  try {
    const audience = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean) as string[];

    const ticket = await client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();

    if (!payload) {
      res.status(401).json({ message: 'Invalid Google token: empty payload' });
      return;
    }

    // Validate issuer                                    // <-- IMPORTANT
    if (!VALID_ISSUERS.includes(payload.iss)) {
      console.warn('[verifyGoogleIdToken] Invalid issuer:', payload.iss);
      res.status(401).json({ message: 'Invalid Google token: bad issuer' });
      return;
    }

    // CRITICAL: reject unverified emails                  // <-- IMPORTANT
    if (payload.email_verified !== true) {
      console.warn('[verifyGoogleIdToken] email_verified is false for:', payload.email);
      res.status(401).json({ message: 'Google email is not verified' });
      return;
    }

    // Attach verified payload – sub is the immutable Google user ID
    req.googleUser = payload as unknown as GoogleTokenPayload;
    console.log('[verifyGoogleIdToken] Token OK — sub:', payload.sub, 'email:', payload.email);
    next();
  } catch (err: any) {
    console.error('[verifyGoogleIdToken] Verification failed:', err.message);
    res.status(401).json({ message: 'Invalid Google token' });
  }
};
