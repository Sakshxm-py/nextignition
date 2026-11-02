import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import {
    validateProfileData,
    calculateProfileCompleteness,
    getAllUserBadges,
    calculateTrustScore,
    calculateVerificationLevel,
    getMissingFieldsLabels
} from '../utils/profileValidation';
import {
    ROLE_STATUS,
    ROLE_BADGES,
    PROFILE_REQUIREMENTS,
    UserRole
} from '../constants/roleConstants';

// ============================================================================
// PRIVACY FILTERING HELPER - Filter data by viewer role
// ============================================================================

const filterRoleDataByViewerRole = (roleData: any, roleType: string, viewerRole: string, viewerId: string, profileUserId: string) => {
    if (!roleData) return {};

    // Self always sees everything
    if (viewerId === profileUserId) return roleData;

    // Admins see everything
    if (viewerRole === 'admin') return roleData;

    if (roleType !== 'investor') return roleData;

    // ✅ Investor data visibility rules
    const PRIVATE_FIELDS = ['portfolioCompanies', 'investmentThesis', 'dealStagePreferences', 'aum', 'preferredStage'];
    const FOUNDER_VISIBLE = ['investorType', 'industries', 'ticketSize', 'geography', 'website', 'fundName'];

    if (viewerRole === 'investor' || viewerRole === 'expert') {
        // Other investors/experts see less
        const filtered: any = { ...roleData };
        PRIVATE_FIELDS.forEach(f => delete filtered[f]);
        return filtered;
    }

    if (viewerRole === 'founder') {
        // Founders see only what helps them pitch
        return Object.keys(roleData)
            .filter(k => FOUNDER_VISIBLE.includes(k))
            .reduce((acc, k) => ({ ...acc, [k]: roleData[k] }), {});
    }

    // Public/unauth see almost nothing
    return { message: 'This profile is private. Login to view details.' };
};

// ============================================================================
// Apply for Role (Investor/Expert/Founder)
// ============================================================================

