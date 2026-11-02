import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabase';
import { INVESTOR_TIERS } from '../constants';

export interface AuthRequest extends Request {
    user?: any;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required for authentication');
}

const getSecrets = () => [JWT_SECRET];

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token = req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : undefined;

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }

    try {
        let decoded: any = null;
        for (const secret of getSecrets()) {
            try { 
                decoded = jwt.verify(token, secret); 
                break; 
            } catch (e: any) {
                console.debug(`[Auth] Secret verification failed: ${e.message}`);
                // Try next secret, silently continue
            }
        }
        
        if (!decoded) {
            console.error('[Auth] Token verification failed for all secrets');
            throw new Error('Invalid token');
        }

        // Refresh tokens must never be accepted as access tokens.
        if (decoded.type === 'refresh') {
            console.warn('[Auth] Refresh token presented as access token — rejected');
            throw new Error('Invalid token type');
        }

        // [CRITICAL] Check if user is frozen in database on every request
        // This ensures real-time enforcement of admin freeze orders
        const { data: userRow, error: dbError } = await supabase.from('users').select('data').eq('id', decoded.id).single();

        if (dbError) {
            console.error(`[Auth] Database user fetch error for ID ${decoded.id}:`, dbError.message);
            throw new Error('User fetch failed');
        }

        if (!userRow) {
            console.error(`[Auth] User not found in database for ID ${decoded.id}`);
            throw new Error('User not found');
        }

        if (userRow?.data?.isFrozen) {
            console.warn(`[Auth] Access denied: User ${decoded.id} is frozen`);
            res.status(403).json({
                message: 'Your account has been frozen by an administrator.',
                isFrozen: true
            });
            return;
        }

        // Attach investorTier from database for any user who has it
        if (userRow?.data?.investorTier) {
            decoded.investorTier = userRow.data.investorTier;
        }

        req.user = decoded;
        next();
    } catch (error: any) {
        console.error(`[Auth] Authentication error: ${error.message}`);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};


// Export authenticateToken as an alias for protect for backwards compatibility
export const authenticateToken = protect;

export const maybeAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    let token = req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : undefined;
    if (!token) return next();

    try {
        let decoded: any = null;
        for (const secret of getSecrets()) {
            try { decoded = jwt.verify(token, secret); break; } catch (e) {
                // Try next secret, silently continue
            }
        }
        if (decoded) {
            // Even in maybeAuth, we should clear the user if they are frozen
            // because controllers might use req.user to allow sensitive actions
            const { data: userRow } = await supabase.from('users').select('data').eq('id', decoded.id).single();
            if (userRow?.data?.isFrozen) {
                // We don't block with 403 here because maybeAuth should be non-blocking
                // but we clear req.user so they act as or are treated as an unauthenticated guest
                req.user = undefined;
            } else {
                // Attach investorTier from database for any user who has it
                if (userRow?.data?.investorTier) {
                    decoded.investorTier = userRow.data.investorTier;
                }
                req.user = decoded;
            }
        }
    } catch (error) {
        // maybeAuth should be non-blocking - if verification fails,
        // user is treated as unauthenticated
        console.debug('maybeAuth verification failed:', error instanceof Error ? error.message : String(error));
    }
    next();
};

export const authorize = (...roles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Not authorized, no user' });
                return;
            }

            // [SECURITY] Even if the role in the JWT matches, we MUST check the database
            // for the isFrozen flag to prevent bypasses during an active session.
            const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();

            if (!userRow) {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }

            if (userRow.data?.isFrozen) {
                res.status(403).json({
                    message: 'Your account has been frozen by an administrator.',
                    isFrozen: true
                });
                return;
            }

            const { role, roles: userRoles = [] } = userRow.data;

            // Check if user has required role
            const hasRole = roles.includes(role) || userRoles.some((r: string) => roles.includes(r));

            // Special case: if 'investor' role is required, also allow users with investorTier >= 2
            const hasInvestorTier = roles.includes('investor') && (userRow.data?.investorTier || 0) >= INVESTOR_TIERS.VERIFIED;

            if (hasRole || hasInvestorTier) {
                // Attach investorTier if it exists in database
                if (userRow.data?.investorTier) {
                    req.user.investorTier = userRow.data.investorTier;
                }
                return next();
            }

            res.status(403).json({ message: `Role is not authorized` });
        } catch (error) {
            res.status(403).json({ message: 'Forbidden' });
        }
    };
};
