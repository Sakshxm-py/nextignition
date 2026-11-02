import express from 'express';
import { protect } from '../middleware/auth';
import { getMyWallet, listMyWalletTransactions } from '../controllers/walletController';

const router = express.Router();

router.get('/me', protect as any, getMyWallet as any);
router.get('/transactions', protect as any, listMyWalletTransactions as any);

export default router;
