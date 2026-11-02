import crypto from 'crypto';
import { supabase } from './supabase';

type WalletDirection = 'credit' | 'debit';
type WalletEntryKind =
  | 'gross_credit'
  | 'commission_debit'
  | 'reversal_gross_credit'
  | 'reversal_commission_debit';

interface WalletTransactionData {
  entryKind: WalletEntryKind;
  direction: WalletDirection;
  amountPaise: number;
  currency: string;
  sourceType: 'event_ticket';
  sourceId: string;
  eventId: string;
  hostUserId: string;
  attendeeId?: string;
  meta?: any;
  createdAt: string;
}

const safeNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const existsEntry = async (userId: string, sourceId: string, entryKind: WalletEntryKind) => {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('data->>sourceId', sourceId)
    .eq('data->>entryKind', entryKind)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data || []).length > 0;
};

const insertEntry = async (userId: string, data: WalletTransactionData) => {
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    data,
  };

  const { error } = await supabase.from('wallet_transactions').insert(row);
  if (error) throw error;
};

export const recordEventTicketPaidToWallet = async (paymentRow: { id: string; data: any }) => {
  const paymentId = String(paymentRow?.id || '');
  const d = paymentRow?.data || {};

  const hostUserId = String(d?.hostUser || '');
  const attendeeId = String(d?.attendee || '');
  const eventId = String(d?.event || '');
  const currency = String(d?.currency || 'INR');

  const grossPaise = safeNumber(d?.amount);
  const commissionPaise = safeNumber(d?.platformCommission?.amountPaise);

  if (!paymentId || !hostUserId || !eventId) {
    return;
  }

  if (grossPaise <= 0) {
    return;
  }

  const createdAt = new Date().toISOString();

  const grossKind: WalletEntryKind = 'gross_credit';
  const commissionKind: WalletEntryKind = 'commission_debit';

  const hasGross = await existsEntry(hostUserId, paymentId, grossKind);
  if (!hasGross) {
    await insertEntry(hostUserId, {
      entryKind: grossKind,
      direction: 'credit',
      amountPaise: Math.max(0, Math.round(grossPaise)),
      currency,
      sourceType: 'event_ticket',
      sourceId: paymentId,
      eventId,
      hostUserId,
      attendeeId,
      meta: {
        platformCommission: d?.platformCommission || null,
      },
      createdAt,
    });
  }

  if (commissionPaise > 0) {
    const hasCommission = await existsEntry(hostUserId, paymentId, commissionKind);
    if (!hasCommission) {
      await insertEntry(hostUserId, {
        entryKind: commissionKind,
        direction: 'debit',
        amountPaise: Math.max(0, Math.round(commissionPaise)),
        currency,
        sourceType: 'event_ticket',
        sourceId: paymentId,
        eventId,
        hostUserId,
        attendeeId,
        meta: {
          platformCommission: d?.platformCommission || null,
        },
        createdAt,
      });
    }
  }
};

export const recordEventTicketRefundToWallet = async (paymentRow: { id: string; data: any }) => {
  const paymentId = String(paymentRow?.id || '');
  const d = paymentRow?.data || {};

  const hostUserId = String(d?.hostUser || '');
  const attendeeId = String(d?.attendee || '');
  const eventId = String(d?.event || '');
  const currency = String(d?.currency || 'INR');

  const grossPaise = safeNumber(d?.amount);
  const commissionPaise = safeNumber(d?.platformCommission?.amountPaise);

  if (!paymentId || !hostUserId || !eventId) {
    return;
  }

  const createdAt = new Date().toISOString();

  const reversalGrossKind: WalletEntryKind = 'reversal_gross_credit';
  const reversalCommissionKind: WalletEntryKind = 'reversal_commission_debit';

  if (grossPaise > 0) {
    const has = await existsEntry(hostUserId, paymentId, reversalGrossKind);
    if (!has) {
      await insertEntry(hostUserId, {
        entryKind: reversalGrossKind,
        direction: 'debit',
        amountPaise: Math.max(0, Math.round(grossPaise)),
        currency,
        sourceType: 'event_ticket',
        sourceId: paymentId,
        eventId,
        hostUserId,
        attendeeId,
        meta: {
          refund: {
            refundStatus: d?.refundStatus || null,
            refundedAt: d?.refundedAt || null,
            refundReason: d?.refundReason || null,
          },
        },
        createdAt,
      });
    }
  }

  if (commissionPaise > 0) {
    const has = await existsEntry(hostUserId, paymentId, reversalCommissionKind);
    if (!has) {
      await insertEntry(hostUserId, {
        entryKind: reversalCommissionKind,
        direction: 'credit',
        amountPaise: Math.max(0, Math.round(commissionPaise)),
        currency,
        sourceType: 'event_ticket',
        sourceId: paymentId,
        eventId,
        hostUserId,
        attendeeId,
        meta: {
          refund: {
            refundStatus: d?.refundStatus || null,
            refundedAt: d?.refundedAt || null,
            refundReason: d?.refundReason || null,
          },
        },
        createdAt,
      });
    }
  }
};
