import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { supabase } from '../utils/supabase';
import { PLAN_FEATURES, RoleName, PlanTier } from '../utils/subscriptionPlans';

export const requireFeature = (role: RoleName, featureKey: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ message: 'Not authorized' });
                return;
            }

            // Read the plan from the top-level column, falling back to the data
            // JSONB entitlement. Selecting both keeps this correct whether or not
            // the column-backfill migration has run yet in a given environment.
            let userRow: any = null;
            {
                const res1 = await supabase
                    .from('users')
                    .select(`data, ${role}_plan`)
                    .eq('id', req.user.id)
                    .single();
                if (res1.error) {
                    const msg = String(res1.error?.message || '').toLowerCase();
                    if (msg.includes('column') || msg.includes(`${role}_plan`)) {
                        const res2 = await supabase.from('users').select('data').eq('id', req.user.id).single();
                        userRow = res2.data;
                    } else {
                        userRow = null;
                    }
                } else {
                    userRow = res1.data;
                }
            }

            // iOS StoreKit IAP grants full access via the webhook-set data.iapPremium flag.
            const iapPremium = userRow?.data?.iapPremium === true;
            const columnPlan = String(userRow?.[`${role}_plan`] || '').toLowerCase();
            const dataPlan = String(userRow?.data?.[`${role}_plan`] || '').toLowerCase();
            const currentPlan: PlanTier = (
                iapPremium ? 'elite'
                : columnPlan === 'elite' || dataPlan === 'elite' ? 'elite'
                : columnPlan === 'pro' || dataPlan === 'pro' ? 'pro'
                : 'free'
            ) as PlanTier;

            const featuresForPlan = PLAN_FEATURES[role][currentPlan];
            const hasFeature = featuresForPlan && featuresForPlan[featureKey];

            // Some features might be 'Limited', 'Basic', etc. Check if truthy and not explicitly false.
            if (!hasFeature) {
                res.status(403).json({ message: `Your current ${currentPlan} plan does not support this feature. Please upgrade.` });
                return;
            }

            next();
        } catch (error) {
            console.error('Subscription middleware error:', error);
            res.status(500).json({ message: 'Server check failed' });
        }
    };
};
