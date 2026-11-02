import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import passport from '../utils/passport';
import crypto from 'crypto';

// ============================================================================
// LinkedIn OAuth - Initiate
// ============================================================================

export const linkedInAuth = passport.authenticate('linkedin', {
    state: crypto.randomBytes(32).toString('hex')
});

// ============================================================================
// LinkedIn OAuth - Callback
// ============================================================================

export const linkedInCallback = (req: Request, res: Response) => {
    passport.authenticate('linkedin', { session: false }, async (err: any, userData: any, info: any) => {
        if (err || !userData) {
            console.error('[LinkedIn] OAuth error:', err || info);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/linkedin-error?error=${encodeURIComponent(err?.message || 'Authentication failed')}`);
        }

        try {
            const { linkedInData } = userData;

            // Check if user exists by email
            const email = linkedInData.emails?.[0]?.value;
            if (!email) {
                return res.redirect(`${process.env.FRONTEND_URL}/auth/linkedin-error?error=no_email`);
            }

            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existingUser) {
                // Update existing user with LinkedIn data
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        linkedInProfile: linkedInData,
                        linkedInVerified: true,
                        linkedInVerifiedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    })
                    .eq('id', existingUser.id);

                if (updateError) throw updateError;

                // Redirect to success page
                return res.redirect(`${process.env.FRONTEND_URL}/auth/linkedin-success?verified=true`);
            } else {
                // New user - redirect to registration with LinkedIn data
                const linkedInDataEncoded = encodeURIComponent(JSON.stringify({
                    name: linkedInData.displayName,
                    email: email,
                    linkedInId: linkedInData.id,
                    profileUrl: linkedInData.profileUrl,
                    headline: linkedInData.headline
                }));
                
                return res.redirect(`${process.env.FRONTEND_URL}/register?linkedin=${linkedInDataEncoded}`);
            }
        } catch (error) {
            console.error('[LinkedIn] Callback error:', error);
            return res.redirect(`${process.env.FRONTEND_URL}/auth/linkedin-error?error=server_error`);
        }
    })(req, res);
};

// ============================================================================
// LinkedIn Connect (for existing logged-in users)
// ============================================================================

export const connectLinkedIn = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { linkedInProfile } = req.body;

        if (!linkedInProfile || !linkedInProfile.id) {
            return res.status(400).json({ error: 'Invalid LinkedIn profile data' });
        }

        // Update user with LinkedIn data
        const { error } = await supabase
            .from('users')
            .update({
                linkedInProfile,
                linkedInVerified: true,
                linkedInVerifiedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('[LinkedIn] Connect error:', error);
            return res.status(500).json({ error: 'Failed to connect LinkedIn' });
        }

        return res.status(200).json({
            success: true,
            message: 'LinkedIn connected successfully',
            linkedInVerified: true
        });
    } catch (error) {
        console.error('[LinkedIn] Connect error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// LinkedIn Disconnect
// ============================================================================

export const disconnectLinkedIn = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Remove LinkedIn data
        const { error } = await supabase
            .from('users')
            .update({
                linkedInProfile: null,
                linkedInVerified: false,
                linkedInVerifiedAt: null,
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('[LinkedIn] Disconnect error:', error);
            return res.status(500).json({ error: 'Failed to disconnect LinkedIn' });
        }

        return res.status(200).json({
            success: true,
            message: 'LinkedIn disconnected successfully',
            linkedInVerified: false
        });
    } catch (error) {
        console.error('[LinkedIn] Disconnect error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Auto-populate Profile from LinkedIn
// ============================================================================

export const autoPopulateFromLinkedIn = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { role } = req.body; // 'founder', 'expert', 'investor'

        // Get user's LinkedIn profile
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('linkedInProfile')
            .eq('id', userId)
            .single();

        if (fetchError || !user?.linkedInProfile) {
            return res.status(400).json({
                error: 'LinkedIn not connected',
                message: 'Please connect your LinkedIn account first'
            });
        }

        const linkedIn = user.linkedInProfile;
        const profileData: any = {};

        // Common fields
        profileData.linkedIn = linkedIn.profileUrl || `https://linkedin.com/in/${linkedIn.id}`;
        profileData.bio = linkedIn.summary || linkedIn.headline || '';

        // Role-specific auto-population
        if (role === 'expert') {
            profileData.expertise = [];
            
            // Extract expertise from headline
            if (linkedIn.headline) {
                const skills = linkedIn.headline.split(/[,|·•]/);
                profileData.expertise = skills.map((s: string) => s.trim()).filter(Boolean);
            }

            // Extract experience from positions
            if (linkedIn.positions?.values) {
                const years = linkedIn.positions.values.reduce((total: number, position: any) => {
                    const start = position.startDate ? new Date(position.startDate.year, position.startDate.month || 0) : null;
                    const end = position.isCurrent ? new Date() : (position.endDate ? new Date(position.endDate.year, position.endDate.month || 0) : null);
                    
                    if (start && end) {
                        const monthsDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
                        return total + (monthsDiff / 12);
                    }
                    return total;
                }, 0);
                
                profileData.experience = Math.floor(years).toString();
            }

            // Portfolio from positions
            if (linkedIn.positions?.values) {
                profileData.portfolio = linkedIn.positions.values
                    .filter((p: any) => p.company)
                    .map((p: any) => p.company.name);
            }

        } else if (role === 'founder') {
            // Extract company info from current position
            const currentPosition = linkedIn.positions?.values?.find((p: any) => p.isCurrent);
            
            if (currentPosition) {
                profileData.companyName = currentPosition.company?.name || '';
                profileData.description = currentPosition.summary || '';
                profileData.industry = currentPosition.company?.industry ? [currentPosition.company.industry] : [];
            }

        } else if (role === 'investor') {
            // Extract investment info
            if (linkedIn.headline && linkedIn.headline.toLowerCase().includes('investor')) {
                profileData.investorType = linkedIn.headline.includes('VC') ? 'Venture Capital' : 'Angel Investor';
            }

            // Extract portfolio from positions or summary
            if (linkedIn.summary) {
                const portfolioMatches = linkedIn.summary.match(/invested in|portfolio includes|backed companies/i);
                if (portfolioMatches) {
                    // Try to extract company names
                    const companies = linkedIn.summary.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g);
                    if (companies) {
                        profileData.portfolioCompanies = companies.slice(0, 5);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Profile data auto-populated from LinkedIn',
            profileData
        });
    } catch (error) {
        console.error('[LinkedIn] Auto-populate error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Submit LinkedIn URL (one-time, for verification by admin)
// ============================================================================

const isValidLinkedInUrl = (url: string): boolean => {
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/');
};

export const submitLinkedInUrl = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { linkedInUrl } = req.body;
        if (!linkedInUrl || typeof linkedInUrl !== 'string') {
            return res.status(400).json({ error: 'LinkedIn URL is required' });
        }

        const trimmed = linkedInUrl.trim();
        if (!isValidLinkedInUrl(trimmed)) {
            return res.status(400).json({ error: 'Invalid LinkedIn URL format. Must contain linkedin.com/in/ or linkedin.com/company/' });
        }

        // Fetch current user data
        const { data: row, error: fetchError } = await supabase
            .from('users')
            .select('id, data')
            .eq('id', userId)
            .single();

        if (fetchError || !row) {
            return res.status(404).json({ error: 'User not found' });
        }

        const d = row.data || {};

        // One-time only: reject if already submitted
        if (d.linkedInUrl) {
            return res.status(400).json({ error: 'LinkedIn URL already submitted', linkedInUrl: d.linkedInUrl });
        }

        // Save LinkedIn URL and set verification status to pending
        const updated = {
            ...d,
            linkedInUrl: trimmed,
            verificationStatus: 'pending',
            linkedInUrlSubmittedAt: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('users')
            .update({ data: updated })
            .eq('id', userId);

        if (updateError) {
            console.error('[LinkedIn] submitLinkedInUrl update error:', updateError);
            return res.status(500).json({ error: 'Failed to save LinkedIn URL' });
        }

        return res.status(200).json({
            success: true,
            message: 'LinkedIn URL submitted for verification',
            linkedInUrl: trimmed
        });
    } catch (error) {
        console.error('[LinkedIn] submitLinkedInUrl error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
