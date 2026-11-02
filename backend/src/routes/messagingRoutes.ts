import { Router } from 'express';
import { protect } from '../middleware/auth';
import { uploadAny } from '../middleware/upload';
import {
  inviteToCommunityViaMessage,
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  searchUsers,
  getMessagingUsers,
  sendAttachment,
  archiveConversation,
  deleteConversation,
  togglePinConversation,
} from '../controllers/messagingController';

const router = Router();

// Conversation routes
router.post('/conversations', protect, getOrCreateConversation);
router.get('/conversations', protect, getMyConversations);
router.post('/conversations/invite-community', protect, inviteToCommunityViaMessage);
router.put('/conversations/:conversationId/read', protect, markConversationRead);
router.put('/conversations/:conversationId/archive', protect, archiveConversation);
router.put('/conversations/:conversationId/pin', protect, togglePinConversation);
router.delete('/conversations/:conversationId', protect, deleteConversation);

// Message routes
router.get('/conversations/:conversationId/messages', protect, getMessages);
router.post('/conversations/:conversationId/messages', protect, sendMessage);
router.post('/conversations/:conversationId/attachments', protect, uploadAny.array('files', 10), sendAttachment);

// User search routes
router.get('/users/search', protect, searchUsers);
router.get('/users/messaging', protect, getMessagingUsers);

export default router;
