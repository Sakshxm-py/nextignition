import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protectAdmin } from '../middleware/adminMiddleware';
import { enforceAdminPermission, onlyPrimaryAdmin } from '../middleware/adminPermissions';
import { validateAdminSession } from '../middleware/adminSessionTimeout';
import { ADMIN_MODULES, ADMIN_ACTIONS } from '../constants/adminConstants';
import {
    adminLogin,
    getUsers,
    getUserDetail,
    getStats,
    getDashboard,
    setUserPlanTier,
    freezeUser,
    unfreezeUser,
    deleteUser,
    updateUser,
    getTransactions,
    verifyUser,
    unverifyUser,
    getRoleApplications,
    approveRole,
    rejectRole,
    suspendRole,
    refreshToken,
    listAdmins,
    createSecondaryAdmin,
    updateAdmin,
    suspendAdmin,
    activateAdmin,
    deleteAdmin as deleteAdminUser,
    getActivityLogs,
    getPublicLeads,
    updatePublicLeadStatus,
    exportPublicLeads,
    getSupportTickets,
    updateTicketStatus,
    getAdminEvents,
    createEvent,
    approveEvent,
    deleteEvent,
    getUserProfile,
    getUserActivityLog,
    getUserDocuments,
    getUserPaymentHistory,
    getAdminStartups,
    getServiceRequests,
    getContactMessages,
    markContactMessageRead,
    deleteContactMessage,
    approveStartup,
    rejectStartup,
    featureStartup,
    updateStartup,
    deleteStartup,
    getAdminInvestors,
    approveInvestor,
    updateInvestor,
    getReports,
    resolveReport,
    getReportedContent,
    removeReportedContent,
    getPlatformSettings,
    updatePlatformSettings,
    broadcastNotification,
    refundPayment,
    getPayouts,
    getAdminPosts,
    deletePost,
    getLoginActivity,
    getAiMetrics,
    getAiPromptLogs,
    listNotificationTemplates,
    createNotificationTemplate,
    updateNotificationTemplate,
    deleteNotificationTemplate,
    getUploadedDocuments,
    getUploadedDocumentStats,
    deleteUploadedDocument,
} from '../controllers/adminController';

const router = Router();

