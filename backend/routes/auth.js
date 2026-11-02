import express from 'express';
import { verifyGoogleIdToken } from '../middleware/verifyGoogleIdToken.js';
import { upsertGoogleUser } from '../services/userService.js';

const router = express.Router();

// POST /api/auth/google – expects { id_token }
router.post('/google', verifyGoogleIdToken, async (req, res) => {
  const { sub, email, name } = req.googleUser; // verified by middleware
  try {
    const user = await upsertGoogleUser({ googleSub: sub, email, name });
    // Example: issue a session cookie (express‑session) or JWT
    req.session.userId = user.id; // assuming express‑session is configured
    res.json({ ok: true, user });
  } catch (err) {
    console.error('User upsert failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
