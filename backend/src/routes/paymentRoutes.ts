import express from 'express';
import { protect } from '../middleware/auth';
import { 
  createOrder, 
  verifyPayment, 
  getRazorpayKey,
  getSubscriptionStatus,
  createBundleOrder,
  verifyBundlePayment,
  createEventTicketOrder,
  verifyEventTicketPayment,
  razorpayWebhook,
  revenuecatWebhook
} from '../controllers/paymentController';

const router = express.Router();

router.get('/status', protect, getSubscriptionStatus);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/bundle-order', protect, createBundleOrder);
router.post('/bundle-verify', protect, verifyBundlePayment);
router.post('/create-ticket-order', protect, createEventTicketOrder);
router.post('/verify-ticket', protect, verifyEventTicketPayment);
router.get('/config', protect, getRazorpayKey);

// Razorpay calls this endpoint server-to-server. Do NOT protect with user auth.
router.post('/webhook', razorpayWebhook);

// RevenueCat (StoreKit IAP) calls this server-to-server. Verified by the
// Authorization header secret inside the handler, NOT user auth.
router.post('/revenuecat-webhook', revenuecatWebhook);

export default router;
