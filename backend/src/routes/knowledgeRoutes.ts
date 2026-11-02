import express from 'express';
import { protect } from '../middleware/auth';
import {
    getMyKnowledgeContent,
    createKnowledgeContent,
    updateKnowledgeContent,
    deleteKnowledgeContent,
    likeKnowledgeContent,
    getPublicKnowledgeContent
} from '../controllers/knowledgeController';

const router = express.Router();

router.get('/', protect as any, getMyKnowledgeContent as any);
router.post('/', protect as any, createKnowledgeContent as any);
router.put('/:id', protect as any, updateKnowledgeContent as any);
router.delete('/:id', protect as any, deleteKnowledgeContent as any);
router.post('/:id/like', protect as any, likeKnowledgeContent as any);
router.get('/public', getPublicKnowledgeContent as any);

export default router;
