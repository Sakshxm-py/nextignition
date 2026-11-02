// Admin permissions middleware for RBAC enforcement
import { Request, Response, NextFunction } from 'express';
import { AdminRequest } from './adminMiddleware';
import {
    ADMIN_PERMISSIONS,
    ADMIN_MODULES,
    ADMIN_ACTIONS,
    AdminModule,
    AdminAction,
    ADMIN_ERROR_MESSAGES,
    hasPermission,
} from '../constants/adminConstants';
import { logAdminAction } from '../utils/adminLogger';

/**
 * The set of admin emails configured via ADMIN_CREDENTIALS (env bootstrap).
 * Parsed once; format is `email:passwordHash:displayName` comma-separated, so
 * the email is the substring before the first ':'. Used to decide whether a
 * PRIMARY token belongs to an env-bootstrap admin (which has no admin_users row)
 * — far safer than the previous "id contains '@'" heuristic, which let ANY
 * email-like id skip the DB suspension/permission checks.
 */
let envAdminEmails: Set<string> | null = null;
const getEnvAdminEmails = (): Set<string> => {
    if (envAdminEmails) return envAdminEmails;
    const raw = process.env.ADMIN_CREDENTIALS || '';
    envAdminEmails = new Set(
        raw.split(',')
            .map((entry) => {
                const idx = entry.indexOf(':');
                return idx === -1 ? '' : entry.substring(0, idx).trim().toLowerCase();
            })
            .filter(Boolean)
    );
    return envAdminEmails;
};

/**
 * Middleware to enforce admin permission for a specific module and action
 * Usage: app.post('/admin/freeze/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.SUSPEND), freezeUser);
 */
export const enforceAdminPermission = (module: AdminModule, action: AdminAction) => {
    return async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Check if admin is authenticated (should already be done by protectAdmin middleware)
            if (!req.admin) {
                res.status(401).json({ message: ADMIN_ERROR_MESSAGES.UNAUTHORIZED });
                return;
            }

            // Env-based bootstrap admin (ADMIN_CREDENTIALS) uses its email as the
            // token id and has no admin_users row, so it can't go through the DB
            // lookup below. Allow it ONLY if the id matches a configured env admin
            // email (not merely any '@'-containing string), and still write to the
            // audit trail (the email is recorded in the change summary because the
            // admin_id FK column can't hold a non-UUID value).
            if (
                req.admin.role === 'PRIMARY_ADMIN' &&
                typeof req.admin.id === 'string' &&
                getEnvAdminEmails().has(req.admin.id.toLowerCase())
            ) {
                const envAdminEmail = req.admin.id;
                req.logAdminAction = async (targetId: string, changeSummary?: any) => {
                    await logAdminAction(envAdminEmail, module, action, targetId, { ...changeSummary, envAdmin: envAdminEmail });
                };
                next();
                return;
            }

            // Check if admin is still active (query database to verify)
            const { supabase } = require('../utils/supabase');
            const { data: adminData, error } = await supabase
                .from('admin_users')
                .select('role, status')
                .eq('id', req.admin.id)
                .single();

            if (error || !adminData) {
                res.status(401).json({ message: ADMIN_ERROR_MESSAGES.ADMIN_NOT_FOUND });
                return;
            }

            if (adminData.status === 'suspended') {
                res.status(403).json({ message: ADMIN_ERROR_MESSAGES.ADMIN_SUSPENDED });
                return;
            }

            // Check if admin has permission for this module+action
            if (!hasPermission(adminData.role, module, action)) {
                // Log the denied attempt
                try {
                    await logAdminAction(
                        req.admin.id,
                        module,
                        `${action}_DENIED`,
                        req.params.id || req.body?.userId || 'unknown',
                        { reason: 'insufficient_permissions', role: adminData.role }
                    );
                } catch (logError) {
                    console.error('[AdminPermissions] Failed to log denied action:', logError);
                }

                res.status(403).json({ message: ADMIN_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS });
                return;
            }

            // Update admin's role in request (for use in controllers)
            req.admin.role = adminData.role;

            // Attach logger function for use in controller
            req.logAdminAction = async (targetId: string, changeSummary?: any) => {
                await logAdminAction(req.admin!.id, module, action, targetId, changeSummary);
            };

            next();
        } catch (error) {
            console.error('[AdminPermissions] Error checking permissions:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
};

/**
 * Middleware to require a specific admin role
 * Usage: app.get('/admin/activity-logs', requireAdminRole('PRIMARY_ADMIN'), getActivityLogs);
 */
export const requireAdminRole = (requiredRole: 'PRIMARY_ADMIN' | 'SECONDARY_ADMIN') => {
    return (req: AdminRequest, res: Response, next: NextFunction): void => {
        if (!req.admin) {
            res.status(401).json({ message: ADMIN_ERROR_MESSAGES.UNAUTHORIZED });
            return;
        }

        if (req.admin.role !== requiredRole) {
            res.status(403).json({
                message: `This action requires ${requiredRole} role`,
            });
            return;
        }

        next();
    };
};

/**
 * Middleware to allow only PRIMARY_ADMIN
 * Usage: app.post('/admin/admins', onlyPrimaryAdmin(), createSecondaryAdmin);
 *
 * Also attaches req.logAdminAction (like enforceAdminPermission does) so that
 * sensitive PRIMARY-only operations — creating/suspending/deleting admins,
 * changing settings, broadcasts — are written to the audit trail. Without this
 * the handlers' `if (req.logAdminAction)` guards silently skip all logging.
 */
export const onlyPrimaryAdmin = (module: AdminModule = ADMIN_MODULES.ADMIN_MGMT) => {
    return (req: AdminRequest, res: Response, next: NextFunction): void => {
        if (!req.admin || req.admin.role !== 'PRIMARY_ADMIN') {
            res.status(403).json({
                message: ADMIN_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
            });
            return;
        }

        req.logAdminAction = async (targetId: string, changeSummary?: any) => {
            await logAdminAction(req.admin!.id, module, ADMIN_ACTIONS.MANAGE, targetId, changeSummary);
        };

        next();
    };
};

/**
 * Extend AdminRequest interface to include logging function
 * This is set by enforceAdminPermission middleware
 */
declare global {
    namespace Express {
        interface Request {
            logAdminAction?: (targetId: string, changeSummary?: any) => Promise<void>;
        }
    }
}
