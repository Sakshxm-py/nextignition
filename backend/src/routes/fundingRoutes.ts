import express from 'express';
import { protect } from '../middleware/auth';
import { uploadDocs, uploadVideo } from '../middleware/upload';
import {
    submitFundingApplication,
    listFundingStartups,
    bookmarkStartup,
    expressInterest,
    listMyBookmarks,
    getMyFundingDraft,
    upsertMyFundingDraft,
    uploadMyPitchDeck,
    uploadMyPitchVideo,
    uploadMyBusinessDocuments,
    submitMyFundingDraft,
    createInvestorProfile,
} from '../controllers/fundingController';

const router = express.Router();

router.get('/startups', listFundingStartups);
router.post('/applications', protect, submitFundingApplication);
router.post('/create-investor-profile', protect, createInvestorProfile);

router.get('/my-submission', protect, getMyFundingDraft);
router.put('/my-submission', protect, upsertMyFundingDraft);

router.post('/pitch-deck', protect, uploadDocs.single('pitchDeck'), uploadMyPitchDeck);
router.post('/pitch-video', protect, uploadVideo.single('pitchVideo'), uploadMyPitchVideo);
router.post('/business-documents', protect, uploadDocs.array('documents', 10), uploadMyBusinessDocuments);

router.post('/my-submission/submit', protect, submitMyFundingDraft);

router.get('/bookmarks', protect, listMyBookmarks);
router.post('/startups/:startupId/bookmark', protect, bookmarkStartup);
router.post('/startups/:startupId/interest', protect, expressInterest);

export default router;
