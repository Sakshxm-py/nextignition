import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Crown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { brandColors } from '../utils/colors';
import { getCurrentUser } from '../services/authService';
import { usePremium } from '../hooks/usePremium';
import { getPremiumPackage, purchasePremium, restorePurchases, iapAvailable } from '../services/purchases';

const PREMIUM_FEATURES = [
  'Unlimited direct messaging with founders, experts & investors',
  'Upload pitch decks & pitch videos',
  'Host your own events & webinars',
  'Publish resources, podcasts & go live',
  'Full Ignisha AI access with higher daily limits',
  'Funding portal & smart investor matching',
  'Featured placement & priority support',
];

function goBack() {
  const role = getCurrentUser()?.role;
  window.location.hash = role ? `#${role}-dashboard` : '#login';
}

export function PremiumPaywall() {
  const isPremium = usePremium();
  const [priceString, setPriceString] = useState('');
  const [periodLabel, setPeriodLabel] = useState('month');
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [busy, setBusy] = useState<false | 'buy' | 'restore'>(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pkg = await getPremiumPackage();
        if (!alive) return;
        if (pkg?.product) {
          setPriceString(pkg.product.priceString || '');
          const t = String(pkg.packageType || '').toUpperCase();
          setPeriodLabel(t === 'ANNUAL' ? 'year' : t === 'WEEKLY' ? 'week' : 'month');
        }
      } catch { /* ignore */ } finally {
        if (alive) setLoadingOffer(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleSubscribe = async () => {
    setBusy('buy');
    const res = await purchasePremium();
    setBusy(false);
    if (res.success) { toast.success('Welcome to Premium! 🎉'); goBack(); }
    else if (!res.cancelled) toast.error(res.error || 'Purchase failed. Please try again.');
  };

  const handleRestore = async () => {
    setBusy('restore');
    const { premium } = await restorePurchases();
    setBusy(false);
    if (premium) { toast.success('Your subscription was restored.'); goBack(); }
    else toast('No active subscription found to restore.');
  };

  // ── Already subscribed ────────────────────────────────────────────────
  if (isPremium) {
    return (
      <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }}>
        <button onClick={goBack} className="m-4 flex items-center gap-1 text-gray-500 self-start">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center -mt-16">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg" style={{ backgroundColor: brandColors.atomicOrange }}>
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're on Premium</h1>
          <p className="text-gray-500 max-w-xs">All premium features are unlocked. Manage your subscription in Settings → Apple ID → Subscriptions.</p>
        </div>
      </div>
    );
  }

  const unavailable = !iapAvailable();
  const priceLine = priceString ? `${priceString} / ${periodLabel}` : '';

  return (
    <div className="min-h-screen bg-white flex flex-col pb-[env(safe-area-inset-bottom)]" style={{ paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }}>
      <button onClick={goBack} className="m-4 flex items-center gap-1 text-gray-500 self-start">
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <div className="flex-1 px-6 pb-8 max-w-md w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})` }}
          >
            <Crown className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900">NextIgnition Premium</h1>
          <p className="text-gray-500 mt-1">Unlock everything in the app</p>
          <div className="mt-4 h-8 flex items-center justify-center">
            {loadingOffer ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            ) : (
              <span className="text-2xl font-extrabold text-gray-900">{priceLine}</span>
            )}
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${brandColors.electricBlue}15` }}>
                <Check className="w-4 h-4" style={{ color: brandColors.electricBlue }} />
              </div>
              <span className="text-sm text-gray-700 leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>

        {/* Subscribe */}
        <button
          onClick={handleSubscribe}
          disabled={!!busy || loadingOffer || unavailable}
          className="w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
          style={{ background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})` }}
        >
          {busy === 'buy' ? <Loader2 className="w-5 h-5 animate-spin" /> : `Subscribe${priceString ? ` — ${priceString}/${periodLabel}` : ''}`}
        </button>

        {/* Restore — required by Apple */}
        <button
          onClick={handleRestore}
          disabled={!!busy || unavailable}
          className="w-full py-3 mt-3 text-sm font-semibold text-gray-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy === 'restore' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Restore Purchases'}
        </button>

        {unavailable && (
          <p className="text-center text-xs text-amber-600 mt-2">Subscriptions aren't available right now. Please try again later.</p>
        )}

        {/* Auto-renew disclosure — required by Apple Guideline 3.1.2 */}
        <p className="text-[11px] leading-relaxed text-gray-400 mt-6 text-center">
          NextIgnition Premium is an auto-renewable subscription{priceString ? ` of ${priceString} per ${periodLabel}` : ''}. Payment is charged to your Apple ID at confirmation. It automatically renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in Settings → Apple ID → Subscriptions.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="#terms" className="text-[11px] font-medium text-gray-500 underline">Terms of Use</a>
          <span className="text-gray-300">·</span>
          <a href="#privacy" className="text-[11px] font-medium text-gray-500 underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
