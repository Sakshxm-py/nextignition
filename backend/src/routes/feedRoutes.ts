import express from 'express';
import { createPost, getFeed, likePost, addComment, sharePost, createStory, getStories, getSavedPosts, toggleSavePost, votePoll, getPostById } from '../controllers/feedController';
import { protect, maybeAuth } from '../middleware/auth';
import { uploadAny } from '../middleware/upload';

const router = express.Router();

router.post('/stories', protect, uploadAny.single('media'), createStory);
router.get('/stories', protect, getStories);

router.post('/', protect, uploadAny.single('media'), createPost);
router.get('/', maybeAuth, getFeed);
router.get('/saved', protect, getSavedPosts);
router.get('/:id', maybeAuth, getPostById);
router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, addComment);
router.post('/:id/share', protect, sharePost);
router.post('/:id/save', protect, toggleSavePost);
router.post('/:id/vote', protect, votePoll);

export default router;
