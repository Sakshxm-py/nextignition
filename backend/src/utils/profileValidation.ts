import { PROFILE_REQUIREMENTS, UserRole, ROLE_STATUS } from '../constants/roleConstants';

// ============================================================================
// Profile Completeness Calculation
// ============================================================================

export const calculateProfileCompleteness = (
    profileData: any,
    role: 'founder' | 'expert' | 'investor'
): number => {
    const requirements = PROFILE_REQUIREMENTS[role];
    if (!requirements) return 0;

    const allFields = [...requirements.required, ...requirements.optional];
    const filledFields = allFields.filter(field => {
        const value = profileData[field];
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return value !== null && value !== undefined && value !== '';
    });

    return Math.round((filledFields.length / allFields.length) * 100);
};

// ============================================================================
// Profile Validation
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    missingRequired: string[];
    completeness: number;
    errors: string[];
}

export const validateProfileData = (
    profileData: any,
    role: 'founder' | 'expert' | 'investor'
): ValidationResult => {
    const requirements = PROFILE_REQUIREMENTS[role];
    const errors: string[] = [];
    
    // Check required fields
    const missingRequired = requirements.required.filter(field => {
        const value = profileData[field];
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        return !value || value.trim() === '';
    });

    // Calculate completeness
    const completeness = calculateProfileCompleteness(profileData, role);

    // Check minimum completeness
    if (completeness < requirements.minCompleteness) {
        errors.push(
            `Profile must be at least ${requirements.minCompleteness}% complete. ` +
            `Current: ${completeness}%`
        );
    }

    // Role-specific validation
    if (role === 'investor') {
        validateInvestorProfile(profileData, errors);
    } else if (role === 'expert') {
        validateExpertProfile(profileData, errors);
    } else if (role === 'founder') {
        validateFounderProfile(profileData, errors);
    }

    return {
        isValid: missingRequired.length === 0 && errors.length === 0,
        missingRequired,
        completeness,
        errors
    };
};

// ============================================================================
// Role-Specific Validation
// ============================================================================

const validateInvestorProfile = (profileData: any, errors: string[]): void => {
    // Validate portfolio companies
    if (profileData.portfolioCompanies) {
        if (!Array.isArray(profileData.portfolioCompanies)) {
            errors.push('Portfolio companies must be an array');
        } else if (profileData.portfolioCompanies.length === 0) {
            errors.push('At least one portfolio company is required for verification');
        }
    }

    // Validate ticket size format
    if (profileData.ticketSize && typeof profileData.ticketSize === 'string') {
        if (!profileData.ticketSize.includes('$')) {
            errors.push('Ticket size must include currency symbol');
        }
    }

    // Validate industries
    if (profileData.industries) {
        if (!Array.isArray(profileData.industries)) {
            errors.push('Industries must be an array');
        } else if (profileData.industries.length === 0) {
            errors.push('At least one industry focus is required');
        }
    }

    // Validate investment stages
    if (profileData.investmentStage) {
        if (!Array.isArray(profileData.investmentStage)) {
            errors.push('Investment stages must be an array');
        }
    }

    // Validate LinkedIn
    if (profileData.linkedIn && !isValidLinkedInUrl(profileData.linkedIn)) {
        errors.push('Invalid LinkedIn URL format');
    }
};

const validateExpertProfile = (profileData: any, errors: string[]): void => {
    // Validate expertise areas
    if (profileData.expertise) {
        if (!Array.isArray(profileData.expertise)) {
            errors.push('Expertise must be an array');
        } else if (profileData.expertise.length === 0) {
            errors.push('At least one expertise area is required');
        }
    }

    // Validate experience (minimum 2 years)
    if (profileData.experience !== undefined) {
        const exp = parseInt(profileData.experience);
        if (isNaN(exp) || exp < 2) {
            errors.push('Minimum 2 years of experience required');
        }
    }

    // Validate bio length
    if (profileData.bio && profileData.bio.length < 100) {
        errors.push('Bio must be at least 100 characters');
    }

    // Validate credentials
    if (profileData.credentials && !Array.isArray(profileData.credentials)) {
        errors.push('Credentials must be an array');
    }

    // Validate LinkedIn
    if (profileData.linkedIn && !isValidLinkedInUrl(profileData.linkedIn)) {
        errors.push('Invalid LinkedIn URL format');
    }
};

