import express from 'express';
import { protect } from '../middleware/auth';
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/userController';

const router = express.Router();

router.get('/blocked', protect, getBlockedUsers);
router.post('/:userId/block', protect, blockUser);
router.delete('/:userId/block', protect, unblockUser);

export default router;
