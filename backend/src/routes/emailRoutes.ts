import express from 'express';
import { protect } from '../middleware/auth';
import { sendTestEmail } from '../controllers/emailController';

const router = express.Router();

router.post('/test', protect, sendTestEmail);

export default router;
