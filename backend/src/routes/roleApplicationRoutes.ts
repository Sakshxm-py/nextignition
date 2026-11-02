import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { profileAccessLimiter } from '../middleware/rateLimiter';  // ✅ NEW
import {
    applyForRole,
    getMyRoles,
    setPrimaryRole,
    updateRoleProfile,
    getPublicProfile
} from '../controllers/roleApplicationController';

const router = Router();

// ============================================================================
// User Role Application Routes (Protected)
// ============================================================================

// Apply for a new role (investor, expert, founder)
router.post('/apply', authenticateToken, applyForRole);

// Get my current roles and status
router.get('/my-roles', authenticateToken, getMyRoles);

// Set primary display role
router.post('/set-primary', authenticateToken, setPrimaryRole);

// Update role profile data
router.put('/update-profile', authenticateToken, updateRoleProfile);

// ============================================================================
// Public Profile Routes
// ============================================================================

// Get public profile with badges (anyone can view)
router.get('/profile/:userId', profileAccessLimiter, getPublicProfile);  // ✅ NEW: Rate limited

export default router;
