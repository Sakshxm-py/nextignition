import express from 'express';
import { protect } from '../middleware/auth';
import { getExpertEarnings } from '../controllers/earningsController';

const router = express.Router();

router.get('/expert', protect as any, getExpertEarnings as any);

export default router;
