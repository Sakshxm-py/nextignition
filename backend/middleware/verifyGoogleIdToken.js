// middleware/verifyGoogleIdToken.js
// Reusable Express middleware that validates Google ID tokens.
// ---------------------------------------------------------------
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * verifyGoogleIdToken middleware
 *  - Expects { id_token } in req.body.
 *  - Verifies signature, audience, issuer.
 *  - Ensures email_verified === true.
 *  - Attaches req.googleUser = { sub, email, name } on success.
 */
export async function verifyGoogleIdToken(req, res, next) {
  const { id_token: idToken } = req.body; // <-- IMPORTANT: only id_token
  if (!idToken) {
    return res.status(400).json({ error: 'Missing id_token' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // ---- Critical security checks ----
    if (!payload.email_verified) {
      return res.status(401).json({ error: 'Email not verified' }); // <-- IMPORTANT
    }
    if (
      payload.iss !== 'https://accounts.google.com' &&
      payload.iss !== 'accounts.google.com'
    ) {
      return res.status(401).json({ error: 'Invalid token issuer' }); // <-- IMPORTANT
    }
    // -----------------------------------

    // Attach minimal verified user info for downstream handlers
    req.googleUser = {
      sub: payload.sub, // immutable Google user ID
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (err) {
    console.error('Google token verification failed', err);
    return res.status(401).json({ error: 'Invalid ID token' }); // <-- IMPORTANT
  }
}
