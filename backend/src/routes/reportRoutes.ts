import express from 'express';
import { protect } from '../middleware/auth';
import { createReport, getMyReports } from '../controllers/reportController';

const router = express.Router();

router.post('/', protect, createReport);
router.get('/mine', protect, getMyReports);

export default router;
