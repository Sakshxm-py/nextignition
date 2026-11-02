import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

// GET /api/earnings/expert
export const getExpertEarnings = async (req: AuthRequest, res: Response) => {
    try {
        const expertId = req.user.id;

        // 1. Find all events hosted by this expert
        const { data: eventsRows } = await supabase.from('events').select('id, data').eq('data->>hostUser', expertId);
        const eventIds = (eventsRows || []).map(e => e.id);
        const eventsMap = new Map((eventsRows || []).map(e => [e.id, e.data]));

        // 2. Find all 'paid' payments
        const { data: allPaymentsRows } = await supabase.from('payments').select('id, data, created_at, updated_at');
        const paymentsRows = (allPaymentsRows || []).filter(p =>
            eventIds.includes(p.data?.event) &&
            p.data?.flow === 'event_ticket' &&
            p.data?.paymentStatus === 'paid' &&
            p.data?.refundStatus !== 'completed'
        );
        paymentsRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // 3. Aggregate stats
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        let thisMonthTotal = 0;
        let lastMonthTotal = 0;
        let totalEarnings = 0;

        paymentsRows.forEach(p => {
            const amount = (p.data?.hostSettlementAmountPaise ?? p.data?.amount ?? 0) / 100;
            totalEarnings += amount;
            
            const created = new Date(p.created_at);
            if (created >= startOfThisMonth) {
                thisMonthTotal += amount;
            } else if (created >= startOfLastMonth && created <= endOfLastMonth) {
                lastMonthTotal += amount;
            }
        });

        // 4. Breakdowns for the chart. Sum payments that fall inside each labelled
        //    bucket so the Week/Month/Year toggle on the frontend actually changes
        //    the data instead of being a no-op.
        const amountOf = (p: any) => ((p.data?.hostSettlementAmountPaise ?? p.data?.amount ?? 0)) / 100;
        const sumInRange = (start: Date, end: Date) =>
            paymentsRows
                .filter(p => {
                    const created = new Date(p.created_at);
                    return created >= start && created <= end;
                })
                .reduce((sum, p) => sum + amountOf(p), 0);

        // Week: last 7 days (daily)
        const weekBreakdown = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
            const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
            weekBreakdown.push({
                month: dayStart.toLocaleString('default', { weekday: 'short' }),
                amount: sumInRange(dayStart, dayEnd),
            });
        }

        // Month: last 6 months
        const monthlyBreakdown = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
            monthlyBreakdown.push({
                month: d.toLocaleString('default', { month: 'short' }),
                amount: sumInRange(monthStart, monthEnd),
            });
        }

        // Year: last 12 months
        const yearBreakdown = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
            yearBreakdown.push({
                month: d.toLocaleString('default', { month: 'short' }),
                amount: sumInRange(monthStart, monthEnd),
            });
        }

        // 5. Recent transactions
        const recentPaymentsRows = paymentsRows.slice(0, 10);
        
        // Populate user details for these 10 transactions
        const userIds = [...new Set(recentPaymentsRows.map(p => p.data?.user).filter(Boolean))];
        const usersMap = new Map();
        if (userIds.length > 0) {
            const { data: usersData } = await supabase.from('users').select('id, data').in('id', userIds);
            (usersData || []).forEach(u => usersMap.set(u.id, u.data?.name || 'NextIgnition User'));
        }

        const mappedTransactions = recentPaymentsRows.map(p => {
            const evData = eventsMap.get(p.data?.event) || {};
            return {
                id: p.id,
                type: evData.type || 'event',
                client: usersMap.get(p.data?.user) || 'NextIgnition User',
                amount: (p.data?.hostSettlementAmountPaise ?? p.data?.amount ?? 0) / 100,
                date: new Date(p.created_at).toLocaleString(),
                status: 'completed',
                eventTitle: evData.title
            };
        });

        res.json({
            stats: {
                thisMonth: thisMonthTotal,
                lastMonth: lastMonthTotal,
                total: totalEarnings,
                pending: totalEarnings * 0.1, // Simulate pending as 10%
                available: totalEarnings * 0.9, // Simulate available as 90%
            },
            monthlyBreakdown, // kept for backwards compatibility (defaults to month)
            breakdowns: {
                week: weekBreakdown,
                month: monthlyBreakdown,
                year: yearBreakdown,
            },
            transactions: mappedTransactions
        });

    } catch (error: any) {
        console.error('Failed to get expert earnings:', error.message);
        res.status(500).json({ message: 'Failed to fetch earnings' });
    }
};
