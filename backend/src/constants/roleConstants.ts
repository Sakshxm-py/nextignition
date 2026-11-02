// ============================================================================
// Profile Requirements & Validation Constants
// ============================================================================

export const PROFILE_REQUIREMENTS = {
    founder: {
        required: [
            'companyName',
            'industry',
            'stage',
            'description',
            'website',
            'linkedIn'
        ],
        optional: [
            'teamSize',
            'fundingRaised',
            'pitchDeck',
            'location'
        ],
        minCompleteness: 70,
        displayName: 'Founder'
    },
    
    expert: {
        required: [
            'expertise',
            'experience',
            'bio',
            'credentials',
            'linkedIn',
            'availability'
        ],
        optional: [
            'hourlyRate',
            'portfolio',
            'testimonials',
            'certifications'
        ],
        minCompleteness: 80,
        displayName: 'Expert',
        verification: {
            linkedInRequired: true,
            credentialsCheck: true,
            minExperience: 2 // years
        }
    },
    
    investor: {
        required: [
            'investorType',
            'investmentStage',
            'ticketSize',
            'industries',
            'geography',
            'linkedIn',
            'portfolioCompanies'
        ],
        optional: [
            'fundName',
            'aum',
            'website',
            'investmentThesis',
            'preferredStage'
        ],
        minCompleteness: 85,
        displayName: 'Investor',
        verification: {
            linkedInRequired: true,
            portfolioVerification: true,
            minPortfolioSize: 1
        }
    }
};

// ============================================================================
// Role Badges System
// ============================================================================

export interface ProfileBadge {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    tier: 'basic' | 'verified' | 'premium';
}

export const ROLE_BADGES: Record<string, ProfileBadge> = {
    'verified-founder': {
        id: 'verified-founder',
        name: 'Verified Founder',
        icon: '🚀',
        color: '#3b82f6',
        description: 'Verified startup founder with active company',
        tier: 'verified'
    },
    'verified-expert': {
        id: 'verified-expert',
        name: 'Verified Expert',
        icon: '⭐',
        color: '#8b5cf6',
        description: 'Industry expert with verified credentials',
        tier: 'verified'
    },
    'verified-investor': {
        id: 'verified-investor',
        name: 'Verified Investor',
        icon: '💎',
        color: '#10b981',
        description: 'Verified active investor',
        tier: 'verified'
    },
    'accredited-investor': {
        id: 'accredited-investor',
        name: 'Accredited Investor',
        icon: '🏆',
        color: '#f59e0b',
        description: 'SEC accredited investor',
        tier: 'premium'
    },
    'angel-investor': {
        id: 'angel-investor',
        name: 'Angel Investor',
        icon: '👼',
        color: '#ec4899',
        description: 'Active angel investor',
        tier: 'basic'
    },
    'vc-partner': {
        id: 'vc-partner',
        name: 'VC Partner',
        icon: '🏛️',
        color: '#6366f1',
        description: 'Venture Capital partner',
        tier: 'premium'
    },
    'serial-founder': {
        id: 'serial-founder',
        name: 'Serial Founder',
        icon: '🔥',
        color: '#ef4444',
        description: 'Founded multiple companies',
        tier: 'verified'
    },
    'industry-expert': {
        id: 'industry-expert',
        name: 'Industry Expert',
        icon: '🎯',
        color: '#14b8a6',
        description: '10+ years industry experience',
        tier: 'verified'
    },
    'email-verified': {
        id: 'email-verified',
        name: 'Email Verified',
        icon: '✉️',
        color: '#64748b',
        description: 'Verified email address',
        tier: 'basic'
    },
    'phone-verified': {
        id: 'phone-verified',
        name: 'Phone Verified',
        icon: '📱',
        color: '#64748b',
        description: 'Verified phone number',
        tier: 'basic'
    },
    'linkedin-verified': {
        id: 'linkedin-verified',
        name: 'LinkedIn Verified',
        icon: '🔗',
        color: '#0077b5',
        description: 'Verified LinkedIn profile',
        tier: 'basic'
    }
};

