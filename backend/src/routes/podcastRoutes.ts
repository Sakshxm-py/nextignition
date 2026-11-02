import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
    listPodcastEpisodes,
    getPodcastEpisode,
    createPodcastEpisode,
    updatePodcastEpisode,
    deletePodcastEpisode,
    getFeaturedEpisodes,
    getRecentlyPlayed,
    getRecommendedEpisodes,
    createLiveSession,
    endLiveSession,
    listLiveSessions,
    toggleLikePodcast,
    getPendingPodcasts,
    approvePodcast,
    rejectPodcast,
    getNextIgnitionPodcasts,
} from '../controllers/podcastController';

const router = express.Router();

// ─── Public / authenticated reads ─────────────────────────────────────────────
router.get('/', listPodcastEpisodes);
router.get('/featured', getFeaturedEpisodes);
router.get('/live', listLiveSessions);
router.get('/recently-played', protect, getRecentlyPlayed);
router.get('/recommended', protect, getRecommendedEpisodes);
router.get('/section/nextignition', getNextIgnitionPodcasts);  // ✅ NEW: NextIgnition podcasts
router.get('/:id', getPodcastEpisode);
router.post('/:id/like', protect, toggleLikePodcast);

// ─── Admin endpoints (podcast approval) ────────────────────────────────────────
router.get('/admin/pending', protect, authorize('admin'), getPendingPodcasts);  // ✅ NEW
router.post('/admin/:id/approve', protect, authorize('admin'), approvePodcast);  // ✅ NEW
router.post('/admin/:id/reject', protect, authorize('admin'), rejectPodcast);   // ✅ NEW

// ─── Writes (founder, expert, investor) ───────────────────────────────────────
router.post('/', protect, authorize('founder', 'expert', 'investor'), createPodcastEpisode);
router.put('/:id', protect, authorize('founder', 'expert', 'investor'), updatePodcastEpisode);
router.delete('/:id', protect, authorize('founder', 'expert', 'investor'), deletePodcastEpisode);

// ─── Live session management (founder, expert, investor) ───────────────────────
router.post('/live', protect, authorize('founder', 'expert', 'investor'), createLiveSession);
router.patch('/live/:id/end', protect, authorize('founder', 'expert', 'investor'), endLiveSession);

export default router;
