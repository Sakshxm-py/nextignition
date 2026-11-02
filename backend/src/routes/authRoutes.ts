import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    register,
    login,
    googleLogin,
    appleLogin,
    getMe,
    getProfile,
    updateProfile,
    getUsersByRole,
    searchUsers,
    switchRole,
    requestEmailVerificationOtp,
    verifyEmailWithOtp,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    getProfilesCreated,
    updateEmail,
    updatePassword,
    toggleTwoFactor,
    deactivateAccount,
    deleteAccount,
    updateNotificationSettings,
    getNotificationSettings,
    getPrivacySettings,
    updatePrivacySettings,
    requestDataExport,
    submitSupportTicket,
    getHelpArticles,
    submitVerification,
    publicRegister,
    refreshAccessToken,
} from '../controllers/authController';
import { protect, maybeAuth } from '../middleware/auth';
import { upload, uploadVideo as uploadVideoMiddleware } from '../middleware/upload';
import {
    getAvatarUploadUrl,
    getCoverPhotoUploadUrl,
    uploadAvatar,
    removeAvatar,
    uploadCoverPhoto,
    verifySocialLink,
    uploadVideo,
    updateVoiceSettings,
} from '../controllers/userController';

const router = express.Router();

// Throttle credential endpoints to slow brute-force / credential stuffing.
const authRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: { message: 'Too many attempts. Please try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Tighter limit for OTP/email senders to prevent OTP-bombing / email abuse.
const otpRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 100,
    message: { message: 'Too many requests. Please try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', authRateLimit, register);
router.post('/public-register', authRateLimit, publicRegister);
router.post('/login', authRateLimit, login);
router.post('/google', authRateLimit, googleLogin);
router.post('/apple', authRateLimit, appleLogin);
router.post('/refresh', refreshAccessToken);
router.post('/email/otp', otpRateLimit, requestEmailVerificationOtp);
router.post('/email/verify', authRateLimit, verifyEmailWithOtp);
router.post('/password/otp', otpRateLimit, requestPasswordResetOtp);
router.post('/password/reset', authRateLimit, resetPasswordWithOtp);
router.get('/me', protect, getMe);
router.get('/profile/:id', maybeAuth, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/avatar/upload-url', protect, getAvatarUploadUrl);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', protect, removeAvatar);
router.post('/cover-photo/upload-url', protect, getCoverPhotoUploadUrl);
router.post('/cover-photo', protect, upload.single('coverPhoto'), uploadCoverPhoto);
router.post('/video', protect, uploadVideoMiddleware.single('video'), uploadVideo);
router.post('/socials/verify', protect, verifySocialLink);
router.put('/voice-settings', protect, updateVoiceSettings);
router.get('/users', maybeAuth, getUsersByRole);
router.get('/search', maybeAuth, searchUsers);
router.get('/profiles-created', protect, getProfilesCreated);
router.put('/switch-role', protect, switchRole);
router.put('/update-email', protect, updateEmail);
router.put('/update-password', protect, updatePassword);
router.put('/toggle-2fa', protect, toggleTwoFactor);
router.put('/deactivate', protect, deactivateAccount);
router.delete('/delete-account', protect, deleteAccount);
router.get('/notification-settings', protect, getNotificationSettings);
router.put('/notification-settings', protect, updateNotificationSettings);
router.get('/privacy-settings', protect, getPrivacySettings);
router.put('/privacy-settings', protect, updatePrivacySettings);
router.post('/data-export', protect, requestDataExport);
router.post('/support-ticket', protect, submitSupportTicket);
router.get('/help-articles', protect, getHelpArticles);
router.post('/submit-verification', protect, submitVerification);

export default router;
