import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { usePremium } from '../hooks/usePremium';

interface SubscriptionGateProps {
  children: ReactNode;
  isUnlocked: boolean;
  requiredTier: 'Pro' | 'Elite';
  role: 'Founder' | 'Expert' | 'Investor';
}

export function SubscriptionGate({ children, isUnlocked, requiredTier, role }: SubscriptionGateProps) {
  const iapPremium = usePremium();
  const isIos = Capacitor.getPlatform() === 'ios';
  // iOS: gated by the StoreKit "premium" entitlement. Web/Android: the caller's plan check.
  const unlocked = isIos ? iapPremium : isUnlocked;

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-200">
      {/* Blurred Content */}
      <div className="filter blur-md opacity-50 pointer-events-none select-none">
        {children}
      </div>

      {/* Upgrade Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-gray-100"
        >
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {isIos
              ? 'Upgrade to Premium to unlock this feature.'
              : <>This capability requires the <span className="font-semibold text-gray-900">{role} {requiredTier}</span> plan to unlock.</>}
          </p>

          {/* Both platforms route to the upgrade screen — on iOS that's the StoreKit paywall. */}
          <button
            onClick={() => window.location.hash = '#pricing'}
            className="w-full py-3 px-6 rounded-xl font-bold bg-gray-900 text-white shadow-lg hover:bg-gray-800 transition-colors"
          >
            {isIos ? 'Upgrade to Premium' : 'Upgrade Now'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