// Aggressive rate limit on login to prevent brute-force.
// Production: 10/min. Development: 50/min for convenience.
const loginRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 50,
    message: { message: 'Too many login attempts. Try again in 1 minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public — health check for connectivity diagnostics
router.get('/health', (req, res) => res.json({ status: 'admin-healthy', timestamp: new Date().toISOString() }));

// Public — health check for connectivity diagnostics
router.get('/ping', (req, res) => res.json({ status: 'admin-router-ok', timestamp: new Date().toISOString() }));

// Public — login only
router.post('/login', loginRateLimit, adminLogin);

// Public — refresh token
router.post('/refresh', refreshToken);

// ============================================================================
// ALL ROUTES BELOW REQUIRE VALID ADMIN JWT + SESSION VALIDATION
// ============================================================================

// Apply session timeout validation to all protected routes
router.use(protectAdmin);
router.use(validateAdminSession);

// ============================================================================
// DASHBOARD & STATS (USER_MGMT & DASHBOARD)
// ============================================================================

// Dashboard: Both PRIMARY and SECONDARY can view
router.get('/stats', enforceAdminPermission(ADMIN_MODULES.DASHBOARD, ADMIN_ACTIONS.VIEW), getStats);
router.get('/dashboard', enforceAdminPermission(ADMIN_MODULES.DASHBOARD, ADMIN_ACTIONS.VIEW), getDashboard);

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// View users: Both PRIMARY and SECONDARY
router.get('/users', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getUsers);

// View user detail: Both PRIMARY and SECONDARY
router.get('/users/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getUserDetail);

// Set subscription plan tier for testing: Both PRIMARY and SECONDARY (EDIT)
router.post('/users/:id/set-plan', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.EDIT), setUserPlanTier);

// Edit user profile details: Both PRIMARY and SECONDARY (EDIT) — spec 3.2
router.put('/users/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.EDIT), updateUser);

// Suspend/freeze user: Both PRIMARY and SECONDARY
router.post('/freeze/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.SUSPEND), freezeUser);
router.post('/unfreeze/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.SUSPEND), unfreezeUser);

// Verify user: Both PRIMARY and SECONDARY
router.post('/verify/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.EDIT), verifyUser);
router.post('/unverify/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.EDIT), unverifyUser);

// Delete user: PRIMARY_ADMIN ONLY
router.delete('/delete/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.DELETE), deleteUser);

// ============================================================================
// PUBLIC LEADS MANAGEMENT (USER_MGMT MODULE)
// ============================================================================
// Both PRIMARY and SECONDARY can view and edit leads
router.get('/public-leads', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getPublicLeads);
router.put('/public-leads/:id/status', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.EDIT), updatePublicLeadStatus);
// Only PRIMARY can export raw leads data
router.get('/public-leads/export', onlyPrimaryAdmin(), exportPublicLeads);

// ============================================================================
// PAYMENTS & TRANSACTIONS (PRIMARY_ADMIN ONLY)
// ============================================================================

router.get('/transactions', enforceAdminPermission(ADMIN_MODULES.PAYMENTS, ADMIN_ACTIONS.VIEW), getTransactions);
// Payouts/settlements overview (read-only) + Razorpay refunds — PRIMARY only (spec 3.5)
router.get('/payouts', enforceAdminPermission(ADMIN_MODULES.PAYMENTS, ADMIN_ACTIONS.VIEW), getPayouts);
router.post('/payments/:id/refund', enforceAdminPermission(ADMIN_MODULES.PAYMENTS, ADMIN_ACTIONS.MANAGE), refundPayment);

// ============================================================================
// SUPPORT TICKETS (USER_MGMT MODULE)
// ============================================================================
// Both PRIMARY and SECONDARY can view and edit support tickets
router.get('/support-tickets', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getSupportTickets);
router.put('/support-tickets/:id/status', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.EDIT), updateTicketStatus);

// ============================================================================
// EVENTS MANAGEMENT (dedicated EVENTS module, spec 3.7)
// ============================================================================
router.get('/events', enforceAdminPermission(ADMIN_MODULES.EVENTS, ADMIN_ACTIONS.VIEW), getAdminEvents);
router.post('/events', enforceAdminPermission(ADMIN_MODULES.EVENTS, ADMIN_ACTIONS.CREATE), createEvent);
router.post('/events/:id/approve', enforceAdminPermission(ADMIN_MODULES.EVENTS, ADMIN_ACTIONS.APPROVE), approveEvent);
// Delete event is PRIMARY-only per spec (✗ for secondary)
router.delete('/events/:id', enforceAdminPermission(ADMIN_MODULES.EVENTS, ADMIN_ACTIONS.DELETE), deleteEvent);

// ============================================================================
// INVESTOR MANAGEMENT (dedicated INVESTOR_MGMT module, spec 3.4)
// ============================================================================
// Secondary can view; approve/edit are PRIMARY-only.
router.get('/investors', enforceAdminPermission(ADMIN_MODULES.INVESTOR_MGMT, ADMIN_ACTIONS.VIEW), getAdminInvestors);
router.post('/investors/:id/approve', enforceAdminPermission(ADMIN_MODULES.INVESTOR_MGMT, ADMIN_ACTIONS.APPROVE), approveInvestor);
router.put('/investors/:id', enforceAdminPermission(ADMIN_MODULES.INVESTOR_MGMT, ADMIN_ACTIONS.EDIT), updateInvestor);

// ============================================================================
// ROLE VERIFICATION & MANAGEMENT
// ============================================================================

// Role applications: Both PRIMARY and SECONDARY (SECONDARY to approve users)
router.get('/role-applications', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.APPROVE), getRoleApplications);

// Approve/reject/suspend roles: Both can approve, only PRIMARY can suspend
router.post('/approve-role/:userId', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.APPROVE), approveRole);
router.post('/reject-role/:userId', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.REJECT), rejectRole);
router.post('/suspend-role/:userId', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.SUSPEND), suspendRole);

// ============================================================================
// ADMIN MANAGEMENT (PRIMARY_ADMIN ONLY)
// ============================================================================

// List admins
router.get('/admins', onlyPrimaryAdmin(), listAdmins);

// Create secondary admin
router.post('/admins', onlyPrimaryAdmin(), createSecondaryAdmin);

// Update admin
router.put('/admins/:adminId', onlyPrimaryAdmin(), updateAdmin);

// Suspend admin
router.post('/admins/:adminId/suspend', onlyPrimaryAdmin(), suspendAdmin);

// Activate admin
router.post('/admins/:adminId/activate', onlyPrimaryAdmin(), activateAdmin);

// Delete admin
router.delete('/admins/:adminId', onlyPrimaryAdmin(), deleteAdminUser);

// ============================================================================
// AUDIT LOGS & SECURITY (PRIMARY_ADMIN ONLY)
// ============================================================================

router.get('/activity-logs', onlyPrimaryAdmin(ADMIN_MODULES.LOGS_SECURITY), getActivityLogs);

// ============================================================================
// USER DETAIL (PRIMARY_ADMIN ONLY)
// Full visibility into a specific user's activity, documents, and payments
// ============================================================================

router.get('/users/:userId/profile', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getUserProfile);
router.get('/users/:userId/activity', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getUserActivityLog);
router.get('/users/:userId/documents', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getUserDocuments);
router.get('/users/:userId/payments', onlyPrimaryAdmin(ADMIN_MODULES.PAYMENTS), getUserPaymentHistory);

// ============================================================================
// STARTUP MANAGEMENT (dedicated STARTUP_MGMT module)
// ============================================================================
// Note: STARTUP_MGMT has no REJECT action; approve/reject are the same
// moderation gate, so reject is enforced under APPROVE.
router.get('/startups', enforceAdminPermission(ADMIN_MODULES.STARTUP_MGMT, ADMIN_ACTIONS.VIEW), getAdminStartups);
router.get('/service-requests', enforceAdminPermission(ADMIN_MODULES.STARTUP_MGMT, ADMIN_ACTIONS.VIEW), getServiceRequests);

// Contact Us form submissions
router.get('/contact-messages', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.VIEW), getContactMessages);
router.post('/contact-messages/:id/read', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.EDIT), markContactMessageRead);
router.delete('/contact-messages/:id', enforceAdminPermission(ADMIN_MODULES.USER_MGMT, ADMIN_ACTIONS.DELETE), deleteContactMessage);
router.post('/startups/:id/approve', enforceAdminPermission(ADMIN_MODULES.STARTUP_MGMT, ADMIN_ACTIONS.APPROVE), approveStartup);
router.post('/startups/:id/reject', enforceAdminPermission(ADMIN_MODULES.STARTUP_MGMT, ADMIN_ACTIONS.APPROVE), rejectStartup);
// Feature (promoted listing) and hard delete are PRIMARY-only per spec 3.3 (✗ for secondary)
router.put('/startups/:id', enforceAdminPermission(ADMIN_MODULES.STARTUP_MGMT, ADMIN_ACTIONS.EDIT), updateStartup);
router.post('/startups/:id/feature', enforceAdminPermission(ADMIN_MODULES.STARTUP_MGMT, ADMIN_ACTIONS.MANAGE), featureStartup);
router.delete('/startups/:id', enforceAdminPermission(ADMIN_MODULES.STARTUP_MGMT, ADMIN_ACTIONS.DELETE), deleteStartup);

