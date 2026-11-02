import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// ==========================================================
// 1. YOUR RENDER URL
// ==========================================================
import { resolveApiBase } from '../utils/apiResolution';

const PREFERRED_API_BASE_KEY = 'preferredApiBaseUrl';

const isLocalApiBase = (baseUrl?: string) => {
    if (!baseUrl) return false;
    const trimmed = String(baseUrl).trim();
    return (trimmed.startsWith('http://localhost:') ||
            trimmed.startsWith('http://127.0.0.1:') ||
            trimmed.startsWith('http://10.0.2.2:') ||
            trimmed.startsWith('http://192.168.')) &&
           trimmed.endsWith('/api');
};

const getPreferredBaseUrl = () => {
    // 0. Priority: previously working base URL (stored by socketService or our fallback logic)
    try {
        const stored = localStorage.getItem(PREFERRED_API_BASE_KEY);
        if (stored && (stored.includes(':5001') || stored.includes(':5002'))) {
            localStorage.removeItem(PREFERRED_API_BASE_KEY);
        }
        // REMOVED: Aggressive isLocalApiBase(stored) early return.
        // Returning local cached bases breaks moving from testing -> production
        // because the emulator permanently remembers '10.0.2.2:5000' and ignores the production URL.
    } catch {
        // ignore
    }

    // 1. Priority: Robust resolution via shared utility
    return resolveApiBase(import.meta.env.VITE_API_URL);
};

// Final cleanup logic
try {
    const stored = localStorage.getItem(PREFERRED_API_BASE_KEY);
    if (stored && (stored.includes(':5001') || stored.includes(':5002'))) {
        localStorage.removeItem(PREFERRED_API_BASE_KEY);
    }
} catch { /* ignore */ }


const api = axios.create({
    baseURL: getPreferredBaseUrl(),
    timeout: 90000,
});

// Keys cleared when a session ends (mirrors authService.clearSession). Admin
// keys are intentionally left untouched — the admin panel has its own session.
const AUTH_STORAGE_KEYS = ['token', 'user', 'refreshToken', 'rememberMe', 'lastActiveAt', 'sessionStartAt'];
const clearAuthStorage = () => {
    AUTH_STORAGE_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
    try { sessionStorage.removeItem('sessionActive'); } catch { /* ignore */ }
};

// Normalise a base URL the same way the request interceptor does, so the
// interceptor-free refresh call below hits the right `/api` path.
const normalizeBase = (base?: string) => {
    let b = base || '';
    if (b && !b.includes('/api')) b = b.endsWith('/') ? b + 'api' : b + '/api';
    if (b && !b.endsWith('/')) b = b + '/';
    return b;
};

// Single-flight access-token refresh. Uses a bare axios call (no interceptors)
// so a failed refresh can't recurse back into this logic.
let refreshPromise: Promise<string | null> | null = null;
export const refreshAuthToken = (): Promise<string | null> => {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) return null;
            try {
                const base = normalizeBase(getPreferredBaseUrl());
                const resp = await axios.post(`${base}auth/refresh`, { refreshToken }, { timeout: 30000 });
                const newToken = resp.data?.token;
                if (newToken) {
                    localStorage.setItem('token', newToken);
                    if (resp.data.refreshToken) localStorage.setItem('refreshToken', resp.data.refreshToken);
                    return newToken;
                }
                return null;
            } catch {
                return null;
            }
        })().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
};

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Tell the backend which client this is. On iOS the app is fully free, so the
    // backend skips all plan/tier gates for this platform (Apple Guideline 3.1.1).
    try { config.headers['X-Client-Platform'] = Capacitor.getPlatform(); } catch { /* ignore */ }

    // Safety check: if their production Env Var forgot the `/api` suffix, append it silently:
    if (config.baseURL && !config.baseURL.includes('/api')) {
        config.baseURL = config.baseURL.endsWith('/') ? config.baseURL + 'api' : config.baseURL + '/api';
    }

    if (config.url && config.url.startsWith('/')) {
        config.url = config.url.substring(1);
    }
    if (config.baseURL && !config.baseURL.endsWith('/')) {
        config.baseURL = config.baseURL + '/';
    }

    console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
});

let lastActivityWrite = 0;

api.interceptors.response.use(
    (response) => {
        console.log(`[API] Success: ${response.status} from ${response.config.url}`);

        // Persist working base URL (helps Socket.IO + future reloads)
        try {
            const base = response.config.baseURL;
            if (base && isLocalApiBase(base)) {
                localStorage.setItem(PREFERRED_API_BASE_KEY, base);
            }
        } catch {
            // ignore
        }

        // Any successful authenticated call counts as user activity (throttled),
        // so the idle-timeout clock in authService reflects real usage.
        try {
            const now = Date.now();
            if (localStorage.getItem('token') && now - lastActivityWrite > 30000) {
                lastActivityWrite = now;
                localStorage.setItem('lastActiveAt', String(now));
            }
        } catch { /* ignore */ }

        return response;
    },
    async (error) => {
        const originalRequest: any = error.config || {};
        const status = error.response?.status;

        // Handle common network errors
        const isNetwork = error?.message === 'Network Error' || String(error?.code || '').toUpperCase().includes('ERR_NETWORK');
        if (isNetwork) {
            console.error('[API] Network Error - please ensure backend is running.');
        }

        // On a 401, try one silent refresh and replay the request before giving up.
        if (
            status === 401 &&
            !error.response?.data?.isFrozen &&
            !originalRequest._retry &&
            !originalRequest._skipAuthRefresh &&
            localStorage.getItem('refreshToken')
        ) {
            originalRequest._retry = true;
            const newToken = await refreshAuthToken();
            if (newToken) {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            }
        }

        if (status === 401 || (status === 403 && error.response?.data?.isFrozen)) {
            const isFrozen = !!error.response?.data?.isFrozen;
            const errorMsg = error.response?.data?.message || error.message;
            console.error(`[API] Auth Failure (${status}): ${errorMsg}`);

            clearAuthStorage();

            if (isFrozen) {
                // Specific message for frozen accounts
                alert('Your account has been frozen by an administrator. Please contact support.');
            }

            // Only redirect if we're not on the main landing page or login to avoid infinite loops
            const isHomePage = window.location.pathname === '/' && (!window.location.hash || window.location.hash === '#home');
            const isLoginPage = window.location.pathname.includes('/login') || window.location.hash === '#login';

            if (!isHomePage && !isLoginPage) {
                console.warn('[API] Force logging out and redirecting to home.');
                window.location.href = '/';
            }
        } else if (error.response?.status === 403) {
            console.warn(`[API] Forbidden (403) but not frozen: ${error.response?.data?.message}`);
        }
        return Promise.reject(error);
    }
);


export default api;
