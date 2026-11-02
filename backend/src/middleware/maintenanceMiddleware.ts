import { Request, Response, NextFunction } from 'express';
import { getGlobalSettings } from '../utils/settingsService';

/**
 * Middleware to check if the platform is in maintenance mode.
 * Admins are allowed to bypass maintenance mode.
 */
export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await getGlobalSettings();
        
        if (settings.maintenanceMode) {
            // Check if it's an admin request. Admin routes usually start with /api/admin
            // or have a specific auth token that identifies them as admin.
            // Since we use different protection for admin routes, 
            // we can check if the URL contains '/admin/'
            
            const isAdminRoute = req.originalUrl.includes('/admin/');
            
            if (!isAdminRoute) {
                return res.status(503).json({ 
                    maintenance: true, 
                    message: 'NextIgnition is currently undergoing scheduled maintenance. Please check back soon!',
                    supportEmail: settings.supportEmail
                });
            }
        }
        
        next();
    } catch (error) {
        // If settings fetch fails, default to allowing the request
        next();
    }
};
