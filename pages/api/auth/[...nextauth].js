// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '../../../lib/mongodb'; // adjust if your path differs

export default NextAuth({
  // -----------------------------------------------------------------
  // Adapter – store users, sessions, etc. in MongoDB
  // -----------------------------------------------------------------
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
          // prompt: 'consent', // optional – forces re‑auth when needed
        },
      },
    }),
  ],

  callbacks: {
    // -----------------------------------------------------------------
    // Enforce verified e‑mail and optional corporate domain
    // -----------------------------------------------------------------
    async jwt({ token, account, profile }) {
      if (account && profile) {
        if (!profile.email_verified) {
          // Throwing aborts the sign‑in flow – Next‑Auth will hit the error page
          throw new Error('Google email not verified'); // <-- IMPORTANT
        }
        // OPTIONAL domain restriction – comment out if not needed
        const allowedDomain = '@mystartup.com';
        if (!profile.email?.endsWith(allowedDomain)) {
          throw new Error(`Only ${allowedDomain} accounts allowed`); // <-- IMPORTANT
        }
        // Store immutable Google sub as primary identifier
        token.sub = profile.sub;
        token.email = profile.email;
        token.name = profile.name;
      }
      return token;
    },

    async session({ session, token }) {
      // Propagate selected fields to the client session
      session.user.id = token.sub; // Google "sub"
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.emailVerified = true; // we already checked it
      return session;
    },
  },

  // -----------------------------------------------------------------
  // Harden cookies – httpOnly, secure, SameSite
  // -----------------------------------------------------------------
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  // Optional custom pages – you can style them as you like
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});
