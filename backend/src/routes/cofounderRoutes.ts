import express from 'express';
import { protect, maybeAuth } from '../middleware/auth';
import {
    listCofounders,
    saveCofounder,
    listSavedCofounders,
    upsertMyCofounderProfile,
    getUserPublic,
    requestConnection,
    getConnectionStatus,
} from '../controllers/cofounderController';

const router = express.Router();

router.get('/', maybeAuth, listCofounders);
router.get('/saved', protect, listSavedCofounders);
router.post('/saved/:userId', protect, saveCofounder);

router.get('/users/:userId', maybeAuth, getUserPublic);
router.post('/connect/:userId', protect, requestConnection);
router.get('/connect/:userId/status', protect, getConnectionStatus);

router.put('/me', protect, upsertMyCofounderProfile);

export default router;