const validateFounderProfile = (profileData: any, errors: string[]): void => {
    // Validate company name
    if (profileData.companyName && profileData.companyName.length < 2) {
        errors.push('Company name must be at least 2 characters');
    }

    // Validate description length
    if (profileData.description && profileData.description.length < 50) {
        errors.push('Company description must be at least 50 characters');
    }

    // Validate website URL
    if (profileData.website && !isValidUrl(profileData.website)) {
        errors.push('Invalid website URL format');
    }

    // Validate LinkedIn
    if (profileData.linkedIn && !isValidLinkedInUrl(profileData.linkedIn)) {
        errors.push('Invalid LinkedIn URL format');
    }

    // Validate industry
    if (profileData.industry && !Array.isArray(profileData.industry)) {
        errors.push('Industry must be an array');
    }
};

// ============================================================================
// URL Validation Helpers
// ============================================================================

const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const isValidLinkedInUrl = (url: string): boolean => {
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/');
};

// ============================================================================
// Get Missing Fields with Human-Readable Names
// ============================================================================

const FIELD_LABELS: Record<string, string> = {
    companyName: 'Company Name',
    industry: 'Industry',
    stage: 'Company Stage',
    description: 'Company Description',
    website: 'Website',
    linkedIn: 'LinkedIn Profile',
    teamSize: 'Team Size',
    fundingRaised: 'Funding Raised',
    pitchDeck: 'Pitch Deck',
    location: 'Location',
    
    expertise: 'Expertise Areas',
    experience: 'Years of Experience',
    bio: 'Professional Bio',
    credentials: 'Credentials',
    availability: 'Availability',
    hourlyRate: 'Hourly Rate',
    portfolio: 'Portfolio',
    testimonials: 'Testimonials',
    certifications: 'Certifications',
    
    investorType: 'Investor Type',
    investmentStage: 'Investment Stage',
    ticketSize: 'Ticket Size',
    industries: 'Industry Focus',
    geography: 'Investment Geography',
    portfolioCompanies: 'Portfolio Companies',
    fundName: 'Fund Name',
    aum: 'Assets Under Management',
    investmentThesis: 'Investment Thesis'
};

export const getMissingFieldsLabels = (missingFields: string[]): string[] => {
    return missingFields.map(field => FIELD_LABELS[field] || field);
};

// ============================================================================
// Sanitize Profile Data (Remove Sensitive Info for Public Display)
// ============================================================================

export const sanitizeProfileData = (profileData: any, role: string): any => {
    if (!profileData) return {};

    const sanitized = { ...profileData };

    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.verificationOtp;
    delete sanitized.resetToken;
    
    // Role-specific sanitization
    if (role === 'investor') {
        // Keep portfolio but may want to limit details
        if (sanitized.portfolioCompanies && Array.isArray(sanitized.portfolioCompanies)) {
            sanitized.portfolioCompanies = sanitized.portfolioCompanies.map((company: any) => {
                if (typeof company === 'string') return company;
                return {
                    name: company.name,
                    industry: company.industry,
                    stage: company.stage
                    // Remove investment amount, equity, etc.
                };
            });
        }
    }

    return sanitized;
};

// ============================================================================
// Calculate Verification Level
// ============================================================================

