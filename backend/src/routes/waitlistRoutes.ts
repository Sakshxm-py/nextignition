import { Router } from 'express';
import * as waitlistController from '../controllers/waitlistController';

const router = Router();

router.post('/join', waitlistController.joinWaitlist);

export default router;
