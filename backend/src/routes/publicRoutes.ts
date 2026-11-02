import express from 'express';
import { getPlatformStats, getPublicSettings, submitContactMessage } from '../controllers/publicController';

const router = express.Router();

router.get('/settings', getPublicSettings);
router.get('/stats', getPlatformStats);
router.post('/contact', submitContactMessage);
router.get('/ping', (req, res) => res.json({ pong: true }));

export default router;
