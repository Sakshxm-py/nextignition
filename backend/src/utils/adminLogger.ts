// Admin activity logging utility
// Logs all admin actions to the admin_logs table for audit trail.
// (Note: admin_activity_logs was an earlier duplicate of this table and has been
// consolidated into admin_logs — see migration 009.)

import { supabase } from './supabase';

/**
 * Log an admin action to the database
 */
export async function logAdminAction(
    adminId: string,
    module: string,
    action: string,
    targetId?: string,
    changeSummary?: any,
    ipAddress?: string
): Promise<void> {
    try {
        const resolvedAdminId = (!adminId || adminId.includes('@')) ? null : adminId;
        const { error } = await supabase.from('admin_logs').insert({
            admin_id: resolvedAdminId,
            module,
            action,
            target_id: targetId || null,
            change_summary: changeSummary || null,
            ip_address: ipAddress || null,
            timestamp: new Date().toISOString(),
        });

        if (error) {
            console.error('[AdminLogger] Failed to log action:', error);
            // Don't throw - logging failure shouldn't block the actual action
        }
    } catch (error) {
        console.error('[AdminLogger] Error logging admin action:', error);
        // Silently fail - logging shouldn't break the application
    }
}

/**
 * Get admin activity logs with filtering and pagination
 */
export async function getAdminActivityLogs(
    filters?: {
        adminId?: string;
        module?: string;
        action?: string;
        targetId?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }
) {
    try {
        const page = filters?.page || 1;
        const limit = Math.min(filters?.limit || 50, 500); // Max 500 per page
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('admin_logs')
            .select('*', { count: 'exact' })
            .order('timestamp', { ascending: false });

        if (filters?.adminId) {
            query = query.eq('admin_id', filters.adminId);
        }

        if (filters?.module) {
            query = query.eq('module', filters.module);
        }

        if (filters?.action) {
            query = query.eq('action', filters.action);
        }

        if (filters?.targetId) {
            query = query.eq('target_id', filters.targetId);
        }

        if (filters?.startDate) {
            query = query.gte('timestamp', filters.startDate);
        }

        if (filters?.endDate) {
            query = query.lte('timestamp', filters.endDate);
        }

        const { data, count, error } = await query.range(from, to);

        if (error) throw error;

        return {
            logs: data || [],
            total: count || 0,
            page,
            limit,
        };
    } catch (error) {
        console.error('[AdminLogger] Error fetching activity logs:', error);
        throw error;
    }
}

/**
 * Get activity logs for a specific admin
 */
export async function getAdminActivityHistory(adminId: string, limit = 100) {
    try {
        const { data, error } = await supabase
            .from('admin_logs')
            .select('*')
            .eq('admin_id', adminId)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('[AdminLogger] Error fetching activity history:', error);
        throw error;
    }
}

/**
 * Create audit trail for sensitive operations
 */
export async function auditLog(
    adminId: string,
    operation: string,
    details: {
        module: string;
        action: string;
        targetId?: string;
        before?: any;
        after?: any;
        reason?: string;
    }
): Promise<void> {
    const changeSummary = {
        operation,
        before: details.before,
        after: details.after,
        reason: details.reason,
        timestamp: new Date().toISOString(),
    };

    await logAdminAction(adminId, details.module, details.action, details.targetId, changeSummary);
}
