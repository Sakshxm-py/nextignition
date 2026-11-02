// backend/app.js

import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();

// Middleware -------------------------------------------------------
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'super-secret', // <-- IMPORTANT: set in env
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// Routes ----------------------------------------------------------
app.use('/api/auth', authRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

export default app;
