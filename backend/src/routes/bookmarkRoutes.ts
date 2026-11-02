import { Router } from 'express';
import { protect } from '../middleware/auth';
import * as bookmarkController from '../controllers/bookmarkController';

const router = Router();

// Bookmark toggle
router.post('/toggle/:targetUserId', protect, bookmarkController.toggleProfileBookmark);
router.post('/startup/toggle/:startupId', protect, bookmarkController.toggleStartupBookmark);

// Check bookmark status
router.get('/status/:targetUserId', protect, bookmarkController.checkBookmarkStatus);
router.get('/startup/status/:startupId', protect, bookmarkController.checkStartupBookmarkStatus);

// Get all bookmarked profiles/startups
router.get('/', protect, bookmarkController.getSavedProfiles);
router.get('/startups', protect, bookmarkController.getSavedStartups);

export default router;
