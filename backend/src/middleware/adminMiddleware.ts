import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Admin interface with role support (PRIMARY_ADMIN or SECONDARY_ADMIN)
export interface AdminData {
    id: string;
    username: string;
    displayName: string;
    role: 'PRIMARY_ADMIN' | 'SECONDARY_ADMIN';
    email?: string;
}

export interface AdminRequest extends Request {
    admin?: AdminData;
}

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET environment variable is required for admin authentication');
}

/**
 * Middleware to protect admin routes
 * Validates JWT token and checks for valid admin role (PRIMARY_ADMIN or SECONDARY_ADMIN)
 */
export const protectAdmin = (req: AdminRequest, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined;

    if (!token) {
        res.status(401).json({ message: 'Admin access denied — no token' });
        return;
    }

    try {
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any;

        // Valid roles are PRIMARY_ADMIN or SECONDARY_ADMIN
        if (!decoded?.role || !['PRIMARY_ADMIN', 'SECONDARY_ADMIN'].includes(decoded.role)) {
            res.status(403).json({ message: 'Not a valid admin token' });
            return;
        }

        req.admin = {
            id: decoded.id,
            username: decoded.username,
            displayName: decoded.displayName,
            role: decoded.role,
            email: decoded.email,
        };

        next();
    } catch (error) {
        res.status(401).json({ message: 'Admin token invalid or expired' });
    }
};
