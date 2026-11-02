import api from './api';
import { Capacitor } from '@capacitor/core';

/**
 * Finalize an in-app login: navigate to the post-auth destination, then on
 * native (iOS) force a full page reload.
 *
 * The login/signup handlers only write the session to localStorage and change
 * the hash — they don't update App's `user` state. App self-heals via the hash
 * router, but a hard reload on native is a render-timing-independent, guaranteed
 * fix for the Apple 2.1(a) "returned to the previous screen" bug: the reload
 * remounts App, which hydrates `user` from localStorage before routing, so the
 * just-logged-in user lands on their dashboard instead of being bounced to login.
 * (sessionStorage — redirectAfterAuth, selectedRoles, etc. — survives the reload.)
 */
export const completeAuthRedirect = (role?: string) => {
    // Confirm the session actually persisted. If there's no token, auth did NOT
    // complete — navigating to a dashboard would just bounce the user back to
    // login (the Apple 2.1a "returned to previous screen" symptom). Land them on
    // #login cleanly instead of faking success.
    if (!localStorage.getItem('token')) {
        window.location.hash = '#login';
        return;
    }
    // Resolve a safe role from the argument or the freshly-persisted user.
    // NEVER navigate to "#undefined-dashboard".
    const safeRole = role || getCurrentUser()?.role;
    const redirect = sessionStorage.getItem('redirectAfterAuth');
    if (redirect) {
        sessionStorage.removeItem('redirectAfterAuth');
        window.location.hash = redirect;
    } else if (safeRole) {
        window.location.hash = `#${safeRole}-dashboard`;
    } else {
        window.location.hash = '#home';
    }
    if (Capacitor.isNativePlatform()) {
        window.location.reload();
    }
};


export const login = async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        // Persist the refresh token so the API interceptor can silently renew an
        // expired 1h access token instead of force-logging the user out.
        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }
    }
    return response.data;
};

export const register = async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        // Persist the refresh token so the API interceptor can silently renew an
        // expired 1h access token instead of force-logging the user out.
        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }
    }
    return response.data;
};

export const googleLogin = async (payload: { credential: string; role?: string; roles?: string[] }) => {
    const response = await api.post('/auth/google', payload);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        // Persist the refresh token so the API interceptor can silently renew an
        // expired 1h access token instead of force-logging the user out.
        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }
    }
    return response.data;
};

/**
 * nativeGoogleSignIn — works on both native iOS/Android (via Capacitor WKWebView/WebView)
 * and web. Uses the Google Identity Services credential_response callback that is already
 * wired up by initGoogleSignIn(). On native we trigger the One-Tap / Sign-In button
 * programmatically and resolve when Google calls back with an idToken.
 */
export const nativeGoogleSignIn = (): Promise<{ credential: string; email: string; name: string; picture: string }> => {
    return new Promise((resolve, reject) => {
        const GOOGLE_IOS_CLIENT_ID = '236345953761-9m1hrq23udi96mmiv75b3fqt7uft0j6k.apps.googleusercontent.com';
        const clientId = Capacitor.getPlatform() === 'ios' ? GOOGLE_IOS_CLIENT_ID
            : '236345953761-fiqum6k0vbauebhiinr4dvci0c37jd4o.apps.googleusercontent.com';

        const gis = (window as any).google?.accounts?.id;
        if (!gis) {
            return reject(new Error('Google Identity Services not loaded. Ensure GSI script is present.'));
        }

        const handleResponse = (resp: any) => {
            if (!resp?.credential) return reject(new Error('No credential returned from Google'));
            // Decode the JWT payload to get name/email/picture
            try {
                const parts = resp.credential.split('.');
                const payload = JSON.parse(atob(parts[1]));
                localStorage.setItem('googleSignedIn', 'true');
                resolve({
                    credential: resp.credential,
                    email: payload.email || '',
                    name: payload.name || '',
                    picture: payload.picture || '',
                });
            } catch {
                resolve({ credential: resp.credential, email: '', name: '', picture: '' });
            }
        };

        gis.initialize({ client_id: clientId, callback: handleResponse, use_fedcm_for_prompt: false });
        // Trigger the One-Tap prompt
        gis.prompt((notification: any) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // One-Tap suppressed — show a popup button fallback
                const container = document.createElement('div');
                container.id = '__google_btn_fallback';
                container.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:999999;';
                document.body.appendChild(container);
                gis.renderButton(container, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', logo_alignment: 'left' });
                // Remove once a response comes
                const orig = handleResponse;
                const wrapped = (r: any) => { container.remove(); orig(r); };
                gis.initialize({ client_id: clientId, callback: wrapped, use_fedcm_for_prompt: false });
            }
        });
    });
};

