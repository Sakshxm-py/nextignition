import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';
import { sendEmail } from '../utils/mailer';
import { logUserActivity, updateLoginStats } from '../utils/userActivityLogger';
import { getGlobalSettings } from '../utils/settingsService';
import { stripSensitiveUserFields } from '../utils/sanitizeUser';
import { recordProfileViewEvent, recordSearchAppearanceEvents } from './engagementController';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const sanitizeUser = (data: any) => {
    const { password, ...safe } = data;
    return safe;
};

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set. This is required for authentication.');
    }
    return secret;
};

// Short-lived access token. Kept small so a returning session must re-validate
// against the server (via the refresh token) rather than living for weeks.
const generateToken = (id: string, role: string) => {
    return jwt.sign({ id, role }, getJwtSecret(), { expiresIn: '1h' });
};

// Long-lived refresh token. Marked with type:'refresh' so `protect` can reject
// it if anyone tries to use it as an access token.
const generateRefreshToken = (id: string, role: string) => {
    return jwt.sign({ id, role, type: 'refresh' }, getJwtSecret(), { expiresIn: '30d' });
};

// Convenience: both tokens for a login/registration response.
const issueTokens = (id: string, role: string) => ({
    token: generateToken(id, role),
    refreshToken: generateRefreshToken(id, role),
});

