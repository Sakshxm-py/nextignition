import express from 'express';
import {
    listEvents,
    listMyEvents,
    createEvent,
    updateEvent,
    registerForEvent,
    unregisterFromEvent,
    toggleBookmark,
    getEventAttendees,
    uploadPresentation,
    uploadPresentationPreEvent,
    createTicketOrder,
    verifyTicketPayment,
    requestTicketRefund,
    cancelEvent,
    completeEventAndOpenPayouts,
    releaseHostPayout,
    getEventFinancialSummary,
} from '../controllers/eventController';
import { protect } from '../middleware/auth';
import { uploadDocs } from '../middleware/upload';

const router = express.Router();

router.get('/', listEvents);
router.get('/mine', protect, listMyEvents);
router.post('/', protect, createEvent);
router.put('/:id', protect, updateEvent);
router.post('/:id/register', protect, registerForEvent);
router.post('/:id/unregister', protect, unregisterFromEvent);
router.post('/:id/ticket-order', protect, createTicketOrder);
router.post('/:id/ticket-verify', protect, verifyTicketPayment);
router.post('/:id/refund', protect, requestTicketRefund);
router.post('/:id/cancel', protect, cancelEvent);
router.post('/:id/complete', protect, completeEventAndOpenPayouts);
router.post('/:id/release-payout', protect, releaseHostPayout);
router.get('/:id/financials', protect, getEventFinancialSummary);
router.post('/:id/bookmark', protect, toggleBookmark);
router.get('/:id/attendees', protect, getEventAttendees);
router.post('/upload-presentation', protect, uploadDocs.single('presentation'), uploadPresentationPreEvent);
router.post('/:id/presentation', protect, uploadDocs.single('presentation'), uploadPresentation);

export default router;
