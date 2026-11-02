import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
    hostEvent,
    hostSession,
    getMyEvents,
    getMySessions,
    getEvents,
    getSessions,
    rsvpEvent,
    rsvpSession
} from '../controllers/investorFeaturesController';

const router = Router();

// ============================================================================
// Events
// ============================================================================
router.post('/events/host', protect, hostEvent);
router.get('/events/my-events', protect, getMyEvents);
router.get('/events', getEvents);
router.post('/events/:eventId/rsvp', protect, rsvpEvent);

// ============================================================================
// Sessions
// ============================================================================
router.post('/sessions/host', protect, hostSession);
router.get('/sessions/my-sessions', protect, getMySessions);
router.get('/sessions', getSessions);
router.post('/sessions/:sessionId/rsvp', protect, rsvpSession);

export default router;
