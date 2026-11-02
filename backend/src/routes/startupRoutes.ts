import express from 'express';
import {
    createStartup,
    getMyStartups,
    getMyStartupStats,
    getAllStartups,
    getStartupById,
    updateStartup,
    getInvestorPipeline,
    updatePipelineStage,
    getInvestorDiscovery,
    getInvestorPortfolio,
    addToPipeline,
    uploadStartupLogo,
    uploadStartupPitchDeck,
    getStartupPitchDeck,
    upvoteStartup,
    addStartupComment
} from '../controllers/startupController';
import { protect, authorize } from '../middleware/auth';
import { upload, uploadDocs } from '../middleware/upload';
import { enforceInvestorTier } from '../middleware/investorTier';
import { requireFeature } from '../middleware/subscriptionMiddleware';

const router = express.Router();

router.post('/', protect, createStartup);
router.get('/my', protect, getMyStartups);
router.get('/my/stats', protect, getMyStartupStats);
router.get('/', getAllStartups);
router.post('/logo', protect, upload.single('logo'), uploadStartupLogo);
router.post('/pitch-deck', protect, requireFeature('founder', 'canUploadPitchDeck'), uploadDocs.single('pitchDeck'), uploadStartupPitchDeck);

// Investor specific routes - allow role='investor' OR investorTier >= 2
router.get('/investor/pipeline', protect, authorize('investor'), enforceInvestorTier(2), getInvestorPipeline);
router.put('/investor/pipeline/:id', protect, authorize('investor'), enforceInvestorTier(2), updatePipelineStage);
router.get('/investor/discover', protect, authorize('investor'), enforceInvestorTier(2), getInvestorDiscovery);
router.get('/investor/portfolio', protect, authorize('investor'), enforceInvestorTier(2), getInvestorPortfolio);
router.post('/investor/pipeline/:id', protect, authorize('investor'), enforceInvestorTier(2), addToPipeline);

router.get('/:id/pitch-deck', protect, getStartupPitchDeck);

router.get('/:id', protect, getStartupById);

router.put('/:id', protect, updateStartup);

router.post('/:id/upvote', protect, upvoteStartup);
router.post('/:id/comment', protect, addStartupComment);

export default router;
