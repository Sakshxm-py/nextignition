import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
    getMyEngagement,
    recordProfileView,
    recordImpressions,
    recordSearchAppearances,
} from '../controllers/engagementController';

const router = Router();

// All engagement routes require an authenticated user.
router.get('/me', protect, getMyEngagement);
router.post('/profile-view/:userId', protect, recordProfileView);
router.post('/impressions', protect, recordImpressions);
router.post('/search-appearances', protect, recordSearchAppearances);

export default router;
