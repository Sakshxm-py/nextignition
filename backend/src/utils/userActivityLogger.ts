// User activity logging utility
// Logs user actions to user_activity_logs table for admin oversight

import { supabase } from './supabase';
import crypto from 'crypto';

export type UserActionType =
    | 'LOGIN'
    | 'GOOGLE_LOGIN'
    | 'REGISTER'
    | 'DOCUMENT_UPLOAD'
    | 'PITCH_DECK_UPLOAD'
    | 'PROFILE_UPDATE'
    | 'PAYMENT_INITIATED'
    | 'PAYMENT_SUCCESS'
    | 'ROLE_SWITCH'
    | 'PASSWORD_CHANGE'
    | 'PROFILE_VIEW';

/**
 * Log a user action to the user_activity_logs table.
 * Fire-and-forget — never throws, so it never blocks the caller.
 */
export async function logUserActivity(
    userId: string,
    actionType: UserActionType,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        const id = crypto.randomUUID();
        const { error } = await supabase.from('user_activity_logs').insert({
            id,
            user_id: userId,
            action_type: actionType,
            resource_id: metadata?.resourceId || null,
            metadata: metadata ? { ...metadata, resourceId: undefined } : null,
            created_at: new Date().toISOString(),
        });

        if (error) {
            // Table may not exist yet — warn but don't throw
            if (error.code !== '42P01') {
                console.warn('[UserActivityLogger] Failed to log activity:', error.message);
            }
        }
    } catch (err) {
        // Silently ignore — logging must never break the app
        console.warn('[UserActivityLogger] Unexpected error:', err);
    }
}

/**
 * Update login stats on the user record (loginCount, lastLoginAt).
 * Fire-and-forget — never throws.
 */
export async function updateLoginStats(userId: string): Promise<void> {
    try {
        const { data: row, error: fetchErr } = await supabase
            .from('users')
            .select('data')
            .eq('id', userId)
            .single();

        if (fetchErr || !row) return;

        const currentCount = Number(row.data?.loginCount || 0);
        const updated = {
            ...row.data,
            loginCount: currentCount + 1,
            lastLoginAt: new Date().toISOString(),
        };

        await supabase.from('users').update({ data: updated }).eq('id', userId);
    } catch (err) {
        console.warn('[UserActivityLogger] Failed to update login stats:', err);
    }
}