export const applyForRole = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { role, profileData } = req.body;

        // Validate role type
        if (!['investor', 'expert', 'founder'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Role must be one of: investor, expert, founder'
            });
        }

        // ✅ FIX #1: Check if profileData exists and is not empty
        if (!profileData || Object.keys(profileData).length === 0) {
            return res.status(400).json({
                error: 'Empty profile',
                message: 'Profile data cannot be empty. Please fill in all required fields before submitting.',
                blocked: true
            });
        }

        // Validate profile data
        const validation = validateProfileData(profileData, role);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Profile validation failed',
                missingRequired: getMissingFieldsLabels(validation.missingRequired),
                errors: validation.errors,
                completeness: validation.completeness,
                requiredCompleteness: (PROFILE_REQUIREMENTS as any)[role].minCompleteness,
                blocked: true
            });
        }

        // Check if user already has this role
        const { data: existingUser } = await supabase
            .from('users')
            .select('roles, data')
            .eq('id', userId)
            .single();

        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const existingRoles = existingUser.roles || [];
        const hasRole = existingRoles.some((r: UserRole) => (r.type || r.role) === role);

        if (hasRole) {
            return res.status(400).json({
                error: 'Role already exists',
                message: `You already have the ${role} role. Check your profile for status.`
            });
        }

        // ✅ FIX #2: Add verification requirements for investor/expert roles
        const requiresVerification = ['investor', 'expert'].includes(role);

        // Create new role application
        const newRole: UserRole = {
            role: role as 'founder' | 'expert' | 'investor',
            type: role as 'founder' | 'expert' | 'investor',
            status: ROLE_STATUS.PENDING,
            appliedAt: new Date().toISOString(),
            verificationLevel: 'unverified',
            badges: [],
            profileData: profileData,
            completeness: validation.completeness
        };

        const updatedRoles = [...existingRoles, newRole];

        // Update user roles
        const { error: updateError } = await supabase
            .from('users')
            .update({
                roles: updatedRoles,
                [`${role}ProfileData`]: profileData,
                [`is${role.charAt(0).toUpperCase() + role.slice(1)}`]: false,
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error applying for role:', updateError);
            return res.status(500).json({ error: 'Failed to apply for role' });
        }

        // Create admin notification
        await createAdminNotification(userId, role, profileData);

        return res.status(201).json({
            success: true,
            message: `Your ${role} application has been submitted for review${requiresVerification ? ' - verification required' : ''}`,
            role: newRole,
            estimatedReviewTime: '24-48 hours',
            requiresVerification  // ✅ NEW: Tell frontend verification is needed
        });
    } catch (error) {
        console.error('Error in applyForRole:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get Public Profile with Privacy Filtering
// ============================================================================

export const getPublicProfile = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params as { userId: string };

        // ✅ FIX #4: Require authentication
        const viewerId = (req as any).user?.id;
        const viewerRole = (req as any).user?.role || 'public';

        // Get viewer's full role info if authenticated
        let viewerRoleType = 'public';
        if (viewerId) {
            const { data: viewer } = await supabase
                .from('users')
                .select('roles')
                .eq('id', viewerId)
                .single();
            viewerRoleType = viewer?.roles?.[0]?.type || 'founder';
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, roles, primaryRole, isVerified, phoneVerified, linkedInVerified, identityVerified, createdAt, founderProfileData, expertProfileData, investorProfileData')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Audit log profile access
        if (viewerId) {
            try {
                await supabase.from('profile_access_audit').insert({
                    id: require('crypto').randomUUID(),
                    viewerId,
                    profileUserId: userId,
                    accessType: viewerRoleType,
                    timestamp: new Date().toISOString()
                });
            } catch (e) {
                console.error('Failed to log profile access:', e);
            }
        }

        // Get verified roles only
        const verifiedRoles = (user.roles || []).filter(
            (r: UserRole) => r.status === ROLE_STATUS.VERIFIED
        );

        // Get all badges
        const badges = getAllUserBadges(user);
        const trustScore = calculateTrustScore(user);
        const verificationLevel = calculateVerificationLevel(user);

        // Build profile based on primary role
        const primaryRole = user.primaryRole || verifiedRoles[0]?.type || 'founder';

        // ✅ NEW: Build ALL roles with privacy-filtered data
        const rolesWithData = verifiedRoles.map((r: UserRole) => {
            const roleType = r.type || r.role || 'founder';
            const profileData = (user as any)[`${roleType}ProfileData`] || {};
            const filteredData = filterRoleDataByViewerRole(
                profileData,
                roleType,
                viewerRoleType,
                viewerId || '',
                userId
            );

            return {
                type: r.type || r.role,
                badges: r.badges,
                verifiedAt: r.verifiedAt,
                profile: filteredData
            };
        });

        return res.status(200).json({
            success: true,
            profile: {
                id: user.id,
                name: user.name,
                email: viewerId === userId ? user.email : undefined,  // Only show email to self
                primaryRole,
                roles: rolesWithData,  // ✅ Now includes profile data for each role
                badges,
                trustScore,
                verificationLevel,
                verifications: {
                    email: user.isVerified || false,
                    phone: user.phoneVerified || false,
                    linkedIn: user.linkedInVerified || false,
                    identity: user.identityVerified || false
                }
            }
        });
    } catch (error) {
        console.error('Error in getPublicProfile:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get User's Roles and Status
// ============================================================================

export const getMyRoles = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const { data: user, error } = await supabase
            .from('users')
            .select('roles, email, name, isVerified, phoneVerified, linkedInVerified, identityVerified, createdAt')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const roles = user.roles || [];
        const badges = getAllUserBadges(user);
        const trustScore = calculateTrustScore(user);
        const verificationLevel = calculateVerificationLevel(user);

        return res.status(200).json({
            success: true,
            roles,
            badges,
            trustScore,
            verificationLevel,
            profile: {
                emailVerified: user.isVerified || false,
                phoneVerified: user.phoneVerified || false,
                linkedInVerified: user.linkedInVerified || false,
                identityVerified: user.identityVerified || false
            }
        });
    } catch (error) {
        console.error('Error in getMyRoles:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Set Primary Role (Display Role)
// ============================================================================

export const setPrimaryRole = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { role } = req.body;

        if (!['investor', 'expert', 'founder'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role'
            });
        }

        const { data: user } = await supabase
            .from('users')
            .select('roles')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const roles = user.roles || [];
        const hasVerifiedRole = roles.some(
            (r: UserRole) => (r.type || r.role) === role && r.status === ROLE_STATUS.VERIFIED
        );

        if (!hasVerifiedRole) {
            return res.status(400).json({
                error: 'Role not verified',
                message: `You must have a verified ${role} role to set it as primary`
            });
        }

        // Update primary role
        const { error: updateError } = await supabase
            .from('users')
            .update({
                primaryRole: role,
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error setting primary role:', updateError);
            return res.status(500).json({ error: 'Failed to set primary role' });
        }

        return res.status(200).json({
            success: true,
            message: `Primary role set to ${role}`,
            primaryRole: role
        });
    } catch (error) {
        console.error('Error in setPrimaryRole:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Update Role Profile Data
// ============================================================================

export const updateRoleProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { role, profileData } = req.body;

        if (!['investor', 'expert', 'founder'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Validate profile data
        const validation = validateProfileData(profileData, role);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Profile validation failed',
                missingRequired: getMissingFieldsLabels(validation.missingRequired),
                errors: validation.errors,
                completeness: validation.completeness,
                requiredCompleteness: (PROFILE_REQUIREMENTS as any)[role].minCompleteness
            });
        }

        const { data: user } = await supabase
            .from('users')
            .select('roles')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const roles = user.roles || [];
        const roleIndex = roles.findIndex((r: UserRole) => (r.type || r.role) === role);

        if (roleIndex === -1) {
            return res.status(404).json({
                error: 'Role not found',
                message: `You don't have the ${role} role. Apply for it first.`
            });
        }

        // Update role data
        roles[roleIndex].profileData = profileData;
        roles[roleIndex].completeness = validation.completeness;
        roles[roleIndex].updatedAt = new Date().toISOString();

        // If role was rejected, reset to pending on update
        if (roles[roleIndex].status === ROLE_STATUS.REJECTED) {
            roles[roleIndex].status = ROLE_STATUS.PENDING;
            roles[roleIndex].appliedAt = new Date().toISOString();
            delete roles[roleIndex].rejectionReason;

            // Notify admins of resubmission
            await createAdminNotification(userId, role, profileData, true);
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({
                roles,
                [`${role}ProfileData`]: profileData,
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating role profile:', updateError);
            return res.status(500).json({ error: 'Failed to update profile' });
        }

        return res.status(200).json({
            success: true,
            message: `${role} profile updated successfully`,
            role: roles[roleIndex],
            completeness: validation.completeness
        });
    } catch (error) {
        console.error('Error in updateRoleProfile:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

const createAdminNotification = async (
    userId: string,
    role: string,
    profileData: any,
    isResubmission: boolean = false
) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', userId)
            .single();

        if (!user) return;

        const notification = {
            type: 'role_application',
            userId,
            userName: user.name,
            userEmail: user.email,
            role,
            profileData,
            isResubmission,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        await supabase
            .from('admin_notifications')
            .insert(notification);

        console.log(`Admin notification created for ${role} application by ${user.name}`);
    } catch (error) {
        console.error('Error creating admin notification:', error);
    }
};
