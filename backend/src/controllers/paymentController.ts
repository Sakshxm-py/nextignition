import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { supabase } from '../utils/supabase';
import { getPrice, getBundlePrice, RoleName, PlanTier, BillingCycle } from '../utils/subscriptionPlans';

interface AuthRequest extends Request {
  user?: any; // Contains { id: string }
}

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

export const getRazorpayKey = async (req: Request, res: Response) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
};

export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle(); // maybeSingle is safer than single() for potentially missing rows

    if (userError) {
      console.warn("Supabase user fetch error (non-fatal):", userError);
    }

    const userData = (userRow as any)?.data || {};
    const userPlans = {
      founder: (userRow as any)?.founder_plan || userData?.founder_plan || 'free',
      expert: (userRow as any)?.expert_plan || userData?.expert_plan || 'free',
      investor: (userRow as any)?.investor_plan || userData?.investor_plan || 'free',
    };

    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (subError) {
      console.warn('[Payments] subscriptions fetch failed in status endpoint:', subError.message);
    }

    res.json({ 
      userPlans,
      activeSubscriptions: subscriptions || []
    });
  } catch (error: any) {
    console.error("Critical error in getSubscriptionStatus:", error);
    // Even on critical error, return a default 'free' state to keep the UI running
    res.json({ 
      userPlans: { founder: 'free', expert: 'free', investor: 'free' },
      activeSubscriptions: []
    });
  }
};

