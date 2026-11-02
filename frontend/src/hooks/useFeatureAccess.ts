import { getCurrentUser } from '../services/authService';
import { Capacitor } from '@capacitor/core';
import { PLAN_FEATURES, RoleName, PlanTier } from '../utils/subscriptionPlans';
import { usePremium } from './usePremium';

const IS_IOS = Capacitor.getPlatform() === 'ios';

/**
 * Feature gating.
 * - Web/Android: gated by the user's real (web-purchased) plan, as before.
 * - iOS: gated by the StoreKit IAP "premium" entitlement ONLY. Premium → full
 *   ('elite') access; otherwise 'free', and the UI shows the paywall. We deliberately
 *   do NOT auto-honor web-purchased plans on iOS yet, so the in-app purchase is the
 *   single, unambiguous unlock path Apple's reviewer can verify (Guideline 3.1.1).
 *   (Honoring web plans under 3.1.3(b) can be enabled post-approval.)
 */
export function useFeatureAccess() {
  const user = getCurrentUser();
  const iapPremium = usePremium(); // reactive; always false on web/Android

  const webPlan = (): PlanTier => {
    if (!user || !user.role) return 'free';
    const planKey = `${user.role}_plan`;
    return ((user[planKey] || user.data?.[planKey]) as PlanTier) || 'free';
  };

  const effectivePlan = (): PlanTier => {
    if (IS_IOS) return iapPremium ? 'elite' : 'free';
    return webPlan();
  };

  const hasFeature = (featureKey: string): boolean => {
    if (!user || !user.role) return false;
    const role = user.role as RoleName;
    const features = PLAN_FEATURES[role]?.[effectivePlan()];
    return !!features?.[featureKey];
  };

  const getFeatureValue = (featureKey: string): any => {
    if (!user || !user.role) return null;
    const role = user.role as RoleName;
    return PLAN_FEATURES[role]?.[effectivePlan()]?.[featureKey];
  };

  return {
    userPlan: effectivePlan(),
    hasFeature,
    getFeatureValue,
    role: user?.role,
    /** iOS user without premium → callers can open the paywall instead of hiding. */
    needsPaywall: IS_IOS && !iapPremium,
  };
}
