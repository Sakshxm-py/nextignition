import { Router } from 'express';
import { protect } from '../middleware/auth';
import { followUser, getMyFollowing, getMyFollowers, getFollowCounts, getFollowStatus, unfollowUser } from '../controllers/followController';

const router = Router();

router.get('/following', protect, getMyFollowing);
router.get('/followers', protect, getMyFollowers);
router.get('/counts/:userId', protect, getFollowCounts);
router.get('/status/:userId', protect, getFollowStatus);
router.post('/:userId', protect, followUser);
router.delete('/:userId', protect, unfollowUser);

export default router;
