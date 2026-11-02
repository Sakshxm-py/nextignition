import express from 'express';
import { sendMessage, getConversations, getMessages, markAsRead } from '../controllers/messageController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/send', protect, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/:conversationId', protect, getMessages);
router.put('/:conversationId/read', protect, markAsRead);

export default router;
