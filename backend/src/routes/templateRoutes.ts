import express from 'express';
import { protect } from '../middleware/auth';
import { listTemplates, fillTemplate, exportTemplate, getRenderStatus } from '../controllers/templateController';

const router = express.Router();

router.get('/', protect, listTemplates);
router.post('/:templateId/fill', protect, fillTemplate);
router.post('/:templateId/export', protect, exportTemplate);
router.get('/:templateId/render-status/:renderId', protect, getRenderStatus);

export default router;
