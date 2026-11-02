import express from 'express';
import { createBooking, getMyBookings, updateBookingStatus } from '../controllers/bookingController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/', protect, getMyBookings);
router.put('/:id/status', protect, updateBookingStatus);

export default router;
