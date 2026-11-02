import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    sendPhoneOTP,
    verifyPhoneOTP,
    resendPhoneOTP,
    getPhoneVerificationStatus
} from '../controllers/phoneVerificationController';
import {
    linkedInAuth,
    linkedInCallback,
    connectLinkedIn,
    disconnectLinkedIn,
    autoPopulateFromLinkedIn,
    submitLinkedInUrl
} from '../controllers/linkedInController';

const router = Router();

// ============================================================================
// Phone Verification Routes (Protected)
// ============================================================================

// Send OTP to phone number
router.post('/phone/send-otp', authenticateToken, sendPhoneOTP);

// Verify OTP code
router.post('/phone/verify-otp', authenticateToken, verifyPhoneOTP);

// Resend OTP
router.post('/phone/resend', authenticateToken, resendPhoneOTP);

// Get phone verification status
router.get('/phone/status', authenticateToken, getPhoneVerificationStatus);

// ============================================================================
// LinkedIn OAuth Routes
// ============================================================================

// Initiate LinkedIn OAuth
router.get('/linkedin', linkedInAuth);

// LinkedIn OAuth callback
router.get('/linkedin/callback', linkedInCallback);

// Connect LinkedIn to existing account (protected)
router.post('/linkedin/connect', authenticateToken, connectLinkedIn);

// Disconnect LinkedIn (protected)
router.post('/linkedin/disconnect', authenticateToken, disconnectLinkedIn);

// Auto-populate profile from LinkedIn (protected)
router.post('/linkedin/auto-populate', authenticateToken, autoPopulateFromLinkedIn);

// Submit LinkedIn URL for admin verification (one-time, protected)
router.post('/linkedin-url', authenticateToken, submitLinkedInUrl);

export default router;