// ============================================================================
// Role Application Status
// ============================================================================

export const ROLE_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended'
} as const;

export type RoleStatus = typeof ROLE_STATUS[keyof typeof ROLE_STATUS];

// ============================================================================
// User Role Interface
// ============================================================================

export interface UserRole {
    role: 'founder' | 'expert' | 'investor';
    type?: 'founder' | 'expert' | 'investor'; // Alias for role for backwards compatibility
    status: RoleStatus;
    profileComplete?: boolean;
    profileData: any;
    profileCompleteness?: number;
    completeness?: number;
    verificationLevel?: string;
    appliedAt: string;
    verifiedAt?: string;
    verifiedBy?: string;
    rejectedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    adminNotes?: string;
    badges: string[];
    notes?: string;
}

// ============================================================================
// Verification Levels
// ============================================================================

export const VERIFICATION_LEVELS = {
    UNVERIFIED: 'unverified',
    EMAIL: 'email',
    BASIC: 'basic',
    ADVANCED: 'advanced',
    PREMIUM: 'premium'
} as const;

export type VerificationLevel = typeof VERIFICATION_LEVELS[keyof typeof VERIFICATION_LEVELS];

export const VERIFICATION_LEVEL_REQUIREMENTS = {
    unverified: {
        level: 'unverified',
        requirements: [],
        unlocks: ['basic-browsing', 'profile-creation']
    },
    
    email: {
        level: 'email',
        requirements: ['email-verified'],
        unlocks: ['messaging', 'commenting', 'following']
    },
    
    basic: {
        level: 'basic',
        requirements: [
            'email-verified',
            'phone-verified',
            'profile-complete-50%'
        ],
        unlocks: ['events-attending', 'communities-joining', 'bookmarking']
    },
    
    advanced: {
        level: 'advanced',
        requirements: [
            'email-verified',
            'phone-verified',
            'linkedin-connected',
            'profile-complete-75%',
            'role-verified'
        ],
        unlocks: [
            'events-hosting',
            'podcasts-publishing',
            'sessions-hosting',
            'communities-creating',
            'verified-badge'
        ]
    },
    
    premium: {
        level: 'premium',
        requirements: [
            'email-verified',
            'phone-verified',
            'linkedin-connected',
            'identity-verified',
            'profile-complete-90%',
            'multiple-roles-verified',
            'platform-activity-30days'
        ],
        unlocks: [
            'fundraising-access',
            'investor-matching',
            'priority-support',
            'premium-badge',
            'featured-profile'
        ]
    }
};

// ============================================================================
// Investment Types
// ============================================================================

export const INVESTOR_TYPES = [
    'Angel Investor',
    'Venture Capital',
    'Private Equity',
    'Family Office',
    'Corporate VC',
    'Accelerator',
    'Syndicate',
    'Individual'
];

export const INVESTMENT_STAGES = [
    'Pre-Seed',
    'Seed',
    'Series A',
    'Series B',
    'Series C+',
    'Growth',
    'Late Stage',
    'All Stages'
];

export const TICKET_SIZES = [
    '$0-$10K',
    '$10K-$50K',
    '$50K-$100K',
    '$100K-$250K',
    '$250K-$500K',
    '$500K-$1M',
    '$1M-$5M',
    '$5M+'
];

// ============================================================================
// Company Stages
// ============================================================================

export const COMPANY_STAGES = [
    'Idea',
    'MVP',
    'Pre-Revenue',
    'Early Revenue',
    'Growth',
    'Scaling',
    'Profitable',
    'Exit'
];

// ============================================================================
// Industries
// ============================================================================

export const INDUSTRIES = [
    'AI/ML',
    'SaaS',
    'FinTech',
    'HealthTech',
    'EdTech',
    'E-commerce',
    'Enterprise Software',
    'Consumer Tech',
    'DeepTech',
    'CleanTech',
    'BioTech',
    'CyberSecurity',
    'Blockchain/Web3',
    'IoT',
    'Marketplace',
    'Social',
    'Gaming',
    'Hardware',
    'Other'
];