export const razorpayWebhook = async (req: RawBodyRequest, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    const signature = String(req.headers['x-razorpay-signature'] || '');
    if (!signature) {
      return res.status(400).json({ message: 'Missing webhook signature' });
    }

    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      return res.status(400).json({ message: 'Missing raw body for signature verification' });
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
    if (signature !== expected) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = String(event?.event || '');

    // We link payments to subscriptions via razorpay_payment_id / razorpay_order_id
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.order_id || orderEntity?.id;

    if ((eventType === 'payment.failed' || eventType === 'payment.captured' || eventType === 'payment.authorized') && (!paymentId && !orderId)) {
      return res.status(200).json({ ok: true });
    }

    if (eventType === 'payment.failed') {
      // Mark subscription row failed if we already created one (rare with current flow)
      if (paymentId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('razorpay_payment_id', paymentId);
      }
      return res.status(200).json({ ok: true });
    }

    // With current design, we activate in /verify and /bundle-verify.
    // Webhooks are still useful as a safety net.
    if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
      const updates: any = { updated_at: new Date().toISOString() };
      // If subscription exists, ensure active.
      updates.status = 'active';

      if (paymentId) {
        await supabase
          .from('subscriptions')
          .update(updates)
          .eq('razorpay_payment_id', paymentId);
      } else if (orderId) {
        await supabase
          .from('subscriptions')
          .update(updates)
          .eq('razorpay_order_id', orderId);
      }
      return res.status(200).json({ ok: true });
    }

    // Ignore other events for now
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[RazorpayWebhook] Error:', error);
    return res.status(500).json({ message: 'Webhook handler error' });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { role, planId, billingCycle } = req.body;
    
    if (!role || !planId || !billingCycle) {
      return res.status(400).json({ message: 'Missing require fields: role, planId, billingCycle' });
    }

    const amount = getPrice(role as RoleName, planId as PlanTier, billingCycle as BillingCycle);
    
    // Check verification status before allowing payment for non-free plans
    if (amount > 0) {
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('data')
        .eq('id', req.user.id)
        .single();

      if (userErr || !user?.data?.isVerified) {
        return res.status(403).json({ 
          message: 'Profile Verification Required: Your profile must be verified by an admin before you can make payments. Please complete your profile and wait for approval.' 
        });
      }
    }


    // If it's the free plan, we just update DB directly (no payment)
    if (amount === 0) {
      const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
      const updatedData = {
        ...(userRow?.data || {}),
        [`${role}_plan`]: 'free',
        updatedAt: new Date().toISOString()
      };

      const { error: downgradeErr } = await supabase.from('users').update({
        [`${role}_plan`]: 'free',
        data: updatedData
      }).eq('id', req.user.id);
      if (downgradeErr) {
        console.error('[Payment] Failed to downgrade plan to free:', downgradeErr.message);
        return res.status(500).json({ message: 'Failed to update plan' });
      }

      // Update any active subs for this role to cancelled/expired
      await supabase.from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', req.user.id)
        .eq('role', role)
        .eq('status', 'active');

      return res.json({ ok: true, plan: 'free', message: `Switched ${role} to Free plan` });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: 'Razorpay credentials not configured' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(amount * 100), // Amount in paise, forced to integer
      currency: "INR",
      receipt: `sub_${req.user.id.substring(0, 10)}_${Date.now()}`.substring(0, 40),
    };

    const order = await razorpay.orders.create(options);
    res.json({ ...order, role, planId, billingCycle });

  } catch (error: any) {
    console.error("Error creating Razorpay Order:", error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, role, planId, billingCycle } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: 'Razorpay secret not configured' });
    }

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Bind the granted plan to the amount actually paid. The signature only
    // proves order|payment integrity, NOT the price — without this a user could
    // create a cheap order then claim planId='elite' here and get the top tier
    // for the cheapest price. Re-fetch the order and compare to getPrice().
    if (!process.env.RAZORPAY_KEY_ID) {
      return res.status(500).json({ message: 'Razorpay not configured' });
    }
    {
      const expectedAmount = Math.round(
        getPrice(role as RoleName, planId as PlanTier, billingCycle as BillingCycle) * 100
      );
      let paidOrder: any;
      try {
        const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
        paidOrder = await rzp.orders.fetch(razorpay_order_id);
      } catch (e) {
        return res.status(400).json({ message: 'Could not verify payment order' });
      }
      if (!paidOrder || expectedAmount <= 0 || Number(paidOrder.amount) !== expectedAmount || Number(paidOrder.amount_paid) < expectedAmount) {
        return res.status(400).json({ message: 'Payment amount does not match the selected plan' });
      }
    }

    const expiryDate = new Date();
    if (billingCycle === 'annual') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Record subscription
    await supabase.from('subscriptions').insert({
      user_id: req.user.id,
      role,
      plan: planId,
      billing_cycle: billingCycle,
      status: 'active',
      razorpay_order_id,
      razorpay_payment_id,
      expires_at: expiryDate.toISOString()
    });

    // Cancel old active subs for this role
    await supabase.from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', req.user.id)
        .eq('role', role)
        .eq('status', 'active')
        .neq('razorpay_order_id', razorpay_order_id);

    // Update fast lookup and data JSONB on user
    const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
    const updatedData = {
        ...(userRow?.data || {}),
        [`${role}_plan`]: planId,
        updatedAt: new Date().toISOString()
    };

    const { error: planErr } = await supabase.from('users').update({
        [`${role}_plan`]: planId,
        data: updatedData
    }).eq('id', req.user.id);
    if (planErr) {
        // The subscription row is already recorded above, but the user's
        // entitlement failed to persist — surface it instead of silently
        // leaving a paid user on the free tier.
        console.error('[Payment] Failed to activate plan entitlement after payment:', planErr.message);
        return res.status(500).json({ message: 'Payment recorded but plan activation failed. Please contact support.' });
    }

    res.json({ ok: true, message: 'Payment verified successfully and subscription activated' });

  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: 'Internal Server Error during verification' });
  }
};

/**
 * RevenueCat server-to-server webhook for StoreKit In-App Purchases (iOS).
 * RevenueCat POSTs subscription lifecycle events here; we flip a dedicated
 * `data.iapPremium` flag on the user (we DON'T touch the web `*_plan` columns,
 * so a web Pro/Elite user is never reset by an IAP expiry). Verified by a shared
 * secret in the Authorization header (set in RevenueCat → Integrations → Webhooks).
 * NOT user-authenticated. The app sets RevenueCat appUserID = our user id.
 */
