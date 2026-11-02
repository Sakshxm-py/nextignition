// passport-google.js
// Updated Passport strategy that validates email_verified and stores Google sub as immutable ID.

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateGoogleUser } from '../../services/userService.js'; // adjust path as needed

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
      scope: ['openid', 'profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      // Verify that the email is confirmed by Google
      const emailVerified = profile._json?.email_verified; // <-- IMPORTANT
      if (!emailVerified) {
        return done(null, false, { message: 'Google email not verified' });
      }

      // Use Google sub (profile.id) as primary key – immutable
      const user = await findOrCreateGoogleUser({
        googleSub: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
      });
      return done(null, user);
    }
  )
);

// Serialize / deserialize user for session support
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
