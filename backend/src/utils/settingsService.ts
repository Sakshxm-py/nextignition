import { supabase } from './supabase';

export interface PlatformSettings {
    maintenanceMode: boolean;
    allowRegistration: boolean;
    useGPT4: boolean;
    dailyLimit: number;
    temperature: number;
    supportEmail: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
    maintenanceMode: false,
    allowRegistration: true,
    useGPT4: false,
    dailyLimit: 10,
    temperature: 0.7,
    supportEmail: 'support@nextignition.io'
};

let cachedSettings: PlatformSettings | null = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getGlobalSettings(): Promise<PlatformSettings> {
    const now = Date.now();
    if (cachedSettings && (now - lastFetch < CACHE_TTL)) {
        return cachedSettings;
    }

    try {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('data')
            .eq('id', 'global')
            .single();

        if (error) {
            console.warn('[SettingsService] Failed to fetch settings, using defaults:', error.message);
            return DEFAULT_SETTINGS;
        }

        cachedSettings = { ...DEFAULT_SETTINGS, ...(data.data || {}) };
        lastFetch = now;
        return cachedSettings!;
    } catch (err) {
        console.error('[SettingsService] Error:', err);
        return DEFAULT_SETTINGS;
    }
}

export function clearSettingsCache() {
    cachedSettings = null;
    lastFetch = 0;
}