export const calculateVerificationLevel = (user: any): string => {
    let level = 'unverified';

    // Email verified
    if (user.emailVerified || user.isVerified) {
        level = 'email';
    }

    // Basic: Email + Phone + 50% profile
    if (
        (user.emailVerified || user.isVerified) &&
        user.phoneVerified &&
        hasMinProfileCompleteness(user, 50)
    ) {
        level = 'basic';
    }

    // Advanced: Above + LinkedIn + 1 verified role + 75% profile
    if (
        level === 'basic' &&
        user.linkedInVerified &&
        hasVerifiedRole(user) &&
        hasMinProfileCompleteness(user, 75)
    ) {
        level = 'advanced';
    }

    // Premium: Above + ID verification + 90% profile + 30 days active
    if (
        level === 'advanced' &&
        user.identityVerified &&
        hasMinProfileCompleteness(user, 90) &&
        hasMultipleVerifiedRoles(user) &&
        isActive30Days(user)
    ) {
        level = 'premium';
    }

    return level;
};

const hasMinProfileCompleteness = (user: any, minPercent: number): boolean => {
    if (!user.profileCompleteness) return false;
    const completeness = user.profileCompleteness;
    const maxCompleteness = Math.max(
        completeness.founder || 0,
        completeness.expert || 0,
        completeness.investor || 0
    );
    return maxCompleteness >= minPercent;
};

const hasVerifiedRole = (user: any): boolean => {
    if (!user.roles || !Array.isArray(user.roles)) return false;
    return user.roles.some((r: UserRole) => r.status === ROLE_STATUS.VERIFIED);
};

const hasMultipleVerifiedRoles = (user: any): boolean => {
    if (!user.roles || !Array.isArray(user.roles)) return false;
    return user.roles.filter((r: UserRole) => r.status === ROLE_STATUS.VERIFIED).length >= 2;
};

const isActive30Days = (user: any): boolean => {
    if (!user.createdAt) return false;
    const created = new Date(user.createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 30;
};

// ============================================================================
// Get All Badges for User
// ============================================================================

export const getAllUserBadges = (user: any): string[] => {
    const badges: string[] = [];

    // Email verification badge
    if (user.emailVerified || user.isVerified) {
        badges.push('email-verified');
    }

    // Phone verification badge
    if (user.phoneVerified) {
        badges.push('phone-verified');
    }

    // LinkedIn verification badge
    if (user.linkedInVerified) {
        badges.push('linkedin-verified');
    }

    // Role-specific badges
    if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach((role: UserRole) => {
            if (role.status === ROLE_STATUS.VERIFIED && role.badges) {
                badges.push(...role.badges);
            }
        });
    }

    return [...new Set(badges)]; // Remove duplicates
};

// ============================================================================
// Calculate Trust Score (0-100)
// ============================================================================

export const calculateTrustScore = (user: any): number => {
    let score = 0;

    // Email verification: +10
    if (user.emailVerified || user.isVerified) score += 10;

    // Phone verification: +10
    if (user.phoneVerified) score += 10;

    // LinkedIn verification: +15
    if (user.linkedInVerified) score += 15;

    // Identity verification: +20
    if (user.identityVerified) score += 20;

    // Profile completeness: up to +25
    if (user.profileCompleteness) {
        const maxCompleteness = Math.max(
            user.profileCompleteness.founder || 0,
            user.profileCompleteness.expert || 0,
            user.profileCompleteness.investor || 0
        );
        score += Math.round(maxCompleteness * 0.25);
    }

    // Verified roles: +10 per role (up to 20)
    if (user.roles && Array.isArray(user.roles)) {
        const verifiedCount = user.roles.filter(
            (r: UserRole) => r.status === ROLE_STATUS.VERIFIED
        ).length;
        score += Math.min(verifiedCount * 10, 20);
    }

    // Platform activity (simple version): up to +10
    if (user.createdAt) {
        const daysSinceCreation = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation >= 30) score += 5;
        if (daysSinceCreation >= 90) score += 5;
    }

    return Math.min(score, 100);
};
