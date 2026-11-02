import express from 'express';
import { protect } from '../middleware/auth';
import { initiateCall, updateCallStatus } from '../controllers/callController';

const router = express.Router();

router.post('/', protect, initiateCall);
router.patch('/:callId', protect, updateCallStatus);

export default router;