// ============================================================================
// CONTENT MODERATION (dedicated CONTENT_MOD module)
// ============================================================================

router.get('/reports', enforceAdminPermission(ADMIN_MODULES.CONTENT_MOD, ADMIN_ACTIONS.VIEW), getReports);
router.post('/reports/:id/resolve', enforceAdminPermission(ADMIN_MODULES.CONTENT_MOD, ADMIN_ACTIONS.EDIT), resolveReport);
router.get('/reports/:id/content', enforceAdminPermission(ADMIN_MODULES.CONTENT_MOD, ADMIN_ACTIONS.VIEW), getReportedContent);
router.delete('/reports/:id/content', enforceAdminPermission(ADMIN_MODULES.CONTENT_MOD, ADMIN_ACTIONS.DELETE), removeReportedContent);
// Community posts moderation — both admins can view + delete (spec 3.6)
router.get('/posts', enforceAdminPermission(ADMIN_MODULES.CONTENT_MOD, ADMIN_ACTIONS.VIEW), getAdminPosts);
router.delete('/posts/:id', enforceAdminPermission(ADMIN_MODULES.CONTENT_MOD, ADMIN_ACTIONS.DELETE), deletePost);

// ============================================================================
// SETTINGS & BROADCAST (PRIMARY_ADMIN ONLY for most)
// ============================================================================