// POST /api/auth/refresh — exchange a valid refresh token for a new access token.
export const refreshAccessToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body || {};
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }

        let decoded: any;
        try {
            decoded = jwt.verify(refreshToken, getJwtSecret());
        } catch {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        if (!decoded || decoded.type !== 'refresh' || !decoded.id) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Make sure the account still exists and is not frozen before re-issuing.
        const { data: userRow, error } = await supabase
            .from('users')
            .select('data')
            .eq('id', decoded.id)
            .single();

        if (error || !userRow) {
            return res.status(401).json({ message: 'User no longer exists' });
        }
        if (userRow.data?.isFrozen) {
            return res.status(403).json({ message: 'Your account has been frozen by an administrator.', isFrozen: true });
        }

        const role = userRow.data?.role || decoded.role || 'founder';
        // Rotate both tokens so the refresh window slides forward with use.
        return res.json(issueTokens(decoded.id, role));
    } catch (err: any) {
        console.error('[refreshAccessToken] Error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

const resolvePlan = (p1: any, p2: any) => {
    const s1 = String(p1 || 'free').toLowerCase();
    const s2 = String(p2 || 'free').toLowerCase();
    if (s1 === 'elite' || s2 === 'elite') return 'elite';
    if (s1 === 'pro' || s2 === 'pro') return 'pro';
    return 'free';
};

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedEmail = email?.toLowerCase()?.trim();

        // Check platform settings
        const settings = await getGlobalSettings();
        if (!settings.allowRegistration) {
            return res.status(403).json({ message: 'New user registration is currently disabled by the administrator.' });
        }

        console.log(`Registration attempt for: ${normalizedEmail} as ${role}`);
        
        const { data: existing, error: existingError } = await supabase.from('users').select('id').ilike('data->>email', normalizedEmail).single();
        if (existingError && existingError.code !== 'PGRST116') {
            console.error('Registration: existing user check error:', existingError);
            return res.status(500).json({ message: 'Error checking existing user' });
        }
        if (existing) {
            console.warn('Registration failed: User already exists:', normalizedEmail);
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const id = crypto.randomUUID();
        const userData = { 
            id, 
            name, 
            email: normalizedEmail, 
            password: hashedPassword, 
            role: role || 'founder', 
            roles: [role || 'founder'], 
            isVerified: (role || 'founder') === 'founder', 
            profile: {}, 
            profilesCreated: {
                founder: false,
                expert: false,
                investor: false
            },
            createdAt: new Date().toISOString() 
        };

        const { error } = await supabase.from('users').insert([{ id, data: userData }]);
        if (error) {
            console.error('Supabase insertion error during registration:', error.message);
            throw error;
        }
        
        console.log('User registered successfully:', normalizedEmail);

        // Track registration activity (fire-and-forget)
        logUserActivity(id, 'REGISTER', { role: userData.role, email: normalizedEmail });
        

        // Send a simple welcome email
        try {
            console.log('[Registration] Attempting to send welcome email to:', normalizedEmail);
            const emailResult = await sendEmail({
                to: normalizedEmail,
                subject: 'Welcome to NextIgnition! 🚀',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                        <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                            <h1 style="color: #2563eb; font-size: 28px; margin: 0;">Welcome to NextIgnition! 🚀</h1>
                        </div>
                        <div style="padding: 24px 0; color: #1f2937; line-height: 1.7;">
                            <h2 style="font-size: 20px; margin-top: 0;">Hello ${name},</h2>
                            <p>We're thrilled to have you join our ecosystem of founders, experts, and investors. Your account is now <strong>fully active</strong> — no extra steps needed!</p>
                            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                                <h3 style="font-size: 16px; margin-top: 0; color: #2563eb;">What's next?</h3>
                                <ul style="padding-left: 20px; color: #374151;">
                                    <li style="margin-bottom: 8px;"><strong>Complete your profile</strong> — Tell the community about your background and goals.</li>
                                    <li style="margin-bottom: 8px;"><strong>Discover opportunities</strong> — Connect with investors, mentors or talented founders.</li>
                                    <li style="margin-bottom: 8px;"><strong>Join communities</strong> — Engage in discussions tailored to your role.</li>
                                </ul>
                            </div>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://nextignition.com" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                            </div>
                        </div>
                        <div style="padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
                            <p>© 2026 NextIgnition. All rights reserved.</p>
                        </div>
                    </div>`
            });
            console.log('[Registration] ✅ Welcome email sent successfully:', emailResult);
        } catch (e: any) {
            console.error('[Registration] ❌ Failed to send welcome email:', {
                message: e?.message,
                error: e
            });
        }

        // Registration complete — return the token so the user is logged in immediately
        res.status(201).json({
            ...userData,
            password: undefined,
            ...issueTokens(id, userData.role),
            founder_plan: 'free',
            expert_plan: 'free',
            investor_plan: 'free'
        });
    } catch (error: any) { 
        console.error('SERVER REGISTER ERROR:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email?.toLowerCase()?.trim();
        console.log(`Login attempt for email: ${normalizedEmail}`);
        
        // Fetch all potential users matching this email to handle duplicates gracefully.
        // IMPORTANT: plan tiers are stored as top-level columns (founder_plan/expert_plan/investor_plan)
        // and may not exist in older deployments, so we fall back to id,data.
        let userRows: any[] | null = null;
        {
            const res1 = await supabase
                .from('users')
                .select('id, data, founder_plan, expert_plan, investor_plan')
                .ilike('data->>email', normalizedEmail);

            if (res1.error) {
                const msg = String(res1.error?.message || '').toLowerCase();
                const looksLikeMissingColumn = msg.includes('column') || msg.includes('founder_plan') || msg.includes('expert_plan') || msg.includes('investor_plan');
                if (looksLikeMissingColumn) {
                    const res2 = await supabase.from('users').select('id, data').ilike('data->>email', normalizedEmail);
                    if (res2.error) {
                        console.error('[Login] Supabase fetch error:', res2.error.message);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    userRows = res2.data as any[] | null;
                } else {
                    console.error('[Login] Supabase fetch error:', res1.error.message);
                    return res.status(500).json({ message: 'Server error' });
                }
            } else {
                userRows = res1.data as any[] | null;
            }
        }

        // 1. [CRITICAL] Check if ANY existing account for this email is frozen
        const frozenUser = userRows?.find(u => u.data?.isFrozen);
        if (frozenUser) {
            console.warn(`[Login] REJECTED: Frozen account found for ${normalizedEmail} (ID: ${frozenUser.id})`);
            return res.status(403).json({ 
                isFrozen: true, 
                message: 'Your account has been frozen by an admin. Please contact support.' 
            });
        }

        // 2. [AUTO-REGISTRATION] If no users found, create a new one
        if (!userRows || userRows.length === 0) {
            console.log(`[Login] Auto-registering new account for ${normalizedEmail}`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const id = crypto.randomUUID();
            const defaultRole = 'founder';

            const newUserData = {
                id,
                email: normalizedEmail,
                name: normalizedEmail.split('@')[0],
                password: hashedPassword,
                role: defaultRole,
                roles: [defaultRole],
                isVerified: true,  // Auto-login defaults to founder, give instant access
                profilesCreated: { founder: false, expert: false, investor: false },
                createdAt: new Date().toISOString()
            };

            const { error: insertError } = await supabase.from('users').insert([{ id, data: newUserData }]);
            if (insertError) {
                console.error('[Login] Failed to create new user:', insertError.message);
                return res.status(500).json({ message: 'Failed to create user account' });
            }

            try {
                console.log('[Login] Sending welcome email to auto-created user:', normalizedEmail);
                await sendEmail({
                    to: normalizedEmail,
                    subject: 'Welcome to NextIgnition! 🚀',
                    text: `Welcome to NextIgnition, ${newUserData.name}! Your account is ready.`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                                <h1 style="color: #2563eb; font-size: 28px; margin: 0;">Welcome to NextIgnition! 🚀</h1>
                            </div>
                            <div style="padding: 24px 0; color: #1f2937; line-height: 1.7;">
                                <h2 style="font-size: 20px; margin-top: 0;">Hello ${newUserData.name},</h2>
                                <p>We're thrilled to have you join our ecosystem of founders, experts, and investors. Your account is now <strong>fully active</strong>!</p>
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="https://nextignition.com" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                                </div>
                            </div>
                        </div>`
                });
                console.log('[Login] ✅ Welcome email sent to auto-created user');
            } catch (e: any) {
                console.error('[Login] ❌ Failed to send welcome email:', {
                    message: e?.message,
                    error: e
                });
            }

            return res.json({
                ...sanitizeUser(newUserData),
                ...issueTokens(id, defaultRole),
                founder_plan: 'free',
                expert_plan: 'free',
                investor_plan: 'free'
            });
        }

        // 3. [AUTHENTICATION] Try to find the correct user among duplicates
        let authenticatedUser = null;
        for (const row of userRows) {
            if (row.data.password && (await bcrypt.compare(password, row.data.password))) {
                authenticatedUser = row;
                break;
            }
        }

        if (authenticatedUser) {
            console.log('Login successful for:', normalizedEmail);

            // Track login activity and update login stats (fire-and-forget)
            updateLoginStats(authenticatedUser.id);
            logUserActivity(authenticatedUser.id, 'LOGIN', { method: 'email' });

            const user = {
                ...sanitizeUser(authenticatedUser.data),
                founder_plan: resolvePlan(authenticatedUser.founder_plan, authenticatedUser.data?.founder_plan),
                expert_plan: resolvePlan(authenticatedUser.expert_plan, authenticatedUser.data?.expert_plan),
                investor_plan: resolvePlan(authenticatedUser.investor_plan, authenticatedUser.data?.investor_plan),
            };
            return res.json({ ...user, ...issueTokens(authenticatedUser.id, authenticatedUser.data.role) });
        }

        const oauthUser = userRows.find(u => !u.data.password && u.data.googleId);
        if (oauthUser) {
            return res.status(401).json({ message: 'This account uses Google Sign-In. Please click "Continue with Google".' });
        }

        return res.status(401).json({ message: 'Invalid email or password' });
    } catch (error: any) { 
        console.error('SERVER LOGIN ERROR:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { token, credential, role: providedRole, roles: providedRoles } = req.body;
        const idToken = token || credential;
        if (!idToken) return res.status(400).json({ message: 'No Google token provided' });

        const audience = [
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_ANDROID_CLIENT_ID,
            process.env.GOOGLE_IOS_CLIENT_ID
        ].filter(Boolean) as string[];

        const ticket = await client.verifyIdToken({ idToken, audience });
        const { name, email, picture, sub: googleId } = ticket.getPayload()!;
        const normalizedEmail = email?.toLowerCase()?.trim();
        
        const validPicture = (picture && /^https?:\/\//i.test(picture)) ? picture : undefined;

        const { data: userRows, error: fetchError } = await supabase.from('users').select('id, data').eq('data->>email', normalizedEmail);
        
        if (fetchError) {
            console.error('[GoogleLogin] Supabase fetch error:', fetchError.message);
            return res.status(500).json({ message: 'Server error' });
        }
        
        const frozenUser = userRows?.find(u => u.data?.isFrozen);
        if (frozenUser) {
            return res.status(403).json({ isFrozen: true, message: 'Your account has been frozen by an admin.' });
        }

        const existing = userRows && userRows.length > 0 ? userRows[0] : null;
        
        if (existing) {
            // Select plans as well
            const { data: fullRow } = await supabase
                .from('users')
                .select('data, founder_plan, expert_plan, investor_plan')
                .eq('id', existing.id)
                .single();

            const currentRoles = existing.data.roles || [existing.data.role || 'founder'];
            const newRoles = providedRoles || (providedRole ? [providedRole] : []);
            const updatedRoles = Array.from(new Set([...currentRoles, ...newRoles]));
            const sessionRole = providedRole || existing.data.role || 'founder';
            
            const updatedProfilesCreated = { ...(existing.data.profilesCreated || { founder: false, expert: false, investor: false }) };
            newRoles.forEach((r: any) => {
                const roleKey = r as keyof typeof updatedProfilesCreated;
                if (roleKey === 'founder' || roleKey === 'expert' || roleKey === 'investor') {
                    updatedProfilesCreated[roleKey] = true;
                }
            });

            const updatedData = {
                ...existing.data,
                roles: updatedRoles,
                role: sessionRole,
                profilesCreated: updatedProfilesCreated,
                avatar: validPicture || existing.data.avatar,
                name: name || existing.data.name
            };

            await supabase.from('users').update({ data: updatedData }).eq('id', existing.id);

            // Track Google login activity (fire-and-forget)
            updateLoginStats(existing.id);
            logUserActivity(existing.id, 'GOOGLE_LOGIN', { method: 'google' });

            const user = {
                ...sanitizeUser(updatedData),
                founder_plan: resolvePlan(fullRow?.founder_plan, updatedData.founder_plan),
                expert_plan: resolvePlan(fullRow?.expert_plan, updatedData.expert_plan),
                investor_plan: resolvePlan(fullRow?.investor_plan, updatedData.investor_plan),
            };

            return res.json({
                ...user,
                ...issueTokens(existing.id, sessionRole)
            });
        }

        // NEW USER REGISTRATION
        const settings = await getGlobalSettings();
        if (!settings.allowRegistration) {
            return res.status(403).json({ message: 'New user registration is currently disabled by the administrator.' });
        }

        const id = crypto.randomUUID();
        const roles = providedRoles || (providedRole ? [providedRole] : ['founder']);
        const initialRole = providedRole || roles[0] || 'founder';
        
        const initialProfilesCreated = { founder: false, expert: false, investor: false };
        roles.forEach((r: any) => {
            const roleKey = r as keyof typeof initialProfilesCreated;
            if (roleKey === 'founder' || roleKey === 'expert' || roleKey === 'investor') {
                initialProfilesCreated[roleKey] = true;
            }
        });

        const userData = {
            id, name, email: normalizedEmail, avatar: validPicture, googleId,
            role: initialRole, roles, isVerified: initialRole === 'founder',
            profilesCreated: initialProfilesCreated, createdAt: new Date().toISOString()
        };

        const { error: insertError } = await supabase.from('users').insert([{ id, data: userData }]);
        if (insertError) return res.status(500).json({ message: 'Failed to create user account' });


        try {
            await sendEmail({
                to: normalizedEmail!,
                subject: 'NextIgnition: Welcome!',
                text: `Welcome, ${name}! Your account has been created via Google.`,
                html: `<p>Hello ${name}, Welcome to NextIgnition!</p>`
            });
        } catch (e) {}

        return res.json({ ...sanitizeUser(userData), ...issueTokens(id, initialRole) });
    } catch (error) {
        console.error('Google login error:', error);
        return res.status(500).json({ message: 'Google login failed' }); 
    }
};

export const appleLogin = async (req: Request, res: Response) => {
    try {
        const { identityToken, authorizationCode, givenName, familyName, role: providedRole, roles: providedRoles } = req.body;
        if (!identityToken) return res.status(400).json({ message: 'No Apple identity token provided' });

        // Verify Apple identity token with Apple's public keys
        let appleId: string;
        let rawEmail: string | undefined;

        try {
            // Native Sign in with Apple tokens carry the app's bundle ID as `aud`,
            // while a web Service ID may be configured in APPLE_CLIENT_ID. Accept
            // both so a misconfigured env can't 401 a valid native login (the bug
            // where the reviewer was "returned to the previous screen" after Apple sign-in).
            const acceptedAudiences = Array.from(new Set([
                process.env.APPLE_CLIENT_ID,
                'com.nextignition.gigzsapp',
            ].filter(Boolean))) as string[];
            const applePayload = await appleSignin.verifyIdToken(identityToken, {
                audience: acceptedAudiences,
                ignoreExpiration: false,
            });
            appleId = applePayload.sub;
            rawEmail = applePayload.email;
        } catch (verifyErr: any) {
            // Never trust an unverified token. Decoding without signature
            // verification would let an attacker forge any sub/email and log in
            // as anyone, so a verification failure must be a hard 401.
            console.warn('[AppleLogin] Apple identity token verification failed:', verifyErr.message);
            return res.status(401).json({ message: 'Invalid Apple identity token' });
        }

        if (!appleId) return res.status(400).json({ message: 'Invalid Apple token payload' });

        // Apple only returns email on the FIRST login. Subsequent logins won't have it.
        const normalizedEmail = rawEmail ? rawEmail.toLowerCase().trim() : null;
        const name = givenName && familyName
            ? `${givenName} ${familyName}`.trim()
            : givenName || familyName || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Apple User');

        // Try to find by appleId first, then by email
        let existingRow = null;
        const { data: byAppleId } = await supabase.from('users').select('id, data').eq('data->>appleId', appleId).limit(1);
        if (byAppleId && byAppleId.length > 0) {
            existingRow = byAppleId[0];
        } else if (normalizedEmail) {
            const { data: byEmail } = await supabase.from('users').select('id, data').ilike('data->>email', normalizedEmail).limit(1);
            if (byEmail && byEmail.length > 0) existingRow = byEmail[0];
        }

        const frozenUser = existingRow?.data?.isFrozen;
        if (frozenUser) {
            return res.status(403).json({ isFrozen: true, message: 'Your account has been frozen by an admin.' });
        }

        const roles = providedRoles || (providedRole ? [providedRole] : ['founder']);
        const initialRole = providedRole || roles[0] || 'founder';

        if (existingRow) {
            // Select plans as well
            const { data: fullRow } = await supabase
                .from('users')
                .select('data, founder_plan, expert_plan, investor_plan')
                .eq('id', existingRow.id)
                .single();

            const currentRoles = existingRow.data.roles || [existingRow.data.role || 'founder'];
            const updatedRoles = Array.from(new Set([...currentRoles, ...roles]));
            const updatedData = {
                ...existingRow.data,
                appleId,
                roles: updatedRoles,
                role: initialRole,
                // Persist name if not yet set (Apple only sends it once)
                name: existingRow.data.name || name,
                email: existingRow.data.email || normalizedEmail,
                updatedAt: new Date().toISOString(),
            };
            await supabase.from('users').update({ data: updatedData }).eq('id', existingRow.id);

            const user = {
                ...sanitizeUser(updatedData),
                founder_plan: resolvePlan(fullRow?.founder_plan, updatedData.founder_plan),
                expert_plan: resolvePlan(fullRow?.expert_plan, updatedData.expert_plan),
                investor_plan: resolvePlan(fullRow?.investor_plan, updatedData.investor_plan),
            };

            return res.json({ ...user, ...issueTokens(existingRow.id, initialRole) });
        }

        // New user — create account
        const id = crypto.randomUUID();
        const initialProfilesCreated: Record<string, boolean> = { founder: false, expert: false, investor: false };
        roles.forEach((r: string) => {
            if (r === 'founder' || r === 'expert' || r === 'investor') initialProfilesCreated[r] = true;
        });

        const userData: any = {
            id, appleId, name,
            email: normalizedEmail,
            role: initialRole, roles,
            isVerified: initialRole === 'founder',
            profilesCreated: initialProfilesCreated,
            createdAt: new Date().toISOString(),
        };

        const { error: insertError } = await supabase.from('users').insert([{ id, data: userData }]);
        if (insertError) return res.status(500).json({ message: 'Failed to create user account' });

        if (normalizedEmail) {
            try {
                await sendEmail({
                    to: normalizedEmail,
                    subject: 'Welcome to NextIgnition! 🚀',
                    text: `Welcome, ${name}! Your account has been created via Sign in with Apple.`,
                    html: `<p>Hello ${name}, Welcome to NextIgnition!</p>`
                });
            } catch (e) {}
        }

        return res.json({ ...sanitizeUser(userData), ...issueTokens(id, initialRole) });
    } catch (error) {
        console.error('Apple login error:', error);
        return res.status(500).json({ message: 'Apple login failed' });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        // IMPORTANT: plan tiers are stored as top-level columns on users.
        // Fall back to selecting only data in older deployments.
        let row: any = null;
        {
            const res1 = await supabase
                .from('users')
                .select('data, founder_plan, expert_plan, investor_plan')
                .eq('id', req.user.id)
                .single();

            if (res1.error) {
                const msg = String(res1.error?.message || '').toLowerCase();
                const looksLikeMissingColumn = msg.includes('column') || msg.includes('founder_plan') || msg.includes('expert_plan') || msg.includes('investor_plan');
                if (looksLikeMissingColumn) {
                    const res2 = await supabase.from('users').select('data').eq('id', req.user.id).single();
                    if (res2.error) {
                        console.error('getMe error:', res2.error);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    row = res2.data;
                } else {
                    console.error('getMe error:', res1.error);
                    return res.status(500).json({ message: 'Server error' });
                }
            } else {
                row = res1.data;
            }
        }

        if (row) {
            const user = {
                ...(row.data || {}),
                founder_plan: resolvePlan(row.founder_plan, row.data?.founder_plan),
                expert_plan: resolvePlan(row.expert_plan, row.data?.expert_plan),
                investor_plan: resolvePlan(row.investor_plan, row.data?.investor_plan),
            };
            delete user.password;
            res.json(user);
        } else { res.status(404).json({ message: 'User not found' }); }
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('users').select('data').eq('id', req.params.id).single();
        if (error && error.code !== 'PGRST116') {
            console.error('getProfile error:', error);
            return res.status(500).json({ message: 'Server error' });
        }
        if (!data) return res.status(404).json({ message: 'User not found' });

        // Record a profile view (LinkedIn-style engagement). Fire-and-forget:
        // never blocks or fails the profile response. Self-views are skipped
        // inside the helper. Only fires when the viewer is authenticated.
        const viewerId = (req as AuthRequest).user?.id;
        if (viewerId) void recordProfileViewEvent(String(viewerId), String(req.params.id));

        res.json(stripSensitiveUserFields(data.data));
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { data: existing, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !existing) return res.status(404).json({ message: 'User not found' });
        
        const { name, username, avatar, coverPhoto, introVideo, hasStartup, ...rest } = req.body;
        
        const updatedData = { 
            ...existing.data, 
            name: name || existing.data.name,
            username: username || existing.data.username,
            avatar: avatar || existing.data.avatar,
            coverPhoto: coverPhoto || existing.data.coverPhoto,
            introVideo: introVideo || existing.data.introVideo,
            // Persist hasStartup so founders who skip stage flows are still recognized
            ...(hasStartup ? { hasStartup } : {}),
            profile: { ...existing.data.profile, ...rest }, 
            updatedAt: new Date().toISOString() 
        };
        
        const { error: updateErr } = await supabase.from('users').update({ data: updatedData }).eq('id', req.user.id);
        if (updateErr) {
            console.error('updateProfile error:', updateErr);
            return res.status(500).json({ message: 'Failed to update profile' });
        }
        res.json(updatedData);
    } catch (error) { 
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' }); 
    }
};

export const getUsersByRole = async (req: Request, res: Response) => {
    try {
        const { role } = req.query;
        const userId = (req.query.excludeUserId as string | undefined)?.trim(); // Optional: exclude current user
        const { data, error } = await supabase.from('users').select('data').filter('data->roles', 'cs', `["${role}"]`).limit(100);
        
        if (error) {
            console.error('getUsersByRole error:', error);
            return res.status(500).json({ message: 'Server error' });
        }

        let users = data ? data.map((d: any) => stripSensitiveUserFields(d.data)) : [];
        
        // Exclude current user if provided
        if (userId) {
            users = users.filter((u: any) => String(u.id) !== String(userId));
        }

        // Engagement: these users appeared in the viewer's discover/search results.
        const viewerId = (req as AuthRequest).user?.id;
        if (viewerId) void recordSearchAppearanceEvents(String(viewerId), users.map((u: any) => String(u.id)).filter(Boolean));

        res.json(users);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const searchUsers = async (req: Request, res: Response) => {
    try {
        const q = String(req.query.q || '').toLowerCase();
        const { data, error } = await supabase.from('users').select('data').filter('data->>name', 'ilike', `%${q}%`).limit(50);
        if (error) {
            console.error('searchUsers error:', error);
            return res.status(500).json({ message: 'Server error' });
        }
        const results = data ? data.map((d: any) => stripSensitiveUserFields(d.data)) : [];

        // Engagement: these users appeared in the viewer's search results.
        const viewerId = (req as AuthRequest).user?.id;
        if (viewerId) void recordSearchAppearanceEvents(String(viewerId), results.map((u: any) => String(u.id)).filter(Boolean));

        res.json(results);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const switchRole = async (req: AuthRequest, res: Response) => {
    try {
        const { role } = req.body;
        // Only non-privileged roles may be self-assigned. Admin/primary-admin
        // status must never come from a user-supplied request body, otherwise a
        // normal user could escalate to admin (many endpoints authorize off role).
        if (!['founder', 'expert', 'investor'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        
        const user = row.data;
        const profilesCreated = user.profilesCreated || {};
        const normalizedProfilesCreated: any = {
            founder: profilesCreated.founder !== false,
            expert: !!profilesCreated.expert,
            investor: !!profilesCreated.investor,
        };

        if (role === 'founder' || role === 'expert' || role === 'investor') {
            normalizedProfilesCreated[role] = true;
        }

        const updated = { ...user, role, profilesCreated: normalizedProfilesCreated };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('switchRole error:', updateErr);
            return res.status(500).json({ message: 'Failed to switch role' });
        }

        // Send a conditional welcome for the new role if this is the first time
        const roleFirstTime = !profilesCreated[role];
        if (roleFirstTime) {
            try {
                await sendEmail({
                    to: user.email!,
                    subject: `NextIgnition: Onboarding as a ${role}`,
                    text: `Welcome to your new role as ${role}!`,
                    html: `<p>Hello,</p><p>You have successfully activated your <strong>${role}</strong> role on NextIgnition.</p><p>You now have access to features and communities tailored for ${role}s. Make sure to complete your ${role} profile to get the most out of the experience.</p>`
                });
            } catch (e) {
                console.error('[AuthController] Failed to send role onboarding email:', e);
            }
        }

        res.json({ ...updated, ...issueTokens(req.user.id, role) });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const requestEmailVerificationOtp = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const otp = crypto.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 10 * 60000).toISOString();
        const { data, error: fetchErr } = await supabase.from('users').select('id, data').eq('data->>email', email).single();
        if (fetchErr || !data) return res.status(404).json({ message: 'User not found' });

        const updated = { ...data.data, verificationOtp: { otp, expires } };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', data.id);
        if (updateErr) {
            console.error('requestEmailVerificationOtp error:', updateErr);
            return res.status(500).json({ message: 'Failed to send OTP' });
        }
        await sendEmail({ to: email, subject: 'Email Verification', text: `Your OTP is ${otp}. It expires in 10 minutes.` });
        res.json({ ok: true, message: 'OTP sent' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const verifyEmailWithOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        const { data, error: fetchErr } = await supabase.from('users').select('id, data').eq('data->>email', email).single();
        if (fetchErr || !data || data.data.verificationOtp?.otp !== otp || new Date(data.data.verificationOtp?.expires) < new Date()) {
            return res.status(400).json({ message: fetchErr ? 'Server error' : 'Invalid or expired OTP' });
        }
        const updated = { ...data.data, isVerified: true, verificationOtp: undefined };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', data.id);
        if (updateErr) {
            console.error('verifyEmailWithOtp error:', updateErr);
            return res.status(500).json({ message: 'Failed to verify email' });
        }

        // Send welcome email after successful verification
        try {
            await sendEmail({
                to: email,
                subject: 'Welcome to NextIgnition - Your Journey Starts Here!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                        <div style="text-align: center; padding-bottom: 20px;">
                            <h1 style="color: #2563eb; font-size: 28px; margin: 0;">Welcome to NextIgnition!</h1>
                        </div>
                        <div style="padding: 20px; color: #1f2937; line-height: 1.6;">
                            <h2 style="font-size: 20px;">Hello,</h2>
                            <p>We're thrilled to have you join our ecosystem of founders, experts, and investors. Your email has been successfully verified, and your account is now fully active.</p>
                            
                            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="font-size: 16px; margin-top: 0;">What's next?</h3>
                                <ul style="padding-left: 20px;">
                                    <li><strong>Fill your profile:</strong> Tell us more about your background and goals.</li>
                                    <li><strong>Discover opportunities:</strong> Match with experts or browse curated deals.</li>
                                    <li><strong>Connect:</strong> Reach out to people in the ecosystem.</li>
                                </ul>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                <a href="http://localhost:5173/#login" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                            </div>
                        </div>
                        <div style="padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
                            <p>© 2026 NextIgnition. All rights reserved.</p>
                        </div>
                    </div>
                `,
            });
        } catch (e) {
            console.error('[Verification] Failed to send welcome email:', e);
        }

        res.json({ ok: true, message: 'Email verified' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const requestPasswordResetOtp = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const otp = crypto.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 10 * 60000).toISOString();
        const { data, error: fetchErr } = await supabase.from('users').select('id, data').eq('data->>email', email).single();
        if (data) {
            const updated = { ...data.data, resetOtp: { otp, expires } };
            const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', data.id);
            if (!updateErr) {
                await sendEmail({ to: email, subject: 'Password Reset', text: `Your OTP is ${otp}. It expires in 10 minutes.` });
            } else {
                console.error('requestPasswordResetOtp error:', updateErr);
            }
        }
        res.json({ ok: true, message: 'If email exists, OTP sent' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const getProfilesCreated = async (req: AuthRequest, res: Response) => {
    try {
        console.log('getProfilesCreated called for user:', req.user.id);
        const { data: row, error } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (error || !row) {
            console.warn('getProfilesCreated: User not found for ID:', req.user.id, error?.message);
            // Return safe defaults so the frontend does not crash
            return res.json({ founder: true, expert: false, investor: false });
        }
        const profilesCreated = row.data.profilesCreated || {};
        // A user who declared they already have a startup during signup counts as a founder
        const hasExistingStartup = row.data.hasStartup === 'yes';
        res.json({
            founder: profilesCreated.founder !== false || hasExistingStartup,
            expert: !!profilesCreated.expert,
            investor: !!profilesCreated.investor,
        });
    } catch (error) {
        console.error('getProfilesCreated error:', error);
        res.json({ founder: true, expert: false, investor: false });
    }
};

export const resetPasswordWithOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp, password } = req.body;
        const { data, error: fetchErr } = await supabase.from('users').select('id, data').eq('data->>email', email).single();
        if (fetchErr || !data || data.data.resetOtp?.otp !== otp || new Date(data.data.resetOtp?.expires) < new Date()) {
            return res.status(400).json({ message: fetchErr ? 'Server error' : 'Invalid or expired OTP' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const updated = { ...data.data, password: hashedPassword, resetOtp: undefined };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', data.id);
        if (updateErr) {
            console.error('resetPasswordWithOtp error:', updateErr);
            return res.status(500).json({ message: 'Failed to reset password' });
        }
        res.json({ ok: true, message: 'Password reset successful' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
export const updateEmail = async (req: AuthRequest, res: Response) => {
    try {
        const { email } = req.body;
        const { data: existing, error: existingErr } = await supabase.from('users').select('id').eq('data->>email', email).single();
        if (existingErr && existingErr.code !== 'PGRST116') {
            console.error('updateEmail check error:', existingErr);
            return res.status(500).json({ message: 'Server error' });
        }
        if (existing && existing.id !== req.user.id) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        const updated = { ...row.data, email, updatedAt: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('updateEmail error:', updateErr);
            return res.status(500).json({ message: 'Failed to update email' });
        }
        res.json(sanitizeUser(updated));
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        const isMatch = await bcrypt.compare(currentPassword, row.data.password || '');
        if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const updated = { ...row.data, password: hashedPassword, updatedAt: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('updatePassword error:', updateErr);
            return res.status(500).json({ message: 'Failed to update password' });
        }
        res.json({ message: 'Password updated successfully' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const toggleTwoFactor = async (req: AuthRequest, res: Response) => {
    try {
        const { enabled } = req.body;
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        const updated = { ...row.data, twoFactorEnabled: enabled, updatedAt: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('toggleTwoFactor error:', updateErr);
            return res.status(500).json({ message: 'Failed to toggle 2FA' });
        }
        res.json({ twoFactorEnabled: enabled });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const deactivateAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        const updated = { ...row.data, isDeactivated: true, updatedAt: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('deactivateAccount error:', updateErr);
            return res.status(500).json({ message: 'Failed to deactivate account' });
        }

        // Send confirmation email
        try {
            await sendEmail({
                to: updated.email,
                subject: 'Account Deactivated: NextIgnition',
                text: `Your account has been successfully deactivated. You will no longer receive in-app notifications.`,
                html: `<p>Hello,</p><p>We are confirming that your NextIgnition account has been <strong>successfully deactivated</strong>.</p><p>While deactivated, your profile will be hidden from the platform. You can reactivate your account at any time by logging back in.</p>`
            });
        } catch (e) {
             console.error('[AuthController] Failed to send deactivation email:', e);
        }

        res.json({ message: 'Account deactivated' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { error: deleteErr } = await supabase.from('users').delete().eq('id', req.user.id);
        if (deleteErr) {
            console.error('deleteAccount error:', deleteErr);
            return res.status(500).json({ message: 'Failed to delete account' });
        }
        res.json({ message: 'Account deleted' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { settings } = req.body;
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        const updated = { ...row.data, notificationSettings: settings, updatedAt: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('updateNotificationSettings error:', updateErr);
            return res.status(500).json({ message: 'Failed to update notification settings' });
        }
        res.json({ notificationSettings: settings });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const getNotificationSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        res.json({ notificationSettings: row.data.notificationSettings || null });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const getPrivacySettings = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        const defaults = {
            profileVisibility: 'public',
            whoCanMessage: 'everyone',
            allowMessageRequests: true,
        };
        res.json(row.data.privacySettings || defaults);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const updatePrivacySettings = async (req: AuthRequest, res: Response) => {
    try {
        const { settings } = req.body;
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        const updated = { ...row.data, privacySettings: settings, updatedAt: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('updatePrivacySettings error:', updateErr);
            return res.status(500).json({ message: 'Failed to update privacy settings' });
        }
        res.json({ privacySettings: settings });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const requestDataExport = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        // Mark export request timestamp
        const updated = { ...row.data, dataExportRequestedAt: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('requestDataExport error:', updateErr);
            // Continue with the export even if logging the timestamp fails
        }
        // Return safe user data as the export payload
        const exportData = { ...row.data };
        delete exportData.password;
        delete exportData.verificationOtp;
        delete exportData.resetOtp;
        res.json({
            message: 'Data export prepared successfully',
            requestedAt: updated.dataExportRequestedAt,
            data: exportData,
        });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const submitSupportTicket = async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ message: 'Message is required' });
        }
        
        const { data: row, error: fetchErr } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (fetchErr || !row) return res.status(404).json({ message: 'User not found' });
        
        const existingTickets = row.data.supportTickets || [];
        const newTicket = {
            id: `ticket_${Date.now()}`,
            message,
            status: 'open',
            createdAt: new Date().toISOString(),
        };
        
        const updated = { 
            ...row.data, 
            supportTickets: [...existingTickets, newTicket],
            updatedAt: new Date().toISOString() 
        };
        
        const { error: updateErr } = await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        if (updateErr) {
            console.error('submitSupportTicket error:', updateErr);
            return res.status(500).json({ message: 'Server error while submitting ticket' });
        }
        
        // Send confirmation email from support channel
        try {
            await sendEmail({
                to: row.data.email || '',
                subject: `Support Ticket Received: ${newTicket.id}`,
                text: `We have received your support request: "${message}". We will get back to you shortly.`,
                html: `<p>Hello,</p><p>Your support ticket has been received (Ref: <strong>${newTicket.id}</strong>).</p><p><strong>Your Message:</strong><br/><em>${message}</em></p><p>One of our team members will get back to you at this email address shortly.</p>`
            });
        } catch (e) {
            console.error('[AuthController] Failed to send support confirmation email:', e);
        }

        res.json({ message: 'Support ticket submitted successfully', ticket: newTicket });
    } catch (error) { 
        res.status(500).json({ message: 'Server error while submitting ticket' }); 
    }
};

export const getHelpArticles = async (req: AuthRequest, res: Response) => {
    // Return a mocked database of help articles
    const articles = [
        { id: 'getting-started', icon: '🚀', label: 'Getting Started', path: '/dashboard', content: 'Welcome to NextIgnition! To get the most out of our platform, start by completing your profile, exploring the community feeds, and setting up your preferences in the settings page.' },
        { id: 'startup-profile', icon: '📝', label: 'Creating Your Startup Profile', path: '/profile', content: 'Your startup profile is how investors find you. Make sure to clearly articulate your problem statement, solution, market size, and team background. Use the dashboard to fill out all the fields.' },
        { id: 'funding', icon: '💰', label: 'Funding Portal Guide', path: '/funding', content: 'The Funding Portal connects you with active investors. Keep your pitch deck updated and ensure your Deal Room has all the necessary legal and financial documents for due diligence.' },
        { id: 'communities', icon: '💬', label: 'Using Communities', path: '/communities', content: 'Join specialized communities to network with peers. Engage in discussions, ask for feedback, and share your milestones to build your reputation on the platform.' },
        { id: 'cofounders', icon: '🤝', label: 'Finding Co-founders', path: '/discover', content: 'Use the Discover tab and filter for users looking for new opportunities. Send personalized message requests highlighting why you would be a great fit together.' },
        { id: 'analytics', icon: '📊', label: 'Understanding Analytics', path: '/analytics', content: 'Your analytics dashboard shows profile views, engagement on your posts, and investor interest levels. Check it weekly to refine your outreach strategy.' }
    ];
    res.json(articles);
};

export const submitVerification = async (req: AuthRequest, res: Response) => {
    try {
        const { verificationData } = req.body;
        console.log('Submitting verification for user:', req.user.id);
        
        const { data: row, error } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (error || !row) return res.status(404).json({ message: 'User not found' });
        
        const updated = { 
            ...row.data, 
            verificationInfo: verificationData,
            verificationStatus: 'pending',
            verificationSubmittedAt: new Date().toISOString()
        };
        
        await supabase.from('users').update({ data: updated }).eq('id', req.user.id);
        res.json({ message: 'Verification submitted successfully', verificationStatus: 'pending' });
    } catch (error: any) {
        console.error('submitVerification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/auth/public-register
 * No authentication required.
 * Creates a guest user account and returns a JWT so the visitor can be
 * authenticated immediately. Guests are limited to attending 1 event.
 * Their data is also stored in public_leads for the sales/onboarding team.
 */
export const publicRegister = async (req: Request, res: Response) => {
    try {
        const {
            fullName,
            email,
            phone,
            city,
            role,
            linkedinUrl,
            websiteUrl,
            source,
            registeredAt,
            // Founder-specific
            startupName,
            industry,
            stage,
            isFundraising,
            fundingGoal,
            // Expert-specific
            expertise,
            yearsOfExperience,
            currentCompany,
            offerConsultations,
            // Investor-specific
            investorType,
            firmName,
            checkSize,
            preferredIndustries,
            // Shared
            bio,
        } = req.body;

        const normalizedEmail = String(email || '').toLowerCase().trim();

        if (!fullName || !normalizedEmail || !phone || !role) {
            return res.status(400).json({ message: 'fullName, email, phone, and role are required' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: 'Invalid email address' });
        }

        const leadData = {
            fullName: String(fullName).trim(),
            email: normalizedEmail,
            phone: String(phone).trim(),
            city: String(city || '').trim(),
            role,
            linkedinUrl: String(linkedinUrl || '').trim(),
            websiteUrl: String(websiteUrl || '').trim(),
            source: source || 'public_registration_page',
            bio: String(bio || '').trim(),
            startupName: startupName ? String(startupName).trim() : undefined,
            industry,
            stage,
            isFundraising: Boolean(isFundraising),
            fundingGoal: fundingGoal ? String(fundingGoal).trim() : undefined,
            expertise,
            yearsOfExperience,
            currentCompany: currentCompany ? String(currentCompany).trim() : undefined,
            offerConsultations: Boolean(offerConsultations),
            investorType,
            firmName: firmName ? String(firmName).trim() : undefined,
            checkSize,
            preferredIndustries: Array.isArray(preferredIndustries) ? preferredIndustries : [],
            submittedAt: registeredAt || new Date().toISOString(),
            status: 'new',
        };

        // Upsert into public_leads for the sales / onboarding team
        const { error: upsertErr } = await supabase
            .from('public_leads')
            .upsert([{ email: normalizedEmail, data: leadData }], { onConflict: 'email' });

        if (upsertErr) {
            console.error('[publicRegister] Supabase upsert error:', upsertErr.message);
        }

        // -------------------------------------------------------------------
        // Create (or retrieve) a guest user account in the `users` table so
        // the visitor is immediately authenticated for limited event access.
        // -------------------------------------------------------------------
        let guestUserId: string;
        let isNewGuest = true;
        let returnedUser: any = null;

        const { data: existingRows } = await supabase
            .from('users')
            .select('id, data')
            .ilike('data->>email', normalizedEmail);

        const existingUser = existingRows && existingRows.length > 0 ? existingRows[0] : null;

        if (existingUser) {
            guestUserId = existingUser.id;
            isNewGuest = false;
            returnedUser = { ...existingUser.data, password: undefined };
        } else {
            guestUserId = crypto.randomUUID();
            const guestData = {
                id: guestUserId,
                name: String(fullName).trim(),
                email: normalizedEmail,
                phone: String(phone).trim(),
                city: String(city || '').trim(),
                role: role || 'founder',
                roles: [role || 'founder'],
                isGuest: true,
                isVerified: true,
                profilesCreated: { founder: false, expert: false, investor: false },
                guestEventLimit: 1,
                guestRegisteredEvents: [],
                bio: String(bio || '').trim(),
                linkedinUrl: String(linkedinUrl || '').trim(),
                createdAt: new Date().toISOString(),
                source: source || 'public_registration_page',
                founder_plan: 'free',
                expert_plan: 'free',
                investor_plan: 'free',
            };

            const { error: insertErr } = await supabase
                .from('users')
                .insert([{ id: guestUserId, data: guestData }]);

            if (insertErr) {
                console.error('[publicRegister] Failed to create guest user:', insertErr.message);
            }

            returnedUser = { ...guestData };
        }

        const { token, refreshToken } = issueTokens(guestUserId, role || 'founder');

        // Confirmation email
        try {
            await sendEmail({
                to: normalizedEmail,
                subject: `NextIgnition — Registration Successful! 🚀`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
                        <h1 style="color: #2563eb; font-size: 26px; margin-bottom: 4px;">Welcome to NextIgnition!</h1>
                        <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">Hi <strong>${leadData.fullName}</strong>, you're in!</p>
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
                            <h3 style="margin: 0 0 8px; color: #1e293b; font-size: 15px;">Your guest access includes:</h3>
                            <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                                <li>Attend <strong>1 free event</strong> as a guest</li>
                                <li>Browse all upcoming events on the platform</li>
                                <li>Upgrade anytime to unlock unlimited access</li>
                            </ul>
                        </div>
                        <div style="text-align: center;">
                            <a href="https://nextignition.com/#event-survey" style="display: inline-block; padding: 14px 32px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">Continue to Events →</a>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">© 2026 NextIgnition. All rights reserved.</p>
                    </div>
                `,
            });
        } catch (emailErr) {
            console.error('[publicRegister] Failed to send confirmation email:', emailErr);
        }

        return res.status(201).json({
            ok: true,
            message: isNewGuest
                ? 'Registration successful! Please complete the quick survey.'
                : 'Welcome back! Please complete the survey.',
            hasExistingAccount: !isNewGuest && !existingUser?.data?.isGuest,
            token,
            refreshToken,
            user: returnedUser,
        });
    } catch (error: any) {
        console.error('[publicRegister] Server error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
};