export const appleLogin = async (payload: {
    identityToken: string;
    authorizationCode?: string;
    givenName?: string;
    familyName?: string;
    role?: string;
    roles?: string[];
}) => {
    const response = await api.post('/auth/apple', payload);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        // Persist the refresh token so the API interceptor can silently renew an
        // expired 1h access token instead of force-logging the user out.
        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }
    }
    return response.data;
};

export const nativeAppleSignIn = async () => {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    const result = await SignInWithApple.authorize({
        clientId: 'com.nextignition.gigzsapp',
        redirectURI: 'https://nextignition.com',
        scopes: 'email name',
    });
    return {
        identityToken: result.response.identityToken,
        authorizationCode: result.response.authorizationCode,
        givenName: result.response.givenName ?? undefined,
        familyName: result.response.familyName ?? undefined,
    };
};

// ── Session timeout constants ───────────────────────────────────────────
const IDLE_TIMEOUT_MS   = 60 * 60 * 1000;      // 1 hour idle
const ABS_TIMEOUT_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days absolute
const LAST_ACTIVITY_KEY = '_ni_last_activity';
const SESSION_START_KEY = '_ni_session_start';

/** Call on every real user interaction to reset the idle clock. */
export const markActivity = () => {
    try { localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString()); } catch { /* quota full */ }
};

/**
 * Returns a reason string if the session has expired, otherwise null.
 * 'idle'    — user has been inactive longer than IDLE_TIMEOUT_MS
 * 'expired' — session is older than ABS_TIMEOUT_MS
 */
export const getSessionExpiryReason = (): string | null => {
    if (!localStorage.getItem('token')) return null;
    const now = Date.now();
    const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
    const sessionStart = parseInt(localStorage.getItem(SESSION_START_KEY) || '0', 10);
    if (lastActivity && now - lastActivity > IDLE_TIMEOUT_MS) return 'idle';
    if (sessionStart && now - sessionStart > ABS_TIMEOUT_MS)  return 'expired';
    return null;
};

/**
 * Validates the persisted session on app start.
 * Returns the user object if valid, or null if no token / expired.
 */
export const validateSession = async (): Promise<any> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        // Seed timestamps for brand-new sessions (first open after login)
        if (!localStorage.getItem(SESSION_START_KEY)) {
            localStorage.setItem(SESSION_START_KEY, Date.now().toString());
        }
        if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
            markActivity();
        }

        // Hard-check expiry before trusting the stored user
        if (getSessionExpiryReason()) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem(SESSION_START_KEY);
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            return null;
        }

        const user = getCurrentUser();
        if (user) { markActivity(); return user; }
        return null;
    } catch {
        return null;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (Capacitor.isNativePlatform() && localStorage.getItem('googleSignedIn') === 'true') {
        // Web-based GSI sign-out (revoke token if possible)
        try { (window as any).google?.accounts?.id?.revoke?.('', () => {}); } catch { /* ignore */ }
        localStorage.removeItem('googleSignedIn');
    }
    return true;
};

export const getCurrentUser = () => {
    try {
        const user = localStorage.getItem('user');
        return user && user !== 'undefined' ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
};

export const setCurrentUser = (user: any) => {
    if (user) {
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        localStorage.removeItem('user');
    }
};

export const fetchMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};
export const getProfilesCreated = async () => {
    const response = await api.get('/auth/profiles-created');
    return response.data;
};

