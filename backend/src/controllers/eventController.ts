import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { uploadPublicFile } from '../utils/storage';
import { recordEventTicketPaidToWallet, recordEventTicketRefundToWallet } from '../utils/walletLedger';

const parseCommaList = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean);
    return String(value)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
};

const DEFAULT_COMMISSION_PERCENT = Math.max(0, Number(process.env.EVENT_COMMISSION_PERCENT || 10));
const DEFAULT_COMMISSION_FIXED_PAISE = Math.max(0, Number(process.env.EVENT_COMMISSION_FIXED_PAISE || 0));
const DEFAULT_REFUND_CUTOFF_HOURS = Math.max(0, Number(process.env.EVENT_REFUND_CUTOFF_HOURS || 24));
const DEFAULT_PAYOUT_DELAY_DAYS = Math.max(0, Number(process.env.EVENT_PAYOUT_DELAY_DAYS || 3));

const toPaise = (amount: number) => Math.round(Math.max(0, amount) * 100);

const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const getCommissionInPaise = (grossPaise: number) => {
    const percentPart = Math.round((grossPaise * DEFAULT_COMMISSION_PERCENT) / 100);
    const fixedPart = DEFAULT_COMMISSION_FIXED_PAISE;
    const commission = Math.min(grossPaise, percentPart + fixedPart);
    return Math.max(0, commission);
};

const isPaidEvent = (eventData: any) => String(eventData?.priceType || 'free') === 'paid' && Number(eventData?.priceAmount || 0) > 0;

const getEventAmountPaise = (eventData: any) => toPaise(Number(eventData?.priceAmount || 0));

const getKycFlags = (userRow: any) => {
    const data = userRow?.data || {};
    const isVerified = Boolean(data.isVerified || userRow?.isVerified);
    const phoneVerified = Boolean(data.phoneVerified || userRow?.phoneVerified);
    const identityVerified = Boolean(data.identityVerified || userRow?.identityVerified);
    return { isVerified, phoneVerified, identityVerified };
};

const hasRequiredKycForPaidEvents = (userRow: any) => {
    const { isVerified, phoneVerified, identityVerified } = getKycFlags(userRow);
    return isVerified && phoneVerified && identityVerified;
};

const getPaymentData = (row: any) => row?.data || {};

const hasActivePaidTicket = (rows: any[]) => {
    return (rows || []).some((row: any) => {
        const data = getPaymentData(row);
        return data?.paymentStatus === 'paid' && data?.refundStatus !== 'completed';
    });
};

const getRazorpayClient = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

async function populateHostUser(eventRows: any[]) {
    if (!eventRows || !eventRows.length) return eventRows;
    const hostUserIds = [...new Set(eventRows.map(e => e.data?.hostUser).filter(Boolean))];
    const usersMap = new Map();
    
    if (hostUserIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, data').in('id', hostUserIds);
        (usersData || []).forEach(u => {
            usersMap.set(u.id, {
                _id: u.id,
                name: u.data?.name,
                role: u.data?.role,
                avatar: u.data?.avatar,
                isVerified: u.data?.isVerified
            });
        });
    }

    return eventRows.map(e => ({
        ...e.data,
        _id: e.id,
        id: e.id,
        hostUser: usersMap.get(e.data?.hostUser) || e.data?.hostUser,
        createdAt: e.created_at,
        updatedAt: e.updated_at
    }));
}

// GET /api/events
export const listEvents = async (req: Request, res: Response) => {
    try {
        const { status, type, q, hostType } = req.query as {
            status?: string;
            type?: string;
            q?: string;
            hostType?: 'platform' | 'expert' | 'investor';
        };

        let query = supabase.from('events').select('id, data, created_at, updated_at');
        if (status) query = query.filter('data->>status', 'eq', status);
        if (type) query = query.filter('data->>type', 'eq', type);
        if (hostType) query = query.filter('data->>hostType', 'eq', hostType);

        let { data: eventsData, error } = await query;
        if (error) throw error;

        let events = eventsData || [];
        
        if (q) {
            const lowerQ = q.toLowerCase();
            events = events.filter(e => {
                const title = (e.data?.title || '').toLowerCase();
                const desc = (e.data?.description || '').toLowerCase();
                const tags = (e.data?.tags || []).map((t: string) => t.toLowerCase());
                return title.includes(lowerQ) || desc.includes(lowerQ) || tags.some((t: string) => t.includes(lowerQ));
            });
        }

        events.sort((a, b) => new Date(a.data?.startAt || 0).getTime() - new Date(b.data?.startAt || 0).getTime());
        events = events.slice(0, 100);

        const populated = await populateHostUser(events);
        res.json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/events/mine?mode=attending|hosting
export const listMyEvents = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const mode = (req.query.mode as string) || 'attending';

        let query = supabase.from('events').select('id, data, created_at, updated_at');
        if (mode === 'hosting') {
            query = query.filter('data->>hostUser', 'eq', userId);
        } else {
            query = query.filter('data->registeredUsers', 'cs', `["${userId}"]`);
        }

        let { data: eventsData, error } = await query;
        if (error) throw error;

        let events = eventsData || [];
        events.sort((a, b) => new Date(a.data?.startAt || 0).getTime() - new Date(b.data?.startAt || 0).getTime());
        events = events.slice(0, 100);

        const populated = await populateHostUser(events);
        res.json(populated);
    } catch (error: any) {
        console.error('API Error in listMyEvents:', error);
        res.status(500).json({ message: 'Server error from listMyEvents', error: error.message || error.toString(), stack: error.stack });
    }
};

