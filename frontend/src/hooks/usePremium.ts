import { useState, useEffect } from 'react';
import { getPremiumFlag, PREMIUM_CHANGED_EVENT } from '../services/purchases';

/**
 * Reactive view of the IAP "premium" entitlement (iOS).
 * Reads the cached flag synchronously and re-renders when it changes
 * (purchase / restore / renewal / expiry). On web/Android this is always false,
 * and gating falls back to the user's real (web-purchased) plan.
 */
export function usePremium(): boolean {
  const [premium, setPremium] = useState<boolean>(() => getPremiumFlag());

  useEffect(() => {
    const sync = () => setPremium(getPremiumFlag());
    sync(); // catch any change between initial render and effect
    window.addEventListener(PREMIUM_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PREMIUM_CHANGED_EVENT, sync);
  }, []);

  return premium;
}
