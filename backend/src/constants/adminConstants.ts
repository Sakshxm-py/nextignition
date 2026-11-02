// Admin access control constants and permission matrix
// Define roles, modules, actions, and permissions for the 2-level admin system

export const ADMIN_ROLES = {
    PRIMARY_ADMIN: 'PRIMARY_ADMIN',
    SECONDARY_ADMIN: 'SECONDARY_ADMIN',
} as const;

export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES];

// Admin modules for RBAC
export const ADMIN_MODULES = {
    DASHBOARD: 'DASHBOARD',
    USER_MGMT: 'USER_MGMT',
    STARTUP_MGMT: 'STARTUP_MGMT',
    INVESTOR_MGMT: 'INVESTOR_MGMT',
    PAYMENTS: 'PAYMENTS',
    CONTENT_MOD: 'CONTENT_MOD',
    EVENTS: 'EVENTS',
    NOTIFICATIONS: 'NOTIFICATIONS',
    AI_CONTROL: 'AI_CONTROL',
    PLATFORM_SETTINGS: 'PLATFORM_SETTINGS',
    ADMIN_MGMT: 'ADMIN_MGMT',
    LOGS_SECURITY: 'LOGS_SECURITY',
    DOCUMENTS: 'DOCUMENTS',
} as const;

export type AdminModule = typeof ADMIN_MODULES[keyof typeof ADMIN_MODULES];

// Admin actions that can be performed
export const ADMIN_ACTIONS = {
    VIEW: 'VIEW',
    CREATE: 'CREATE',
    EDIT: 'EDIT',
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
    SUSPEND: 'SUSPEND',
    DELETE: 'DELETE',
    MANAGE: 'MANAGE',
} as const;

export type AdminAction = typeof ADMIN_ACTIONS[keyof typeof ADMIN_ACTIONS];

// Permission matrix: what each role can do in each module
export const ADMIN_PERMISSIONS: Record<AdminRole, Record<AdminModule, AdminAction[]>> = {
    PRIMARY_ADMIN: {
        // Dashboard: Full access to all stats
        DASHBOARD: [ADMIN_ACTIONS.VIEW],

        // User Management: Full control
        USER_MGMT: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.CREATE,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.APPROVE,
            ADMIN_ACTIONS.REJECT,
            ADMIN_ACTIONS.SUSPEND,
            ADMIN_ACTIONS.DELETE,
        ],

        // Startup Management: Full control
        STARTUP_MGMT: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.APPROVE,
            ADMIN_ACTIONS.DELETE,
            ADMIN_ACTIONS.MANAGE,
        ],

        // Investor Management: Full control
        INVESTOR_MGMT: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.APPROVE,
            ADMIN_ACTIONS.DELETE,
            ADMIN_ACTIONS.MANAGE,
        ],

        // Payments & Finance: Full control
        PAYMENTS: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.MANAGE,
            ADMIN_ACTIONS.APPROVE,
        ],

        // Content Moderation: Full control
        CONTENT_MOD: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.DELETE,
            ADMIN_ACTIONS.MANAGE,
        ],

        // Events & Webinars: Full control
        EVENTS: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.CREATE,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.APPROVE,
            ADMIN_ACTIONS.DELETE,
        ],

        // Notifications: Full control
        NOTIFICATIONS: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.CREATE,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.MANAGE,
        ],

        // AI Control: Full control
        AI_CONTROL: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.MANAGE,
        ],

        // Platform Settings: Full control
        PLATFORM_SETTINGS: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.MANAGE,
        ],

        // Admin Management: Full control (can create/suspend other admins)
        ADMIN_MGMT: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.CREATE,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.SUSPEND,
            ADMIN_ACTIONS.DELETE,
        ],

        // Logs & Security: Full access
        LOGS_SECURITY: [
            ADMIN_ACTIONS.VIEW,
        ],

        // Uploaded Documents: View/download all uploads + permanently delete
        DOCUMENTS: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.DELETE,
        ],
    },

    SECONDARY_ADMIN: {
        // Dashboard: View only (no revenue/AI stats)
        DASHBOARD: [ADMIN_ACTIONS.VIEW],

        // User Management: View, approve, edit, suspend (no delete)
        USER_MGMT: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.APPROVE,
            ADMIN_ACTIONS.REJECT,
            ADMIN_ACTIONS.SUSPEND,
        ],

        // Startup Management: View, edit, approve (no delete)
        STARTUP_MGMT: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.APPROVE,
        ],

        // Investor Management: View only (spec 3.4 — secondary can view investors)
        INVESTOR_MGMT: [ADMIN_ACTIONS.VIEW],

        // Payments: No access (PRIMARY_ADMIN only)
        PAYMENTS: [],

        // Content Moderation: View, edit, delete (spec 3.6 — secondary can delete/report posts)
        CONTENT_MOD: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.DELETE,
        ],

        // Events & Webinars: View, create, edit, approve (no delete)
        EVENTS: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.CREATE,
            ADMIN_ACTIONS.EDIT,
            ADMIN_ACTIONS.APPROVE,
        ],

        // Notifications: View, create, edit (no templates management)
        NOTIFICATIONS: [
            ADMIN_ACTIONS.VIEW,
            ADMIN_ACTIONS.CREATE,
            ADMIN_ACTIONS.EDIT,
        ],

        // AI Control: No access (PRIMARY_ADMIN only)
        AI_CONTROL: [],

        // Platform Settings: No access (PRIMARY_ADMIN only)
        PLATFORM_SETTINGS: [],

        // Admin Management: No access (PRIMARY_ADMIN only)
        ADMIN_MGMT: [],

        // Logs & Security: No access (PRIMARY_ADMIN only)
        LOGS_SECURITY: [],

        // Uploaded Documents: View/download only — deletion is PRIMARY-only
        DOCUMENTS: [
            ADMIN_ACTIONS.VIEW,
        ],
    },
};

/**
 * Check if an admin role has permission for a specific action in a module
 */
export function hasPermission(
    role: AdminRole,
    module: AdminModule,
    action: AdminAction
): boolean {
    const modulePermissions = ADMIN_PERMISSIONS[role]?.[module] || [];
    return modulePermissions.includes(action);
}

/**
 * Get all permissions for a role in a module
 */
export function getModulePermissions(
    role: AdminRole,
    module: AdminModule
): AdminAction[] {
    return ADMIN_PERMISSIONS[role]?.[module] || [];
}

/**
 * Get all accessible modules for a role
 */
export function getAccessibleModules(role: AdminRole): AdminModule[] {
    return Object.keys(ADMIN_MODULES).filter((moduleKey) => {
        const module = ADMIN_MODULES[moduleKey as keyof typeof ADMIN_MODULES];
        return getModulePermissions(role, module).length > 0;
    }) as AdminModule[];
}

// Dashboard restrictions for SECONDARY_ADMIN
export const RESTRICTED_DASHBOARD_STATS = {
    revenue: ['SECONDARY_ADMIN'],
    aiUsage: ['SECONDARY_ADMIN'],
    serverMetrics: ['SECONDARY_ADMIN'],
};

// API status codes for permission checks
export const ADMIN_ERROR_MESSAGES = {
    INVALID_TOKEN: 'Invalid or expired admin token',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
    ADMIN_NOT_FOUND: 'Admin not found',
    ADMIN_SUSPENDED: 'This admin account has been suspended',
    UNAUTHORIZED: 'Unauthorized: Admin access required',
};
