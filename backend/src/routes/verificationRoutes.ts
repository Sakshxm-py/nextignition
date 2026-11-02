import express from 'express';
import { protect } from '../middleware/auth';
import { protectAdmin } from '../middleware/adminMiddleware';
import { enforceAdminPermission } from '../middleware/adminPermissions';
import { validateAdminSession } from '../middleware/adminSessionTimeout';
import { ADMIN_MODULES, ADMIN_ACTIONS } from '../constants/adminConstants';
import {
    completeVerification,
    setVerificationBannerState,
    getInvestorVerificationStatus,
    verifySocialAccount,
    requestAccreditationReview,
    getInvestorProfile,
    getPendingVerifications,
    approveInvestorVerification,
    rejectInvestorVerification
} from '../controllers/verificationController';
import { enforceInvestorTier, requireVerifiedInvestor, attachInvestorTierInfo } from '../middleware/investorTier';

const router = express.Router();

// ===== ADMIN ROUTES =====
// Registered BEFORE the global `router.use(protect, ...)` below so they are NOT
// caught by the user-JWT chain. These go through the admin JWT + RBAC stack
// (protectAdmin -> validateAdminSession -> enforceAdminPermission) instead of
// trusting `req.user.role === 'admin'` from a user token, which any user could
// previously obtain. Maps to the INVESTOR_MGMT module: SECONDARY can VIEW the
// queue; approve/reject are PRIMARY-only (enforced under APPROVE, as INVESTOR_MGMT
// has no separate REJECT action).
const adminGuard = [protectAdmin, validateAdminSession] as const;

// Get pending verifications
router.get('/admin/pending', ...adminGuard, enforceAdminPermission(ADMIN_MODULES.INVESTOR_MGMT, ADMIN_ACTIONS.VIEW), getPendingVerifications);

// Approve/reject verifications
router.post('/admin/approve/:queueId', ...adminGuard, enforceAdminPermission(ADMIN_MODULES.INVESTOR_MGMT, ADMIN_ACTIONS.APPROVE), approveInvestorVerification);
router.post('/admin/reject/:queueId', ...adminGuard, enforceAdminPermission(ADMIN_MODULES.INVESTOR_MGMT, ADMIN_ACTIONS.APPROVE), rejectInvestorVerification);

// ===== EXISTING ROUTES =====
router.post('/complete', protect, completeVerification);
router.post('/banner', protect, setVerificationBannerState);

// ===== INVESTOR VERIFICATION ROUTES =====
router.use(protect, attachInvestorTierInfo); // Attach tier info to all requests

// Get verification status
router.get('/investor/status', getInvestorVerificationStatus);

// Get investor profile (with or without investorId parameter)
router.get('/investor/profile', getInvestorProfile);
router.get('/investor/profile/:investorId', getInvestorProfile);

// Verify social account
router.post('/investor/verify-social', verifySocialAccount);

// Request Tier 3 accreditation
router.post('/investor/request-accreditation', requestAccreditationReview);

export default router;
