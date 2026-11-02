// Admin session timeout middleware
// Validates JWT token expiration and manages session timeouts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminRequest } from './adminMiddleware';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET environment variable is required');
}

const JWT_SECRET = ADMIN_JWT_SECRET;

export const ADMIN_SESSION_CONFIG = {
    ACCESS_TOKEN_EXPIRY: '30m', // 30 minutes
    REFRESH_TOKEN_EXPIRY: '7d', // 7 days
    MAX_INACTIVITY_WARNING: 25 * 60 * 1000, // Warn after 25 minutes
} as const;

/**
 * Middleware to check if admin session has expired
 * Called after protectAdmin middleware to provide additional session validation
 */
export const validateAdminSession = (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : undefined;

        if (!token) {
            res.status(401).json({ message: 'No token provided' });
            return;
        }

        // Decode without verification to check exp claim
        const decoded = jwt.decode(token) as any;

        if (!decoded || !decoded.exp) {
            res.status(401).json({ message: 'Invalid token format' });
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        // If less than 5 minutes remaining, attach warning to response
        if (expiresIn > 0 && expiresIn < 5 * 60) {
            res.set('X-Session-Warning', 'Your session will expire soon. Use /admin/refresh to extend it.');
        }

        // Token is still valid, proceed
        if (expiresIn > 0) {
            next();
            return;
        }

        // Token expired
        res.status(401).json({
            message: 'Session expired. Please log in again.',
            code: 'SESSION_EXPIRED',
        });
    } catch (error) {
        console.error('[AdminSessionTimeout] Error validating session:', error);
        res.status(401).json({ message: 'Session validation failed' });
    }
};

/**
 * Helper function to create refresh token payload
 */
export function createRefreshTokenPayload(adminId: string, email: string, role: string) {
    return {
        id: adminId,
        email,
        role,
        type: 'refresh',
    };
}

/**
 * Helper function to create access token payload
 */
export function createAccessTokenPayload(adminId: string, username: string, role: string, displayName: string) {
    return {
        id: adminId,
        username,
        displayName,
        role,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
    };
}

/**
 * Generate new tokens from refresh token
 */
export async function refreshAdminTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
} | null> {
    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        const { supabase } = require('../utils/supabase');

        // Verify admin still exists and is active.
        // admin_users has `email` and `name` (NOT username/displayName) — the
        // access-token payload maps username<-email and displayName<-name, the
        // same way adminLogin does.
        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('id, email, name, role, status')
            .eq('id', decoded.id)
            .single();

        if (error || !admin || admin.status !== 'active') {
            return null;
        }

        // Generate new access token
        const newAccessPayload = createAccessTokenPayload(
            admin.id,
            admin.email,
            admin.role,
            admin.name
        );
        const newAccessToken = jwt.sign(newAccessPayload, JWT_SECRET as string, {
            expiresIn: ADMIN_SESSION_CONFIG.ACCESS_TOKEN_EXPIRY,
        });

        // Generate new refresh token
        const newRefreshPayload = createRefreshTokenPayload(admin.id, admin.email, admin.role);
        const newRefreshToken = jwt.sign(newRefreshPayload, JWT_SECRET as string, {
            expiresIn: ADMIN_SESSION_CONFIG.REFRESH_TOKEN_EXPIRY,
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    } catch (error) {
        console.error('[AdminSessionTimeout] Error refreshing tokens:', error);
        return null;
    }
}

/**
 * Middleware to handle token refresh requests
 * Usage: router.post('/refresh', handleTokenRefresh, (req, res) => { ... })
 */
export const handleTokenRefresh = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const refreshToken = req.cookies?.['admin_refresh_token'] || req.body?.refreshToken;

        if (!refreshToken) {
            res.status(401).json({ message: 'Refresh token required' });
            return;
        }

        const tokens = await refreshAdminTokens(refreshToken);

        if (!tokens) {
            res.status(401).json({ message: 'Failed to refresh token. Please log in again.' });
            return;
        }

        // Set refresh token as httpOnly cookie
        res.cookie('admin_refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: '30m',
        });
    } catch (error) {
        console.error('[AdminSessionTimeout] Error in token refresh:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
