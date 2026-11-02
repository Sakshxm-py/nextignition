import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

type WalletDirection = 'credit' | 'debit';

const getSignedAmount = (direction: WalletDirection, amountPaise: number) => {
  const amt = Number(amountPaise) || 0;
  return direction === 'debit' ? -Math.abs(amt) : Math.abs(amt);
};

export const getMyWallet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user?.id || '');
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { data: rows, error } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, data, created_at')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ message: 'Failed to load wallet', error: error.message });
    }

    let balancePaise = 0;
    let currency = 'INR';

    for (const row of rows || []) {
      const d = (row as any)?.data || {};
      const direction = String(d.direction || '') as WalletDirection;
      const amountPaise = Number(d.amountPaise || 0);
      currency = String(d.currency || currency);
      if (direction === 'credit' || direction === 'debit') {
        balancePaise += getSignedAmount(direction, amountPaise);
      }
    }

    return res.json({
      userId,
      currency,
      balancePaise,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to load wallet', error: err?.message });
  }
};

export const listMyWalletTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user?.id || '');
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

    const { data: rows, error } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ message: 'Failed to load wallet transactions', error: error.message });
    }

    return res.json({ transactions: rows || [] });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to load wallet transactions', error: err?.message });
  }
};
