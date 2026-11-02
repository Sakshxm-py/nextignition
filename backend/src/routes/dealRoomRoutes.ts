import express from 'express';
import { protect } from '../middleware/auth';
import { 
    listMyDealRooms,
    getDealRoomByStartupId,
    getDealRoomByFundingApplication, 
    listDealRoomDocuments, 
    getPitchDeckAnalysis,
    signNDA,
    updateChecklist,
    postComment,
    updateDealStage
} from '../controllers/dealRoomController';

const router = express.Router();

router.get('/', protect, listMyDealRooms);

router.get('/startup/:startupId', protect, getDealRoomByStartupId);

router.get('/:fundingApplicationId', protect, getDealRoomByFundingApplication);
router.get('/:fundingApplicationId/documents', protect, listDealRoomDocuments);
router.get('/:fundingApplicationId/pitch-deck/analysis', protect, getPitchDeckAnalysis);
router.post('/sign-nda', protect, signNDA);
router.post('/update-checklist', protect, updateChecklist);
router.post('/update-stage', protect, updateDealStage);
router.post('/comment', protect, postComment);

export default router;
