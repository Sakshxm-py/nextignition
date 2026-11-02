import passport from 'passport';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_CALLBACK_URL = process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:5000/api/auth/linkedin/callback';

if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    console.warn('[LinkedIn] OAuth credentials not configured. LinkedIn verification will be disabled.');
}

// Configure LinkedIn OAuth Strategy
if (LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET) {
    passport.use(new (LinkedInStrategy as any)({
        clientID: LINKEDIN_CLIENT_ID,
        clientSecret: LINKEDIN_CLIENT_SECRET,
        callbackURL: LINKEDIN_CALLBACK_URL,
        scope: ['openid', 'profile', 'email'],
        state: true
    }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
            // LinkedIn profile data
            const linkedInData = {
                id: profile.id,
                displayName: profile.displayName,
                name: profile.name,
                emails: profile.emails,
                photos: profile.photos,
                profileUrl: profile._json.publicProfileUrl || `https://www.linkedin.com/in/${profile.id}`,
                headline: profile._json.headline,
                summary: profile._json.summary,
                positions: profile._json.positions,
                verifiedAt: new Date().toISOString()
            };

            return done(null, { linkedInData, accessToken });
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Serialize/deserialize for session support (optional)
passport.serializeUser((user: any, done: any) => {
    done(null, user);
});

passport.deserializeUser((user: any, done: any) => {
    done(null, user);
});

export default passport;
