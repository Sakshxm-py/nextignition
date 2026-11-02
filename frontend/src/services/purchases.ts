/**
 * In-App Purchase (StoreKit via RevenueCat) — iOS only.
 *
 * Apple requires digital subscriptions to be sold through StoreKit In-App
 * Purchase (Guideline 3.1.1). We use RevenueCat to wrap StoreKit so receipt
 * validation, restore, and renewal handling are done correctly server-side.
 *
 * This module is a safe no-op on web/Android and whenever VITE_REVENUECAT_IOS_KEY
 * is not set — so the app keeps working before the RevenueCat account is wired up.
 */
import { Capacitor } from '@capacitor/core';

const IS_IOS = Capacitor.getPlatform() === 'ios';
const RC_IOS_API_KEY = ((import.meta as any).env?.VITE_REVENUECAT_IOS_KEY as string | undefined) || '';

/** RevenueCat entitlement identifier that represents "Premium" (full access). */
export const PREMIUM_ENTITLEMENT = 'premium';
/** App Store Connect product id for the monthly subscription. */
export const PREMIUM_PRODUCT_ID = 'com.nextignition.premium.monthly';

/** True only when StoreKit purchasing is actually usable (iOS + key configured). */
export const iapAvailable = (): boolean => IS_IOS && !!RC_IOS_API_KEY;

let configured = false;

/** Initialize RevenueCat for a user. Safe to call on every app start / login. */
export async function initPurchases(appUserID?: string | null): Promise<void> {
  if (!iapAvailable()) return;
  try {
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    if (!configured) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey: RC_IOS_API_KEY, appUserID: appUserID || undefined });
      configured = true;
    } else if (appUserID) {
      await Purchases.logIn({ appUserID });
    }
  } catch (e) {
    console.warn('[IAP] init failed', e);
  }
}

/** Whether the user currently has the active "premium" StoreKit entitlement. */
export async function hasPremiumEntitlement(): Promise<boolean> {
  if (!iapAvailable()) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
  } catch (e) {
    console.warn('[IAP] getCustomerInfo failed', e);
    return false;
  }
}

/** The current offering's package to display on the paywall (prefers monthly). */
export async function getPremiumPackage(): Promise<any | null> {
  if (!iapAvailable()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    return current.monthly || current.availablePackages?.[0] || null;
  } catch (e) {
    console.warn('[IAP] getOfferings failed', e);
    return null;
  }
}

/** Launch the StoreKit purchase sheet. Returns whether the user is now premium. */
export async function purchasePremium(): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  if (!iapAvailable()) return { success: false, error: 'In-app purchases are unavailable on this device.' };
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const aPackage = await getPremiumPackage();
    if (!aPackage) return { success: false, error: 'No subscription is available right now. Please try again later.' };
    const { customerInfo } = await Purchases.purchasePackage({ aPackage });
    const premium = !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
    setPremiumFlag(premium);
    return { success: premium };
  } catch (e: any) {
    const cancelled = e?.code === 'PURCHASE_CANCELLED' || e?.userCancelled === true || /cancel/i.test(e?.message || '');
    if (cancelled) return { success: false, cancelled: true };
    return { success: false, error: e?.message || 'Purchase failed. Please try again.' };
  }
}

/** Restore prior purchases — Apple requires a visible "Restore" action. */
export async function restorePurchases(): Promise<{ premium: boolean }> {
  if (!iapAvailable()) return { premium: false };
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    const premium = !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
    setPremiumFlag(premium);
    return { premium };
  } catch (e) {
    console.warn('[IAP] restore failed', e);
    return { premium: false };
  }
}

// ── Reactive premium flag ──────────────────────────────────────────────────
// `useFeatureAccess` is a SYNC hook used all over render, but entitlement reads
// are async. We cache the last-known premium state in localStorage and emit an
// event on change so the sync hook can read it and components re-render.
const PREMIUM_FLAG_KEY = 'iapPremium';
export const PREMIUM_CHANGED_EVENT = 'iap-premium-changed';

/** Sync read of the last-known premium entitlement state. */
export function getPremiumFlag(): boolean {
  try { return localStorage.getItem(PREMIUM_FLAG_KEY) === '1'; } catch { return false; }
}

/** Clear the cached premium flag — call on logout so a stale flag can't grant access. */
export function clearPremiumFlag(): void { setPremiumFlag(false); }

function setPremiumFlag(isPremium: boolean): void {
  try {
    const prev = getPremiumFlag();
    localStorage.setItem(PREMIUM_FLAG_KEY, isPremium ? '1' : '0');
    if (prev !== isPremium && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PREMIUM_CHANGED_EVENT, { detail: isPremium }));
    }
  } catch { /* ignore */ }
}

/** Re-init RevenueCat for the user and refresh the cached flag. Call on login / app start. */
export async function refreshPremium(appUserID?: string | null): Promise<boolean> {
  if (!iapAvailable()) { setPremiumFlag(false); return false; }
  await initPurchases(appUserID);
  const premium = await hasPremiumEntitlement();
  setPremiumFlag(premium);
  return premium;
}

/** Subscribe to live entitlement changes (renewals/expiry/cross-device) — keeps the flag fresh. */
export async function startPremiumListener(): Promise<void> {
  if (!iapAvailable()) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.addCustomerInfoUpdateListener((info: any) => {
      setPremiumFlag(!!info?.entitlements?.active?.[PREMIUM_ENTITLEMENT]);
    });
  } catch (e) {
    console.warn('[IAP] listener failed', e);
  }
}

/** Clear the RevenueCat identity on logout. */
export async function logoutPurchases(): Promise<void> {
  if (!iapAvailable() || !configured) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logOut();
  } catch { /* ignore */ }
}