export const revenuecatWebhook = async (req: Request, res: Response) => {
  try {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const auth = String(req.headers['authorization'] || '');
    if (!secret || (auth !== secret && auth !== `Bearer ${secret}`)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const event = (req.body && req.body.event) || null;
    const type = String(event?.type || '').toUpperCase();
    const userId = event?.app_user_id;

    // RevenueCat test pings and anonymous/unknown ids — just acknowledge.
    if (!event || type === 'TEST' || !userId) {
      return res.status(200).json({ ok: true });
    }

    // CANCELLATION = auto-renew off but still active until EXPIRATION (do NOT revoke).
    // BILLING_ISSUE = grace period — wait for EXPIRATION. TRANSFER handled as no-op for now.
    const GRANT = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED'];
    const REVOKE = ['EXPIRATION', 'SUBSCRIPTION_PAUSED'];
    let premium: boolean | null = null;
    if (GRANT.includes(type)) premium = true;
    else if (REVOKE.includes(type)) premium = false;
    if (premium === null) return res.status(200).json({ ok: true });

    const { data: userRow } = await supabase.from('users').select('data').eq('id', userId).single();
    if (!userRow) {
      console.warn('[RevenueCat] webhook for unknown user', userId);
      return res.status(200).json({ ok: true }); // ack so RC doesn't retry forever
    }

    const updatedData = {
      ...(userRow.data || {}),
      iapPremium: premium,
      iapPremiumUpdatedAt: new Date().toISOString(),
      ...(event.expiration_at_ms ? { iapPremiumExpiresAt: new Date(Number(event.expiration_at_ms)).toISOString() } : {}),
    };
    const { error } = await supabase.from('users').update({ data: updatedData }).eq('id', userId);
    if (error) {
      console.error('[RevenueCat] failed to update user', userId, error.message);
      return res.status(500).json({ message: 'Update failed' });
    }
    console.log(`[RevenueCat] ${type} -> user ${userId} iapPremium=${premium}`);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[RevenueCat webhook] error:', error?.message);
    return res.status(500).json({ message: 'Webhook error' });
  }
};

export const createBundleOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { roles, billingCycle } = req.body;
    
    if (!roles || !Array.isArray(roles) || roles.length < 2 || !billingCycle) {
      return res.status(400).json({ message: 'Invalid bundle details' });
    }

    const amount = getBundlePrice(roles, billingCycle as BillingCycle);
    
    if (amount > 0) {
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('data')
        .eq('id', req.user.id)
        .single();

      if (userErr || !user?.data?.isVerified) {
        return res.status(403).json({ 
          message: 'Profile Verification Required: Your profile must be verified by an admin before you can make payments. Please complete your profile and wait for approval.' 
        });
      }
    }

    if (amount === 0) {
      return res.status(400).json({ message: 'Bundle amount is 0, invalid plans' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `bundle_${req.user.id.substring(0, 8)}_${Date.now()}`.substring(0, 40),
    };

    const order = await razorpay.orders.create(options);
    res.json({ ...order, roles, billingCycle, isBundle: true });

  } catch (error: any) {
    console.error("Error creating Bundle Order:", error);
    res.status(500).json({ message: 'Failed to create bundle order' });
  }
};

export const verifyBundlePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, roles, billingCycle } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Bind the granted bundle to the amount actually paid (see verifyPayment).
    if (!process.env.RAZORPAY_KEY_ID) {
      return res.status(500).json({ message: 'Razorpay not configured' });
    }
    {
      const expectedAmount = Math.round(getBundlePrice(roles, billingCycle as BillingCycle) * 100);
      let paidOrder: any;
      try {
        const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
        paidOrder = await rzp.orders.fetch(razorpay_order_id);
      } catch (e) {
        return res.status(400).json({ message: 'Could not verify payment order' });
      }
      if (!paidOrder || expectedAmount <= 0 || Number(paidOrder.amount) !== expectedAmount || Number(paidOrder.amount_paid) < expectedAmount) {
        return res.status(400).json({ message: 'Payment amount does not match the selected bundle' });
      }
    }

    const expiryDate = new Date();
    if (billingCycle === 'annual') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Insert all subscriptions
    const subRows = roles.map((r: any) => ({
      user_id: req.user.id,
      role: r.role,
      plan: r.plan,
      billing_cycle: billingCycle,
      status: 'active',
      razorpay_order_id,
      razorpay_payment_id,
      expires_at: expiryDate.toISOString(),
      is_bundle: true
    }));

    await supabase.from('subscriptions').insert(subRows);

    // Cancel old active subs for these roles
    const roleNames = roles.map((r: any) => r.role);
    await supabase.from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', req.user.id)
        .in('role', roleNames)
        .eq('status', 'active')
        .neq('razorpay_order_id', razorpay_order_id);

    // Update users fast lookup and data JSONB
    const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
    const userUpdates: any = { data: { ...(userRow?.data || {}), updatedAt: new Date().toISOString() } };
    
    for (const r of roles) {
      userUpdates[`${r.role}_plan`] = r.plan;
      userUpdates.data[`${r.role}_plan`] = r.plan;
    }
    
    await supabase.from('users').update(userUpdates).eq('id', req.user.id);
    
    res.json({ ok: true, message: 'Bundle Payment verified successfully' });

  } catch (error: any) {
    console.error("Error verifying bundle payment:", error);
    res.status(500).json({ message: 'Internal Server Error during bundle verification' });
  }
};

