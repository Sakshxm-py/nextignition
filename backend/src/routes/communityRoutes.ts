import express from 'express';
import { protect, maybeAuth } from '../middleware/auth';
import { uploadAny } from '../middleware/upload';
import {
  getCommunities,
  createCommunity,
  sendCommunityInvite,
  respondToCommunityInvite,
  joinCommunity,
  requestJoinCommunity,
  requestJoinChannel,
  handleChannelJoinRequest,
  handleJoinRequest,
  leaveCommunity,
  getCommunityChannels,
  createCommunityChannel,
  getChannelMessages,
  sendChannelMessage,
  sendChannelAttachment,
  getCommunityMembers,
  getPinnedMessages,
  togglePinMessage,
  toggleMessageBookmark,
  toggleMessageBriefcase,
  getCommunitySettings,
  updateCommunitySettings,
  deleteCommunity,
  deleteCommunityMessage,
} from '../controllers/communityController';

const router = express.Router();

router.get('/', maybeAuth, getCommunities);
router.post('/', protect, createCommunity);
router.delete('/:communityId', protect, deleteCommunity);
router.post('/:communityId/invite', protect, sendCommunityInvite);
router.post('/invites/:inviteId/respond', protect, respondToCommunityInvite);
router.post('/:communityId/join', protect, joinCommunity);
router.post('/:communityId/request-join', protect, requestJoinCommunity);
router.post('/:communityId/requests/handle', protect, handleJoinRequest);
router.post('/:communityId/leave', protect, leaveCommunity);
router.get('/:communityId/channels', protect, getCommunityChannels);
router.post('/:communityId/channels', protect, createCommunityChannel);
router.get('/:communityId/members', protect, getCommunityMembers);
router.get('/:communityId/channels/:channelId/messages', protect, getChannelMessages);
router.post('/:communityId/channels/:channelId/messages', protect, sendChannelMessage);
router.post('/channels/:channelId/attachments', protect, uploadAny.array('files', 10), sendChannelAttachment);

router.post('/channels/:channelId/request-join', protect, requestJoinChannel);
router.post('/channels/:channelId/requests/handle', protect, handleChannelJoinRequest);
router.get('/channels/:channelId/pinned', protect, getPinnedMessages);
router.post('/messages/:messageId/toggle-pin', protect, togglePinMessage);
router.post('/messages/:messageId/bookmark', protect, toggleMessageBookmark);
router.post('/messages/:messageId/briefcase', protect, toggleMessageBriefcase);
router.delete('/messages/:messageId', protect, deleteCommunityMessage);
router.get('/:communityId/settings', protect, getCommunitySettings);
router.put('/:communityId/settings', protect, updateCommunitySettings);

export default router;