// POST /api/events - Elite subscription required (admins bypass)
export const createEvent = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user.role as string;
        const userId = req.user.id as string;

        const isAdmin = userRole === 'admin';
        const isFounder = userRole === 'founder';
        const isExpert = userRole === 'expert';
        const isInvestor = userRole === 'investor';

        if (!isAdmin && !isFounder && !isExpert && !isInvestor) {
            return res.status(403).json({ message: 'Not authorized to create events' });
        }

        // ── Subscription gate: only Elite / StoreKit-Premium users may host events ──
        if (!isAdmin) {
            // Plan tiers are stored as top-level columns in the users table.
            // Some older DB deployments may not have these columns yet, so we fall back to JSONB.
            let userRow: any = null;
            {
                const res1 = await supabase
                    .from('users')
                    .select('data, founder_plan, expert_plan, investor_plan')
                    .eq('id', userId)
                    .single();

                if (res1.error) {
                    const msg = String(res1.error?.message || '').toLowerCase();
                    const looksLikeMissingColumn = msg.includes('column') || msg.includes('founder_plan') || msg.includes('expert_plan') || msg.includes('investor_plan');
                    if (looksLikeMissingColumn) {
                        const res2 = await supabase.from('users').select('data').eq('id', userId).single();
                        if (res2.error || !res2.data) {
                            return res.status(403).json({ message: 'Could not verify subscription. Please try again.' });
                        }
                        userRow = res2.data;
                    } else {
                        return res.status(403).json({ message: 'Could not verify subscription. Please try again.' });
                    }
                } else {
                    userRow = res1.data;
                }
            }

            if (!userRow) {
                return res.status(403).json({ message: 'Could not verify subscription. Please try again.' });
            }

            const planKey = `${userRole}_plan` as 'founder_plan' | 'expert_plan' | 'investor_plan';
            const userPlan: string = userRow?.[planKey] || userRow.data?.[planKey] || 'free';
            const iapPremium = userRow?.data?.iapPremium === true;

            if (!iapPremium && userPlan !== 'elite') {
                return res.status(403).json({
                    message: `Hosting events requires an Elite subscription. You are currently on the ${userPlan} plan. Please upgrade to Elite to host events.`,
                    requiresUpgrade: true,
                    currentPlan: userPlan,
                    requiredPlan: 'elite',
                });
            }

            // Mandatory KYC check for paid events
            if (req.body.priceType === 'paid' && !userRow.data?.isVerified) {
                return res.status(403).json({
                    message: 'ID Verification Required: You must complete your profile verification before hosting a paid event. This ensures platform safety and trust.',
                    requiresVerification: true
                });
            }
        }
        // ─────────────────────────────────────────────────────────────────

        const hostType = isAdmin ? 'platform' : isExpert ? 'expert' : isInvestor ? 'investor' : 'founder';
        const newId = crypto.randomUUID();

        const isPaid = req.body.priceType === 'paid' && Number(req.body.priceAmount || 0) > 0;
        if (isPaid && !isAdmin) {
            const { data: kycUser, error: kycFetchErr } = await supabase
                .from('users')
                .select('id, data, isVerified, phoneVerified, identityVerified')
                .eq('id', userId)
                .single();

            if (kycFetchErr || !kycUser) {
                return res.status(403).json({ message: 'Could not verify KYC status for paid events.' });
            }

            if (!hasRequiredKycForPaidEvents(kycUser)) {
                const kyc = getKycFlags(kycUser);
                return res.status(403).json({
                    message: 'KYC is mandatory to host paid events. Complete email/profile verification, phone verification, and ID verification first.',
                    requiresKyc: true,
                    kyc,
                });
            }
        }

        // Presentation is optional — hosts can upload slides/recordings later.

        const eventData = {
            ...req.body,
            tags: parseCommaList(req.body.tags),
            hostType,
            hostUser: isAdmin ? undefined : userId,
            status: req.body.status || 'draft',
            startAt: new Date(req.body.startAt).toISOString(),
            durationMinutes: req.body.durationMinutes ?? 60,
            format: req.body.format || 'virtual',
            priceType: req.body.priceType || 'free',
            priceAmount: req.body.priceType === 'paid' ? Number(req.body.priceAmount || 0) : undefined,
            currency: req.body.currency || 'INR',
            commissionPolicy: {
                percent: DEFAULT_COMMISSION_PERCENT,
                fixedPaise: DEFAULT_COMMISSION_FIXED_PAISE,
            },
            payoutPolicy: {
                delayDays: DEFAULT_PAYOUT_DELAY_DAYS,
                trigger: 'post_event_completion',
            },
            refundPolicy: {
                attendeeCutoffHours: DEFAULT_REFUND_CUTOFF_HOURS,
                hostCancellation: 'full_refund',
            },
            branding: {
                text: 'Powered by Next Ignition',
                enforced: true,
            },
            registeredUsers: [],
            bookmarkedBy: []
        };

        const { data: row, error } = await supabase.from('events').insert({
            id: newId,
            data: eventData
        }).select().single();

        if (error) throw error;

        const populated = await populateHostUser([row]);
        res.status(201).json(populated[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/events/:id (host/admin)
export const updateEvent = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        const { data: eventRow, error: fetchErr } = await supabase.from('events').select('id, data').eq('id', req.params.id).single();
        if (fetchErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

        const isAdmin = userRole === 'admin';
        const isHost = String(eventRow.data?.hostUser) === userId;
        if (!isAdmin && !isHost) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updates = { ...req.body };
        if (updates.tags !== undefined) {
            updates.tags = parseCommaList(updates.tags);
        }

        const updatedData = { ...eventRow.data, ...updates };
        const { data: updatedRow, error: updateErr } = await supabase.from('events').update({
            data: updatedData,
            updated_at: new Date().toISOString()
        }).eq('id', req.params.id).select().single();

        if (updateErr) throw updateErr;

        const populated = await populateHostUser([updatedRow]);
        res.json(populated[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/events/:id/register
export const registerForEvent = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { data: eventRow, error: fetchErr } = await supabase.from('events').select('id, data').eq('id', req.params.id).single();
        if (fetchErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

        const eventData = eventRow.data;
        const registeredUsers = eventData.registeredUsers || [];
        
        if (eventData.maxAttendees && registeredUsers.length >= eventData.maxAttendees) {
            return res.status(400).json({ message: 'Event is full' });
        }

        // ── Guest access control: limit to 1 event ───────────────────────
        const { data: userRow } = await supabase.from('users').select('data').eq('id', userId).single();
        if (userRow?.data?.isGuest) {
            // Count events this guest is already registered for (excluding current event)
            const { data: allEvents } = await supabase
                .from('events')
                .select('id, data')
                .filter('data->registeredUsers', 'cs', `["${userId}"]`);

            const registeredCount = (allEvents || []).filter(e => e.id !== req.params.id).length;

            if (registeredCount >= (userRow.data.guestEventLimit || 1)) {
                return res.status(403).json({
                    message: 'Guest access is limited to 1 event. Create a full account to attend unlimited events.',
                    isGuestLimitReached: true,
                });
            }
        }
        // ─────────────────────────────────────────────────────────────────

        if (isPaidEvent(eventData)) {
            const { data: paymentRows, error: paymentErr } = await supabase
                .from('payments')
                .select('id, data')
                .eq('data->>flow', 'event_ticket')
                .eq('data->>event', req.params.id)
                .eq('data->>attendee', userId);

            if (paymentErr) throw paymentErr;

            if (!hasActivePaidTicket(paymentRows || [])) {
                return res.status(402).json({
                    message: 'This is a paid event. Complete ticket payment before registering.',
                    requiresTicketPayment: true,
                });
            }
        }

        if (!registeredUsers.includes(userId)) {
            registeredUsers.push(userId);
            
            const { data: updatedRow, error: updateErr } = await supabase.from('events').update({
                data: { ...eventData, registeredUsers },
                updated_at: new Date().toISOString()
            }).eq('id', req.params.id).select().single();

            if (updateErr) throw updateErr;
            const populated = await populateHostUser([updatedRow]);
            return res.json(populated[0]);
        }

        const populated = await populateHostUser([eventRow]);
        res.json(populated[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/events/:id/unregister
export const unregisterFromEvent = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { data: eventRow, error: fetchErr } = await supabase.from('events').select('id, data').eq('id', req.params.id).single();
        if (fetchErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

        const eventData = eventRow.data;
        const registeredUsers = (eventData.registeredUsers || []).filter((u: string) => u !== userId);
        
        const { data: updatedRow, error: updateErr } = await supabase.from('events').update({
            data: { ...eventData, registeredUsers },
            updated_at: new Date().toISOString()
        }).eq('id', req.params.id).select().single();

        if (updateErr) throw updateErr;

        const populated = await populateHostUser([updatedRow]);
        res.json(populated[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/events/:id/bookmark
export const toggleBookmark = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { data: eventRow, error: fetchErr } = await supabase.from('events').select('id, data').eq('id', req.params.id).single();
        if (fetchErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

        const eventData = eventRow.data;
        let bookmarkedBy = eventData.bookmarkedBy || [];

        if (bookmarkedBy.includes(userId)) {
            bookmarkedBy = bookmarkedBy.filter((u: string) => u !== userId);
        } else {
            bookmarkedBy.push(userId);
        }

        const { data: updatedRow, error: updateErr } = await supabase.from('events').update({
            data: { ...eventData, bookmarkedBy },
            updated_at: new Date().toISOString()
        }).eq('id', req.params.id).select().single();

        if (updateErr) throw updateErr;

        const populated = await populateHostUser([updatedRow]);
        res.json(populated[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/events/:id/attendees
export const getEventAttendees = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data: eventRow, error } = await supabase.from('events').select('data').eq('id', id).single();
        if (error || !eventRow) return res.status(404).json({ message: 'Event not found' });

        const registeredUsers = eventRow.data.registeredUsers || [];
        if (registeredUsers.length === 0) return res.json([]);

        const { data: usersData } = await supabase.from('users').select('id, data').in('id', registeredUsers);
        
        const attendees = (usersData || []).map(u => ({
            _id: u.id,
            name: u.data?.name || 'Unknown User',
            avatar: u.data?.avatar,
            role: u.data?.role
        }));

        res.json(attendees);
    } catch (error) {
        console.error('getEventAttendees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getExtFromFileName = (fileName: string | undefined) => {
    const safe = String(fileName || '').trim();
    const match = safe.match(/\.([a-zA-Z0-9]{1,10})$/);
    return match ? match[1].toLowerCase() : 'pdf';
};

export const uploadPresentation = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const { data: eventRow, error } = await supabase.from('events').select('id, data').eq('id', id).single();
        if (error || !eventRow) return res.status(404).json({ message: 'Event not found' });

        if (eventRow.data.hostUser !== req.user.id) {
            return res.status(403).json({ message: 'Only the host can upload a presentation' });
        }

        const ext = getExtFromFileName(file.originalname);
        const objectPath = `presentations/${id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        
        const uploaded = await uploadPublicFile({
            bucket: process.env.PROFILE_PICS_BUCKET || 'profile-pics',
            objectPath,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        const presentationUrl = uploaded.publicUrl;
        const updatedData = { ...eventRow.data, presentationUrl, updatedAt: new Date().toISOString() };
        await supabase.from('events').update({ data: updatedData }).eq('id', id);

        return res.json({ presentationUrl });
    } catch (error: any) {
        console.error('Presentation upload error:', error);
        return res.status(500).json({ message: 'Presentation upload failed' });
    }
};

export const uploadPresentationPreEvent = async (req: AuthRequest, res: Response) => {
    try {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const ext = getExtFromFileName(file.originalname);
        const objectPath = `presentations/temp/${req.user.id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        
        const uploaded = await uploadPublicFile({
            bucket: process.env.PROFILE_PICS_BUCKET || 'profile-pics',
            objectPath,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        return res.json({ presentationUrl: uploaded.publicUrl });
    } catch (error: any) {
        console.error('Presentation upload error:', error);
        return res.status(500).json({ message: 'Presentation upload failed' });
    }
};

const assertHostOrAdmin = (eventRow: any, req: AuthRequest, res: Response): boolean => {
    const isAdmin = req.user?.role === 'admin';
    const isHost = String(eventRow?.data?.hostUser || '') === String(req.user?.id || '');
    if (!isAdmin && !isHost) {
        res.status(403).json({ message: 'Not authorized' });
        return false;
    }
    return true;
};

export const createTicketOrder = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const eventId = String(req.params.id || '');

        const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, data').eq('id', eventId).single();
        if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

        if (!isPaidEvent(eventRow.data)) {
            return res.status(400).json({ message: 'This event is free. No ticket payment required.' });
        }

        if (String(eventRow.data?.hostUser || '') === String(userId)) {
            return res.status(400).json({ message: 'Host cannot buy a ticket for own event' });
        }

        const { data: previousRows, error: previousErr } = await supabase
            .from('payments')
            .select('id, data')
            .eq('data->>flow', 'event_ticket')
            .eq('data->>event', eventId)
            .eq('data->>attendee', userId);
        if (previousErr) throw previousErr;

        if (hasActivePaidTicket(previousRows || [])) {
            return res.status(200).json({ alreadyPaid: true, message: 'Ticket already purchased' });
        }

        const grossAmountPaise = getEventAmountPaise(eventRow.data);
        const commissionAmountPaise = getCommissionInPaise(grossAmountPaise);
        const hostSettlementAmountPaise = Math.max(0, grossAmountPaise - commissionAmountPaise);
        const localOrderId = `evt_${eventId.slice(0, 8)}_${Date.now()}`;
        const razorpay = getRazorpayClient();

        let gatewayOrder: any = null;
        if (razorpay) {
            gatewayOrder = await razorpay.orders.create({
                amount: grossAmountPaise,
                currency: eventRow.data?.currency || 'INR',
                receipt: localOrderId.slice(0, 40),
            });
        }

        const paymentId = crypto.randomUUID();
        const paymentData = {
            flow: 'event_ticket',
            purpose: 'event_ticket',
            event: eventId,
            eventTitle: eventRow.data?.title,
            attendee: userId,
            hostUser: eventRow.data?.hostUser,
            amount: grossAmountPaise,
            currency: eventRow.data?.currency || 'INR',
            paymentStatus: 'order_created',
            payoutStatus: 'escrow',
            refundStatus: 'none',
            platformCommission: {
                percent: DEFAULT_COMMISSION_PERCENT,
                fixedPaise: DEFAULT_COMMISSION_FIXED_PAISE,
                amountPaise: commissionAmountPaise,
            },
            hostSettlementAmountPaise,
            localOrderId,
            razorpayOrderId: gatewayOrder?.id,
            createdAt: new Date().toISOString(),
            branding: { text: 'Powered by Next Ignition', enforced: true },
        };

        const { error: insertErr } = await supabase.from('payments').insert({
            id: paymentId,
            data: paymentData,
        });
        if (insertErr) throw insertErr;

        return res.json({
            checkoutMode: gatewayOrder ? 'razorpay' : 'manual',
            amount: grossAmountPaise,
            currency: eventRow.data?.currency || 'INR',
            orderId: gatewayOrder?.id || localOrderId,
            localOrderId,
            key: process.env.RAZORPAY_KEY_ID || null,
            commission: {
                amountPaise: commissionAmountPaise,
                hostSettlementAmountPaise,
            },
        });
    } catch (error: any) {
        console.error('createTicketOrder error:', error);
        return res.status(500).json({ message: 'Failed to create ticket order' });
    }
};

export const verifyTicketPayment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const eventId = String(req.params.id || '');
        const {
            orderId,
            localOrderId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            manual = false,
        } = req.body || {};

        const resolvedOrderId = razorpay_order_id || orderId;
        const resolvedLocalOrder = localOrderId || orderId;

        const { data: paymentRows, error: paymentErr } = await supabase
            .from('payments')
            .select('id, data')
            .eq('data->>flow', 'event_ticket')
            .eq('data->>event', eventId)
            .eq('data->>attendee', userId);
        if (paymentErr) throw paymentErr;

        const paymentRow = (paymentRows || []).find((row: any) => {
            const d = getPaymentData(row);
            return d?.razorpayOrderId === resolvedOrderId || d?.localOrderId === resolvedLocalOrder;
        });

        if (!paymentRow) return res.status(404).json({ message: 'Ticket order not found' });
        if (paymentRow.data?.paymentStatus === 'paid') {
            return res.json({ ok: true, message: 'Ticket already verified' });
        }

        if (!manual) {
            if (!process.env.RAZORPAY_KEY_SECRET) {
                return res.status(500).json({ message: 'Payment gateway secret not configured' });
            }
            const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(sign).digest('hex');
            if (expected !== razorpay_signature) {
                return res.status(400).json({ message: 'Invalid payment signature' });
            }
        }

        const updatedData = {
            ...paymentRow.data,
            paymentStatus: 'paid',
            paidAt: new Date().toISOString(),
            razorpayPaymentId: razorpay_payment_id || paymentRow.data?.razorpayPaymentId,
            razorpaySignature: razorpay_signature || paymentRow.data?.razorpaySignature,
            ticket: {
                reference: `NI-TKT-${eventId.slice(0, 6).toUpperCase()}-${String(Date.now()).slice(-6)}`,
                issuedAt: new Date().toISOString(),
                brandText: 'Powered by Next Ignition',
            },
        };

        const { error: updateErr } = await supabase.from('payments').update({
            data: updatedData,
            updated_at: new Date().toISOString(),
        }).eq('id', paymentRow.id);
        if (updateErr) throw updateErr;

        try {
            await recordEventTicketPaidToWallet({ id: paymentRow.id, data: updatedData });
        } catch (e: any) {
            console.error('[WalletLedger] Failed to record ticket payment:', e?.message || e);
        }

        const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, data').eq('id', eventId).single();
        if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

        const registeredUsers = eventRow.data?.registeredUsers || [];
        if (!registeredUsers.includes(userId)) {
            registeredUsers.push(userId);
            const { error: regErr } = await supabase.from('events').update({
                data: { ...eventRow.data, registeredUsers },
                updated_at: new Date().toISOString(),
            }).eq('id', eventId);
            if (regErr) throw regErr;
        }

        return res.json({ ok: true, message: 'Ticket payment verified and registration completed' });
    } catch (error: any) {
        console.error('verifyTicketPayment error:', error);
        return res.status(500).json({ message: 'Failed to verify ticket payment' });
    }
};

export const requestTicketRefund = async (req: AuthRequest, res: Response) => {
    try {
        const eventId = String(req.params.id || '');
        const userId = req.user.id;
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'user_requested';

        const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, data').eq('id', eventId).single();
        if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });

        const isAdmin = req.user.role === 'admin';
        const isHost = String(eventRow.data?.hostUser || '') === String(userId);
        const attendeeId = isHost || isAdmin ? String(req.body?.attendeeId || '') : userId;
        if (!attendeeId) return res.status(400).json({ message: 'attendeeId is required' });

        if (!isAdmin && !isHost) {
            const eventStart = new Date(eventRow.data?.startAt || 0).getTime();
            const cutoff = eventStart - DEFAULT_REFUND_CUTOFF_HOURS * 60 * 60 * 1000;
            if (Date.now() > cutoff && eventRow.data?.status !== 'cancelled') {
                return res.status(400).json({ message: `Refund window closed (${DEFAULT_REFUND_CUTOFF_HOURS}h before event)` });
            }
        }

        const { data: paymentRows, error: payErr } = await supabase
            .from('payments')
            .select('id, data')
            .eq('data->>flow', 'event_ticket')
            .eq('data->>event', eventId)
            .eq('data->>attendee', attendeeId);
        if (payErr) throw payErr;

        const paidRow = (paymentRows || []).find((row: any) => {
            const d = getPaymentData(row);
            return d?.paymentStatus === 'paid' && d?.refundStatus !== 'completed';
        });

        if (!paidRow) return res.status(404).json({ message: 'No refundable paid ticket found' });

        const rzpPaymentId = paidRow.data?.razorpayPaymentId;
        const razorpay = getRazorpayClient();
        if (razorpay && rzpPaymentId) {
            await razorpay.payments.refund(rzpPaymentId, {
                amount: Number(paidRow.data?.amount || 0),
                speed: 'normal',
                notes: { eventId, reason },
            });
        }

        const refundedData = {
            ...paidRow.data,
            paymentStatus: 'refunded',
            refundStatus: 'completed',
            refundReason: reason,
            refundedBy: userId,
            refundedAt: new Date().toISOString(),
            payoutStatus: 'on_hold',
        };

        const { error: updErr } = await supabase.from('payments').update({
            data: refundedData,
            updated_at: new Date().toISOString(),
        }).eq('id', paidRow.id);
        if (updErr) throw updErr;

        try {
            await recordEventTicketRefundToWallet({ id: paidRow.id, data: refundedData });
        } catch (e: any) {
            console.error('[WalletLedger] Failed to record ticket refund:', e?.message || e);
        }

        const registeredUsers = (eventRow.data?.registeredUsers || []).filter((u: string) => String(u) !== attendeeId);
        const { error: eventUpdateErr } = await supabase.from('events').update({
            data: { ...eventRow.data, registeredUsers },
            updated_at: new Date().toISOString(),
        }).eq('id', eventId);
        if (eventUpdateErr) throw eventUpdateErr;

        return res.json({ ok: true, message: 'Refund processed successfully' });
    } catch (error: any) {
        console.error('requestTicketRefund error:', error);
        return res.status(500).json({ message: 'Failed to process refund' });
    }
};

export const cancelEvent = async (req: AuthRequest, res: Response) => {
    try {
        const eventId = String(req.params.id || '');
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'host_cancelled';

        const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, data').eq('id', eventId).single();
        if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });
        if (!assertHostOrAdmin(eventRow, req, res)) return;

        const canceledData = {
            ...eventRow.data,
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
            cancelledBy: req.user.id,
        };

        const { error: cancelErr } = await supabase.from('events').update({
            data: canceledData,
            updated_at: new Date().toISOString(),
        }).eq('id', eventId);
        if (cancelErr) throw cancelErr;

        const { data: paymentRows, error: paymentErr } = await supabase
            .from('payments')
            .select('id, data')
            .eq('data->>flow', 'event_ticket')
            .eq('data->>event', eventId);
        if (paymentErr) throw paymentErr;

        for (const row of paymentRows || []) {
            const d = getPaymentData(row);
            if (d?.paymentStatus !== 'paid' || d?.refundStatus === 'completed') continue;
            const refunded = {
                ...d,
                paymentStatus: 'refunded',
                refundStatus: 'completed',
                refundReason: 'event_cancelled',
                refundedBy: req.user.id,
                refundedAt: new Date().toISOString(),
                payoutStatus: 'on_hold',
            };
            const { error } = await supabase.from('payments').update({
                data: refunded,
                updated_at: new Date().toISOString(),
            }).eq('id', row.id);
            if (error) throw error;

            try {
                await recordEventTicketRefundToWallet({ id: row.id, data: refunded });
            } catch (e: any) {
                console.error('[WalletLedger] Failed to record cancel refund:', e?.message || e);
            }
        }

        return res.json({ ok: true, message: 'Event cancelled and attendee refunds processed' });
    } catch (error: any) {
        console.error('cancelEvent error:', error);
        return res.status(500).json({ message: 'Failed to cancel event' });
    }
};

export const completeEventAndOpenPayouts = async (req: AuthRequest, res: Response) => {
    try {
        const eventId = String(req.params.id || '');
        const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, data').eq('id', eventId).single();
        if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });
        if (!assertHostOrAdmin(eventRow, req, res)) return;

        const completedData = {
            ...eventRow.data,
            status: 'completed',
            completedAt: new Date().toISOString(),
            completedBy: req.user.id,
        };

        const { error: completeErr } = await supabase.from('events').update({
            data: completedData,
            updated_at: new Date().toISOString(),
        }).eq('id', eventId);
        if (completeErr) throw completeErr;

        const { data: paymentRows, error: paymentErr } = await supabase
            .from('payments')
            .select('id, data')
            .eq('data->>flow', 'event_ticket')
            .eq('data->>event', eventId);
        if (paymentErr) throw paymentErr;

        const payoutEligibilityAt = addDays(new Date(), DEFAULT_PAYOUT_DELAY_DAYS).toISOString();
        for (const row of paymentRows || []) {
            const d = getPaymentData(row);
            if (d?.paymentStatus !== 'paid' || d?.refundStatus === 'completed' || d?.payoutStatus !== 'escrow') continue;
            const eligibleData = {
                ...d,
                payoutStatus: 'eligible',
                payoutEligibleAt: payoutEligibilityAt,
            };
            const { error } = await supabase.from('payments').update({
                data: eligibleData,
                updated_at: new Date().toISOString(),
            }).eq('id', row.id);
            if (error) throw error;
        }

        return res.json({ ok: true, message: `Event marked completed. Payouts become eligible after ${DEFAULT_PAYOUT_DELAY_DAYS} day(s).` });
    } catch (error: any) {
        console.error('completeEventAndOpenPayouts error:', error);
        return res.status(500).json({ message: 'Failed to complete event' });
    }
};

export const releaseHostPayout = async (req: AuthRequest, res: Response) => {
    try {
        const eventId = String(req.params.id || '');
        const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, data').eq('id', eventId).single();
        if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });
        if (!assertHostOrAdmin(eventRow, req, res)) return;

        const now = new Date();
        const isAdmin = req.user.role === 'admin';
        const { data: paymentRows, error: paymentErr } = await supabase
            .from('payments')
            .select('id, data')
            .eq('data->>flow', 'event_ticket')
            .eq('data->>event', eventId);
        if (paymentErr) throw paymentErr;

        let releasedCount = 0;
        for (const row of paymentRows || []) {
            const d = getPaymentData(row);
            if (d?.paymentStatus !== 'paid' || d?.refundStatus === 'completed') continue;
            if (d?.payoutStatus !== 'eligible' && d?.payoutStatus !== 'escrow') continue;

            const eligibleAt = d?.payoutEligibleAt ? new Date(d.payoutEligibleAt) : addDays(new Date(d.paidAt || now), DEFAULT_PAYOUT_DELAY_DAYS);
            if (!isAdmin && now < eligibleAt) continue;

            const paidOutData = {
                ...d,
                payoutStatus: 'paid',
                settledAt: now.toISOString(),
                settledBy: req.user.id,
            };
            const { error } = await supabase.from('payments').update({
                data: paidOutData,
                updated_at: now.toISOString(),
            }).eq('id', row.id);
            if (error) throw error;
            releasedCount += 1;
        }

        return res.json({ ok: true, releasedCount, message: 'Payout settlement completed' });
    } catch (error: any) {
        console.error('releaseHostPayout error:', error);
        return res.status(500).json({ message: 'Failed to release payout' });
    }
};

export const getEventFinancialSummary = async (req: AuthRequest, res: Response) => {
    try {
        const eventId = String(req.params.id || '');
        const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, data').eq('id', eventId).single();
        if (eventErr || !eventRow) return res.status(404).json({ message: 'Event not found' });
        if (!assertHostOrAdmin(eventRow, req, res)) return;

        const { data: paymentRows, error: paymentErr } = await supabase
            .from('payments')
            .select('id, data, created_at')
            .eq('data->>flow', 'event_ticket')
            .eq('data->>event', eventId);
        if (paymentErr) throw paymentErr;

        const stats = {
            grossPaise: 0,
            commissionPaise: 0,
            hostNetPaise: 0,
            refundedPaise: 0,
            paidTickets: 0,
            refundedTickets: 0,
            escrowTickets: 0,
            eligibleTickets: 0,
            settledTickets: 0,
        };

        const transactions = (paymentRows || []).map((row: any) => {
            const d = getPaymentData(row);
            const amount = Number(d?.amount || 0);
            const commission = Number(d?.platformCommission?.amountPaise || 0);
            const net = Number(d?.hostSettlementAmountPaise || Math.max(0, amount - commission));

            if (d?.paymentStatus === 'paid' && d?.refundStatus !== 'completed') {
                stats.grossPaise += amount;
                stats.commissionPaise += commission;
                stats.hostNetPaise += net;
                stats.paidTickets += 1;
            }
            if (d?.refundStatus === 'completed') {
                stats.refundedPaise += amount;
                stats.refundedTickets += 1;
            }
            if (d?.payoutStatus === 'escrow') stats.escrowTickets += 1;
            if (d?.payoutStatus === 'eligible') stats.eligibleTickets += 1;
            if (d?.payoutStatus === 'paid') stats.settledTickets += 1;

            return {
                id: row.id,
                attendee: d?.attendee,
                amountPaise: amount,
                commissionPaise: commission,
                hostNetPaise: net,
                paymentStatus: d?.paymentStatus,
                refundStatus: d?.refundStatus,
                payoutStatus: d?.payoutStatus,
                paidAt: d?.paidAt || row.created_at,
                settledAt: d?.settledAt || null,
            };
        });

        return res.json({
            eventId,
            eventTitle: eventRow.data?.title,
            policies: {
                commissionPercent: DEFAULT_COMMISSION_PERCENT,
                commissionFixedPaise: DEFAULT_COMMISSION_FIXED_PAISE,
                refundCutoffHours: DEFAULT_REFUND_CUTOFF_HOURS,
                payoutDelayDays: DEFAULT_PAYOUT_DELAY_DAYS,
            },
            stats,
            transactions,
        });
    } catch (error: any) {
        console.error('getEventFinancialSummary error:', error);
        return res.status(500).json({ message: 'Failed to load event financial summary' });
    }
};