router.get('/settings', onlyPrimaryAdmin(ADMIN_MODULES.PLATFORM_SETTINGS), getPlatformSettings);
router.post('/settings', onlyPrimaryAdmin(ADMIN_MODULES.PLATFORM_SETTINGS), updatePlatformSettings);
// Sending a broadcast is allowed for BOTH admins (spec 3.8 ✓ both)
router.post('/broadcast', enforceAdminPermission(ADMIN_MODULES.NOTIFICATIONS, ADMIN_ACTIONS.CREATE), broadcastNotification);

// Notification templates — managing templates is PRIMARY-only (spec 3.8 ✗ secondary)
router.get('/notification-templates', enforceAdminPermission(ADMIN_MODULES.NOTIFICATIONS, ADMIN_ACTIONS.MANAGE), listNotificationTemplates);
router.post('/notification-templates', enforceAdminPermission(ADMIN_MODULES.NOTIFICATIONS, ADMIN_ACTIONS.MANAGE), createNotificationTemplate);
router.put('/notification-templates/:id', enforceAdminPermission(ADMIN_MODULES.NOTIFICATIONS, ADMIN_ACTIONS.MANAGE), updateNotificationTemplate);
router.delete('/notification-templates/:id', enforceAdminPermission(ADMIN_MODULES.NOTIFICATIONS, ADMIN_ACTIONS.MANAGE), deleteNotificationTemplate);

// ============================================================================
// AI CONTROL (PRIMARY_ADMIN ONLY — spec 3.9)
// ============================================================================
router.get('/ai/metrics', enforceAdminPermission(ADMIN_MODULES.AI_CONTROL, ADMIN_ACTIONS.VIEW), getAiMetrics);
router.get('/ai/prompt-logs', enforceAdminPermission(ADMIN_MODULES.AI_CONTROL, ADMIN_ACTIONS.VIEW), getAiPromptLogs);

// ============================================================================
// LOGIN ACTIVITY (PRIMARY_ADMIN ONLY — spec 3.12)
// ============================================================================
router.get('/login-activity', onlyPrimaryAdmin(ADMIN_MODULES.LOGS_SECURITY), getLoginActivity);

// ============================================================================
// UPLOADED DOCUMENTS (dedicated DOCUMENTS module)
// View/download: BOTH admins. Delete (storage + DB): PRIMARY_ADMIN only.
// ============================================================================
router.get('/documents', enforceAdminPermission(ADMIN_MODULES.DOCUMENTS, ADMIN_ACTIONS.VIEW), getUploadedDocuments);
router.get('/documents/stats', enforceAdminPermission(ADMIN_MODULES.DOCUMENTS, ADMIN_ACTIONS.VIEW), getUploadedDocumentStats);
router.delete('/documents/:docUid', enforceAdminPermission(ADMIN_MODULES.DOCUMENTS, ADMIN_ACTIONS.DELETE), deleteUploadedDocument);

export default router;
