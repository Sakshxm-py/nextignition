import express from 'express';
import { protect } from '../middleware/auth';
import {
    getMyAvailability,
    setAvailability,
    deleteAvailability,
    getExpertAvailability,
    getSpecificDateAvailability,
    getSpecificDateSlots,
    setSpecificDateSlots,
    deleteSpecificDateSlots,
} from '../controllers/availabilityController';

const router = express.Router();

// Expert routes (protected)
router.get('/my-availability', protect, getMyAvailability);
router.post('/availability', protect, setAvailability);
router.delete('/availability/:dayOfWeek', protect, deleteAvailability);

// Specific date availability routes
router.get('/specific-dates', protect, getSpecificDateSlots);
router.post('/specific-date', protect, setSpecificDateSlots);
router.delete('/specific-date/:date', protect, deleteSpecificDateSlots);

// Public route to view expert availability
router.get('/expert/:expertId', getExpertAvailability);
router.get('/expert/:expertId/date/:date', getSpecificDateAvailability);

export default router;
