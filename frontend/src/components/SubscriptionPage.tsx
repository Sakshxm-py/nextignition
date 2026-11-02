import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { brandColors } from "../utils/colors";
import { Check, Info, ArrowRight, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import api from '../services/api';
import { Capacitor } from '@capacitor/core';
import { fetchMe, setCurrentUser, getCurrentUser } from '../services/authService';

/* Detect if Apple Pay is available via Razorpay (web/macOS Safari only).
 * Never enable on iOS native — payments must go through Apple IAP there. */
const isApplePayAvailable = () => {
  if (Capacitor.isNativePlatform()) return false;
  if (typeof window !== 'undefined' && (window as any).ApplePaySession) {
    return (window as any).ApplePaySession.canMakePayments();
  }
  return false;
};

type Role = 'founder' | 'expert' | 'investor';
type BillingCycle = 'monthly' | 'annual';
type PlanTier = 'free' | 'pro' | 'elite';

const ROLE_COLORS: Record<Role, string> = {
  founder: brandColors.navyBlue, // Navy Blue
  expert: '#1b633c',             // Forest Green
  investor: '#592c82',           // Deep Purple
};

const BUNDLE_COLOR = brandColors.atomicOrange;

const PRICES = {
  founder: { free: 0, pro: 999, elite: 2999 },
  expert: { free: 0, pro: 999, elite: 1999 },
  investor: { free: 0, pro: 2999, elite: 4999 },
};

const FEATURES = {
  founder: {
    free: ['Basic tools'],
    pro: ['Pitch deck + video upload', 'Verified founder badge', 'Direct messaging', 'Mentorship access'],
    elite: ['Featured placement in discovery', 'Unlimited expert consultations', 'Co-founder matching', 'Full live chat streaming'],
  },
  expert: {
    free: ['Expert community forum', 'Limited outbound'],
    pro: ['Verified expert badge', 'Priority listing', '10 consultations / month', 'Host paid webinars'],
    elite: ['Top placement in discovery', '35 consultations / month', 'Session prep & pre-meeting briefs'],
  },
  investor: {
    free: ['Private mode', 'View limited profiles'],
    pro: ['Verified investor badge', 'Advanced startup filters', 'Smart founder matching', 'Direct messaging with founders'],
    elite: ['Priority access to new startups', 'Advanced startup analytics', 'Deal room for due diligence'],
  }
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Never load the third-party payment SDK on iOS native. Payments are
    // unavailable in the iOS app (Apple Guideline 3.1.1) and Apple flags the
    // mere presence/loading of external purchase SDKs in iOS binaries.
    if (Capacitor.getPlatform() === 'ios') { resolve(false); return; }
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function SubscriptionPage() {
  // HARD STRUCTURAL GUARD (Apple Guideline 3.1.1): the subscription tier
  // structure (Free/Pro/Elite cards, plan tabs, feature lists) must NEVER render
  // on iOS — the app is fully free there. This is independent of the App.tsx
  // route block (belt-and-suspenders): even if any path reaches this component,
  // it redirects out and renders nothing, so no plan/tier UI can reach a reviewer.
  if (Capacitor.getPlatform() === 'ios') {
    const u = getCurrentUser();
    window.location.hash = u?.role ? `#${u.role}-dashboard` : '#login';
    return null;
  }
  const [activeRole, setActiveRole] = useState<Role>('founder');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [userPlans, setUserPlans] = useState<Record<Role, PlanTier>>({ founder: 'free', expert: 'free', investor: 'free' });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [applePaySupported] = useState(() => isApplePayAvailable());

  // Bundle logic removed for cleaner UX

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/payments/status');
      setUserPlans(data.userPlans);
    } catch (error) {
      console.error("Failed to fetch subscription status", error);
    } finally {
      setInitLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const getPriceDisplay = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return 'Rs.0';
    if (billingCycle === 'annual') {
      const annualPrice = Math.floor(monthlyPrice * 12 * 0.83); // 17% off
      return `Rs.${annualPrice.toLocaleString()}`;
    }
    return `Rs.${monthlyPrice.toLocaleString()}`;
  };

  const getIntervalDisplay = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return '/ mo';
    return billingCycle === 'annual' ? '/ year' : '/ month';
  };

  const handleSubscribe = async (role: Role, planId: PlanTier) => {
    // IAP compliance: never process payments inside the iOS native app
    if (Capacitor.getPlatform() === 'ios') return;
    if (userPlans[role] === planId) return;
    setLoading(true);
    setToast(null);

    try {
      const { data: config } = await api.get('/payments/config');
      if (!config.key) throw new Error("Payment gateway not configured");

      const { data: order } = await api.post('/payments/create-order', { role, planId, billingCycle });

      if (order.plan === 'free') {
        showToast('success', `Downgraded ${role} to Free plan.`);
        try {
          const updatedUser = await fetchMe();
          setCurrentUser(updatedUser);
        } catch (err) {
          console.error("Failed to sync user plan in local storage:", err);
        }
        await fetchStatus();
        setLoading(false);
        return;
      }

      const options: any = {
        key: config.key,
        amount: order.amount,
        currency: order.currency,
        name: "NextIgnition",
        description: `Upgrade ${role} to ${planId.toUpperCase()} Plan`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const res = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              role, planId, billingCycle
            });
            if (res.data.ok) {
              showToast('success', `🎉 Successfully upgraded ${role} to ${planId.toUpperCase()}!`);
              try {
                const updatedUser = await fetchMe();
                setCurrentUser(updatedUser);
              } catch (err) {
                console.error("Failed to sync user plan in local storage:", err);
              }
              await fetchStatus();
            }
          } catch (err) {
            showToast('error', 'Payment verification failed.');
          }
        },

        theme: { color: ROLE_COLORS[role] },
      };

      // Enable Apple Pay in Razorpay checkout when available
      if (applePaySupported) {
        options.method = { wallet: { applepay: true } };
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) throw new Error("Failed to load payment gateway");

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        showToast('error', `Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to initiate checkout.');
    } finally {
      setLoading(false);
    }
  };



  if (initLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    const u = getCurrentUser();
    window.location.hash = u?.role ? `#${u.role}-dashboard` : '#home';
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {toast && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-4 rounded-full shadow-2xl text-sm font-bold ${
            toast.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            {toast.message}
          </div>
        )}

        {/* Back control: this page is reachable directly via #pricing and had no
            way out, stranding anyone who landed on it. Step back through history
            when there is somewhere to return to, otherwise fall back to the
            user's dashboard. */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="inline-flex items-center gap-2 py-2 pl-2 pr-4 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">Manage Your Subscriptions</h1>
          <p className="text-lg text-gray-600">Access role-specific powers to grow faster.</p>
          {applePaySupported && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple Pay available
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-full p-1 shadow-sm border border-gray-200" style={{ maxWidth: '600px', width: '100%' }}>
            {(['founder', 'expert', 'investor'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex-1 py-3 px-4 rounded-full text-sm font-semibold transition-all ${
                  activeRole === role ? 'text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
                }`}
                style={{ backgroundColor: activeRole === role ? ROLE_COLORS[role] : 'transparent' }}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Toggle — hidden on iOS (no pricing/purchase surfaces per Apple Guideline 3.1.1) */}
        {Capacitor.getPlatform() !== 'ios' && (
          <div className="flex justify-center items-center gap-4 mb-12">
            <span className={`font-semibold ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
            <button
              onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
              className={`w-14 h-7 rounded-full relative p-1 transition-colors`}
              style={{ backgroundColor: billingCycle === 'annual' ? ROLE_COLORS[activeRole] : '#d1d5db' }}
            >
              <motion.div className="w-5 h-5 bg-white rounded-full shadow-sm" animate={{ x: billingCycle === 'annual' ? 28 : 0 }} />
            </button>
            <span className={`font-semibold flex items-center gap-2 ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual <span className="text-xs py-1 px-2 rounded-full bg-green-100 text-green-700 font-bold">Save ~17%</span>
            </span>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {(['free', 'pro', 'elite'] as PlanTier[]).map((planTier) => {
            const isActive = userPlans[activeRole] === planTier;
            const price = PRICES[activeRole][planTier];
            
            return (
              <div
                key={planTier}
                className={`relative flex flex-col rounded-3xl p-8 border-2 transition-transform bg-white ${
                  isActive ? 'border-gray-900 shadow-xl scale-105 z-10' : 'border-gray-200 hover:border-gray-300 hover:-translate-y-1'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                    Current Plan
                  </div>
                )}
                
                <h3 className="text-2xl font-bold uppercase mb-2" style={{ color: planTier !== 'free' ? ROLE_COLORS[activeRole] : '#111827' }}>{planTier}</h3>
                {/* Prices are never shown on iOS (Apple Guideline 3.1.1 — no external pricing/purchase surfaces) */}
                {Capacitor.getPlatform() !== 'ios' && (
                  <div className="text-4xl font-extrabold mb-1">{getPriceDisplay(price)} <span className="text-lg font-medium text-gray-500">{getIntervalDisplay(price)}</span></div>
                )}

                <ul className="mt-8 space-y-4 flex-1">
                  {FEATURES[activeRole][planTier].map((feat, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 text-sm font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>

                {Capacitor.getPlatform() === 'ios' ? (
                  isActive ? (
                    <div className="mt-8 text-center p-3 rounded-xl bg-gray-100 text-gray-500 text-sm font-bold">
                      Current Plan
                    </div>
                  ) : (
                    <div className="mt-8 text-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium">
                      This plan is currently unavailable.
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleSubscribe(activeRole, planTier)}
                    disabled={isActive || loading}
                    className={`mt-8 w-full py-4 rounded-xl font-bold transition-all ${
                      isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                      planTier === 'free' ? 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50' : 
                      'text-white shadow-lg'
                    }`}
                    style={!isActive && planTier !== 'free' ? { backgroundColor: ROLE_COLORS[activeRole] } : {}}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : isActive ? 'Active' : planTier === 'free' ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {Capacitor.getPlatform() === 'ios' && (
          <div className="max-w-5xl mx-auto mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-sm text-blue-700 flex items-center justify-center gap-2">
            <span>💡 All features are included in your account at no charge.</span>
          </div>
        )}

      </div>
    </div>
  );
}
