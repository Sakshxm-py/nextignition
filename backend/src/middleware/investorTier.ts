import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { INVESTOR_TIERS, TIER_NAMES, VERIFICATION_MESSAGES } from '../constants';
import { isFreePlatform } from '../utils/clientPlatform';

/**
 * Middleware to enforce investor tier-based access controls
 * Restricts certain features based on investorTier
 */
export const enforceInvestorTier = (requiredTier: 1 | 2 | 3) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            // iOS ships fully free — no tier gating for the iOS client (Apple 2.1 / 3.1.1).
            if (isFreePlatform(req)) {
                return next();
            }

            // Check if user has investorTier (from auth or database)
            const userTier = req.user?.investorTier || 0;

            // If user has no investorTier, skip this check (let other middleware handle authorization)
            if (!userTier) {
                return next();
            }

            // Check if user meets tier requirement
            if (userTier < requiredTier) {
                return res.status(403).json({
                    message: `This feature requires ${TIER_NAMES[requiredTier]} access (${TIER_NAMES[requiredTier]} investor tier)`,
                    currentTier: TIER_NAMES[userTier],
                    requiredTier: TIER_NAMES[requiredTier]
                });
            }

            next();
        } catch (error: any) {
            console.error('Error in enforceInvestorTier:', error);
            return res.status(500).json({ message: 'Authorization check failed' });
        }
    };
};

/**
 * Middleware to lock profile editing for unverified investors
 * Tier 1 (Unverified) investors can only view, not edit profiles
 */
export const profileLockMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // iOS ships fully free — no profile-lock gating for the iOS client (Apple 2.1 / 3.1.1).
        if (isFreePlatform(req)) {
            return next();
        }

        if (req.user?.role === 'investor' && req.user?.investorTier === INVESTOR_TIERS.UNVERIFIED) {
            if (['PUT', 'POST', 'DELETE', 'PATCH'].includes(req.method)) {
                return res.status(403).json({
                    message: VERIFICATION_MESSAGES.PROFILE_LOCKED,
                    lockReason: VERIFICATION_MESSAGES.PROFILE_LOCK_REASON,
                    action: VERIFICATION_MESSAGES.VERIFY_PROFILE_ACTION
                });
            }
        }

        next();
    } catch (error: any) {
        console.error('Error in profileLockMiddleware:', error);
        return res.status(500).json({ message: 'Profile lock check failed' });
    }
};

/**
 * Middleware to check if user is verified (Tier 2 or higher)
 */
export const requireVerifiedInvestor = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // iOS ships fully free — no verification gating for the iOS client (Apple 2.1 / 3.1.1).
        if (isFreePlatform(req)) {
            return next();
        }

        if (req.user?.role === 'investor' && req.user?.investorTier === INVESTOR_TIERS.UNVERIFIED) {
            return res.status(403).json({
                message: VERIFICATION_MESSAGES.VERIFIED_INVESTOR_REQUIRED,
                currentTier: TIER_NAMES[INVESTOR_TIERS.UNVERIFIED],
                action: VERIFICATION_MESSAGES.VERIFIED_INVESTOR_ACTION
            });
        }

        next();
    } catch (error: any) {
        console.error('Error in requireVerifiedInvestor:', error);
        return res.status(500).json({ message: 'Verification check failed' });
    }
};

/**
 * Add investor tier information to request object
 */
export const attachInvestorTierInfo = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.user?.role === 'investor') {
            req.user.tierInfo = {
                tier: req.user.investorTier || INVESTOR_TIERS.UNVERIFIED,
                tierName: TIER_NAMES[req.user.investorTier || INVESTOR_TIERS.UNVERIFIED],
                isLocked: (req.user.investorTier || INVESTOR_TIERS.UNVERIFIED) === INVESTOR_TIERS.UNVERIFIED
            };
        }

        next();
    } catch (error: any) {
        console.error('Error in attachInvestorTierInfo:', error);
        return res.status(500).json({ message: 'Tier info attachment failed' });
    }
};