export const createEventTicketOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ message: 'Event ID required' });

    const { data: eventRow, error: eventErr } = await supabase
      .from('events')
      .select('id, data')
      .eq('id', eventId)
      .single();

    if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

    const eventData = eventRow.data;
    if (eventData.priceType !== 'paid') {
      return res.status(400).json({ message: 'This event is free' });
    }

    const amount = Number(eventData.priceAmount || 0);
    if (amount <= 0) return res.status(400).json({ message: 'Invalid event price' });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const options = {
      amount: Math.round(amount * 100),
      currency: eventData.currency || "INR",
      receipt: `event_${eventId.substring(0, 8)}_${req.user.id.substring(0, 8)}`,
      notes: {
        eventId,
        userId: req.user.id,
        type: 'event_ticket'
      }
    };

    const order = await razorpay.orders.create(options);
    res.json({ ...order, eventId });

  } catch (error: any) {
    console.error("Error creating Event Ticket Order:", error);
    res.status(500).json({ message: 'Failed to create ticket order' });
  }
};

export const verifyEventTicketPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Get event data to verify price
    const { data: eventRow } = await supabase.from('events').select('data').eq('id', eventId).single();
    const amountPaid = Number(eventRow?.data?.priceAmount || 0);

    // Record registration in new table
    await supabase.from('event_registrations').insert({
      event_id: eventId,
      user_id: req.user.id,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount_paid: amountPaid,
      status: 'successful'
    });

    // Also update the main events table registeredUsers array (legacy support)
    const registeredUsers = eventRow?.data?.registeredUsers || [];
    if (!registeredUsers.includes(req.user.id)) {
      registeredUsers.push(req.user.id);
      await supabase.from('events').update({
        data: { ...eventRow?.data, registeredUsers }
      }).eq('id', eventId);
    }

    res.json({ ok: true, message: 'Ticket purchased successfully' });

  } catch (error: any) {
    console.error("Error verifying event ticket payment:", error);
    res.status(500).json({ message: 'Failed to verify ticket payment' });
  }
};