export const switchRole = async (role: string) => {
    const response = await api.put('/auth/switch-role', { role });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        // Persist the refresh token so the API interceptor can silently renew an
        // expired 1h access token instead of force-logging the user out.
        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }
    }
    return response.data;
};

export const updateVoiceSettings = async (settings: any) => {
    const response = await api.put('/auth/voice-settings', { settings });
    // Update local storage so the change persists in current session immediately
    const user = getCurrentUser();
    if (user) {
        user.voiceSettings = { ...(user.voiceSettings || {}), ...settings };
        setCurrentUser(user);
    }
    return response.data;
};

export const updateEmail = async (email: string) => {
    const response = await api.put('/auth/update-email', { email });
    if (response.data) {
        const user = getCurrentUser();
        if (user) {
            user.email = email;
            setCurrentUser(user);
        }
    }
    return response.data;
};

export const updatePassword = async (passwords: any) => {
    const response = await api.put('/auth/update-password', passwords);
    return response.data;
};

export const toggle2FA = async (enabled: boolean) => {
    const response = await api.put('/auth/toggle-2fa', { enabled });
    if (response.data) {
        const user = getCurrentUser();
        if (user) {
            user.twoFactorEnabled = enabled;
            setCurrentUser(user);
        }
    }
    return response.data;
};

export const deactivateAccount = async () => {
    const response = await api.put('/auth/deactivate');
    return response.data;
};

export const deleteAccount = async () => {
    const response = await api.delete('/auth/delete-account');
    logout();
    return response.data;
};

export const updateNotificationSettings = async (settings: any) => {
    const response = await api.put('/auth/notification-settings', { settings });
    if (response.data) {
        const user = getCurrentUser();
        if (user) {
            user.notificationSettings = settings;
            setCurrentUser(user);
        }
    }
    return response.data;
};

export const fetchNotificationSettings = async () => {
    const response = await api.get('/auth/notification-settings');
    const serverSettings = response.data.notificationSettings || null;
    if (serverSettings) {
        const user = getCurrentUser();
        if (user) {
            user.notificationSettings = serverSettings;
            setCurrentUser(user);
        }
    }
    return serverSettings;
};

export const getPrivacySettings = async () => {
    const response = await api.get('/auth/privacy-settings');
    return response.data;
};

export const updatePrivacySettings = async (settings: any) => {
    const response = await api.put('/auth/privacy-settings', { settings });
    return response.data;
};

export const requestDataExport = async () => {
    const response = await api.post('/auth/data-export');
    return response.data;
};

export const submitSupportTicket = async (message: string) => {
    const response = await api.post('/auth/support-ticket', { message });
    return response.data;
};

export const getHelpArticles = async () => {
    const response = await api.get('/auth/help-articles');
    return response.data;
};

export const requestVerificationOtp = async (email: string) => {
    const response = await api.post('/auth/email/otp', { email });
    return response.data;
};

export const verifyEmail = async (email: string, otp: string) => {
    const response = await api.post('/auth/email/verify', { email, otp });
    return response.data;
};

// Global singleton for Google Sign-In to prevent "initialized multiple times" errors
let googleSignInInitialized = false;
let currentCallback: ((response: any) => void) | null = null;

export const initGoogleSignIn = (clientId: string, callback: (response: any) => void): boolean => {
    // Web only - native doesn't need this initialization flow
    if (Capacitor.isNativePlatform()) return true;

    currentCallback = callback;
    const g = (window as any).google;
    if (!g?.accounts?.id) return false;
    if (googleSignInInitialized) return true;

    try {
        g.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
                if (currentCallback) currentCallback(response);
            },
            auto_select: false,
            cancel_on_tap_outside: false,
        });
        googleSignInInitialized = true;
        return true;
    } catch (error: any) {
        if (error?.message?.includes('initialized')) {
            googleSignInInitialized = true;
            return true;
        }
        return false;
    }
};