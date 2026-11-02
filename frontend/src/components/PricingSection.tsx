import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { brandColors } from "../utils/colors";
import { Check, Info, ArrowRight } from "lucide-react";

type Role = 'founder' | 'expert' | 'investor';
type BillingCycle = 'monthly' | 'annual';

const ROLE_COLORS: Record<Role, string> = {
  founder: brandColors.navyBlue, // Navy Blue
  expert: '#1b633c',             // Forest Green
  investor: '#592c82',           // Deep Purple
};

const BUNDLE_COLOR = brandColors.atomicOrange;

// Prices
const PRICES = {
  founder: { free: 0, pro: 999, elite: 2999 },
  expert: { free: 0, pro: 999, elite: 1999 },
  investor: { free: 0, pro: 2999, elite: 4999 },
};

const FEATURES = {
  founder: {
    free: ['Register & create startup profile', 'Post content, updates & milestones', 'Comment & connect with users', 'Browse community & content feed', 'Connect & follow users', 'Attend free webinars & events'],
    pro: ['Pitch deck + video upload', 'Verified founder badge', 'Profile visible in investor discovery', 'Direct messaging (initiate chat)', 'Mentorship access', '2 Expert consultations / month', 'Community access', 'Limited live chat streaming'],
    elite: ['Featured placement in discovery', 'AI profile summarizer', 'Progress tracking on profile', 'Unlimited expert consultations', 'Co-founder matching', 'Full live chat streaming', 'Live meet sessions (20+ members)'],
  },
  expert: {
    free: ['Register & create expert profile', 'Post content, articles & insights', 'Expert community forum', 'Limited inbound consultation requests', 'Host 1 public event / month', 'Ignisha AI basic Q&A'],
    pro: ['Verified expert badge', 'Priority listing in discovery', '10 consultations / month', 'Consultation scheduling & management', 'Host 3 public events / month', 'Host paid webinars', 'Revenue & Analytics (Basic)', 'Resource library — access & publish', 'AI-matched with relevant startups', 'Content creation tools (AI-assisted)'],
    elite: ['Priority listing in discovery (Top)', '35 consultations / month', 'Host unlimited public events / month', 'Bulk messaging to mentees', 'Revenue & Analytics (Advanced)', 'Session prep & pre-meeting briefs', 'Direct access to verified startups'],
  },
  investor: {
    free: ['Register & create investor profile', 'Post content, views & insights', 'Private / public mode toggle', 'No unsolicited DMs (always protected)', 'Limited browse founder profiles', 'Host 1 public event / month'],
    pro: ['Verified investor badge', 'Investment preferences settings', 'Unlimited browse founder profiles', 'Advanced startup filters', 'AI-filtered deal flow by thesis', 'Smart founder matching', 'Pitch deck & business plan access', 'Basic startup analytics', 'Direct messaging with founders', 'Investment pipeline dashboard', 'Basic portfolio management tools', 'Exclusive investor-only events', 'Virtual demo day access'],
    elite: ['Priority & early access to new startups', 'Advanced startup analytics', 'Advanced portfolio management tools', 'Deal room for due diligence', 'Co-investment network access', 'Legal & compliance support tools'],
  }
};

const FREE_FOR_ALL = [
  'Register & create profile', 'Post content & updates', 'Comment & connect', 
  'Browse community', 'Attend free webinars & events', 'Ignisha AI basic Q&A', 'Community read access'
];

export function PricingSection() {
  const [activeRole, setActiveRole] = useState<Role>('founder');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [bundlesOpen, setBundlesOpen] = useState(false);

  useEffect(() => {
    if (!bundlesOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [bundlesOpen]);

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

  const bundleBasePrice = (roles: Role[]) => roles.reduce((sum, r) => sum + PRICES[r].pro, 0);
  const bundlePrice = (roles: Role[]) => {
    const monthly = bundleBasePrice(roles);
    const discountedMonthly = Math.floor(monthly * 0.8);
    if (billingCycle === 'annual') {
      return Math.floor(discountedMonthly * 12 * 0.83);
    }
    return discountedMonthly;
  };

  const bundleLabel = (roles: Role[]) => roles.map(r => r[0].toUpperCase() + r.slice(1)).join(' + ');

  const BUNDLE_OPTIONS: Role[][] = [
    ['founder', 'expert'],
    ['founder', 'investor'],
    ['expert', 'investor'],
    ['founder', 'expert', 'investor'],
  ];

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-6xl font-bold mb-4" style={{ color: ROLE_COLORS[activeRole] }}>
            Subscription Plans
          </h2>
          <p className="text-xl text-gray-600 italic">
            {activeRole === 'founder' && "Build fast. Raise smart. Get funded."}
            {activeRole === 'expert' && "Your expertise. Your income. Your platform."}
            {activeRole === 'investor' && "Better deal flow. Zero noise."}
          </p>
        </div>

        {/* Role Switcher */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-100 rounded-full p-1" style={{ maxWidth: '600px', width: '100%' }}>
            {(['founder', 'expert', 'investor'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex-1 py-3 px-4 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 ${
                  activeRole === role ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                style={{
                  backgroundColor: activeRole === role ? ROLE_COLORS[role] : 'transparent',
                  transform: activeRole === role ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: activeRole === role ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {role === 'founder' && 'Founder / Co-founder'}
                {role === 'expert' && 'Expert / Mentor'}
                {role === 'investor' && 'Investor / VC'}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-16">
          <span className={`font-semibold ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
            className="w-16 h-8 rounded-full bg-gray-200 relative p-1 transition-colors duration-300 focus:outline-none"
            style={{ backgroundColor: billingCycle === 'annual' ? ROLE_COLORS[activeRole] : '#e5e7eb' }}
          >
            <motion.div 
              className="w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ x: billingCycle === 'annual' ? 32 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`font-semibold flex items-center gap-2 ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
            Annual
            <span className="text-xs py-1 px-2 rounded-full bg-green-100 text-green-700 font-bold whitespace-nowrap">
              Save ~17%
            </span>
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          <AnimatePresence>
            {/* FREE PLAN */}
            <motion.div
              key={`${activeRole}-free`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-lg relative group h-full"
            >
              <div className="p-8 text-center border-b border-gray-100" style={{ backgroundColor: '#111827', color: 'white' }}>
                <h3 className="text-xl font-bold uppercase tracking-wider mb-2">Free</h3>
                <div className="text-4xl font-extrabold mb-1">{getPriceDisplay(PRICES[activeRole].free)} <span className="text-lg font-medium text-gray-400">{getIntervalDisplay(0)}</span></div>
                <p className="text-sm text-gray-400 italic mt-2">Free forever</p>
                <p className="text-sm font-medium mt-4 text-white/80">
                  {activeRole === 'founder' && '"Explore the ecosystem"'}
                  {activeRole === 'expert' && '"Share your knowledge"'}
                  {activeRole === 'investor' && '"Discover the ecosystem"'}
                </p>
              </div>
              <div className="p-8 flex-1 flex flex-col bg-gray-50">
                <ul className="space-y-4 mb-8 flex-1">
                  {FEATURES[activeRole].free.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500" />
                      <span className="text-gray-700 font-medium text-sm lg:text-base">{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => window.location.hash = '#signup'}
                  className="w-full py-4 rounded-xl font-bold transition-all bg-gray-900 text-white hover:bg-gray-800 mt-auto"
                >
                  Get Started Free
                </button>
              </div>
            </motion.div>

            {/* PRO PLAN */}
            <motion.div
              key={`${activeRole}-pro`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col rounded-3xl overflow-hidden shadow-2xl relative z-10 scale-100 md:scale-105 h-full"
              style={{ border: `2px solid ${ROLE_COLORS[activeRole]}` }}
            >
              <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: ROLE_COLORS[activeRole] }} />
              <div className="p-8 text-center" style={{ backgroundColor: ROLE_COLORS[activeRole], color: 'white' }}>
                <h3 className="text-xl font-bold uppercase tracking-wider mb-2">Pro</h3>
                <div className="text-4xl font-extrabold mb-1">{getPriceDisplay(PRICES[activeRole].pro)} <span className="text-lg font-medium text-white/70">{getIntervalDisplay(PRICES[activeRole].pro)}</span></div>
                <p className="text-sm text-white/70 italic mt-2">
                  {billingCycle === 'monthly' ? `Rs.${Math.floor(PRICES[activeRole].pro * 12 * 0.83).toLocaleString()}/year (save 17%)` : `Billed annually`}
                </p>
                <p className="text-sm font-medium mt-4 text-white/90">
                  {activeRole === 'founder' && '"You\'re serious. Now show it."'}
                  {activeRole === 'expert' && '"Start earning from expertise."'}
                  {activeRole === 'investor' && '"Curated deal flow at your fingertips."'}
                </p>
              </div>
              <div className="p-8 flex-1 flex flex-col bg-white">
                <div className="mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Everything in Free, plus:</div>
                <ul className="space-y-4 mb-8 flex-1">
                  {FEATURES[activeRole].pro.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: ROLE_COLORS[activeRole] }} />
                      <span className="text-gray-800 font-medium text-sm lg:text-base">{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => window.location.hash = '#signup'}
                  className="w-full py-4 rounded-xl font-bold transition-all text-white mt-auto shadow-md hover:shadow-lg"
                  style={{ backgroundColor: ROLE_COLORS[activeRole] }}
                >
                  Upgrade to Pro
                </button>
              </div>
            </motion.div>

            {/* ELITE PLAN */}
            <motion.div
              key={`${activeRole}-elite`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex flex-col rounded-3xl overflow-hidden shadow-lg border border-gray-200 bg-white h-full"
            >
              <div className="p-8 text-center border-b border-gray-100" style={{ backgroundColor: BUNDLE_COLOR, color: 'white' }}>
                <h3 className="text-xl font-bold uppercase tracking-wider mb-2">Elite</h3>
                <div className="text-3xl font-extrabold mb-1">Coming Soon</div>
                <p className="text-sm text-white/70 italic mt-2">
                  Subscription starting soon
                </p>
                <p className="text-sm font-medium mt-4 text-white/90">
                  {activeRole === 'founder' && '"Built to get funded."'}
                  {activeRole === 'expert' && '"Scale your mentorship empire."'}
                  {activeRole === 'investor' && '"Full control. Complete intelligence."'}
                </p>
              </div>
              <div className="p-8 flex-1 flex flex-col bg-gray-50">
                <div className="mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Everything in Pro, plus:</div>
                <ul className="space-y-4 mb-8 flex-1">
                  {FEATURES[activeRole].elite.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: BUNDLE_COLOR }} />
                      <span className="text-gray-800 font-medium text-sm lg:text-base">{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className="w-full py-4 rounded-xl font-bold transition-all text-white mt-auto shadow-md opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: BUNDLE_COLOR }}
                >
                  Coming Soon
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Switch Profile Bundle Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-xl mb-16"
        >
          <div className="p-8 md:p-12 text-center text-white relative overflow-hidden" style={{ backgroundColor: BUNDLE_COLOR }}>
            <div className="absolute inset-0 opacity-10" />
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">SWITCH PROFILE BUNDLE — 20% OFF</h3>
              <p className="text-lg md:text-xl font-medium opacity-90 max-w-2xl mx-auto mb-8">
                Hold 2 or 3 role profiles on one account and subscribe to paid plans for each — get 20% off the combined total automatically.
              </p>
              <button 
                className="bg-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2 mx-auto"
                style={{ color: BUNDLE_COLOR }}
                onClick={() => setBundlesOpen(true)}
              >
                Explore Bundles <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {bundlesOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999]"
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBundlesOpen(false)} />
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', damping: 24, stiffness: 240 }}
                className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-orange-700">Bundle Pricing</div>
                    <div className="text-lg font-extrabold text-gray-900">Switch Profile Bundle (20% OFF)</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Prices shown for <span className="font-semibold">{billingCycle === 'annual' ? 'Annual' : 'Monthly'}</span> billing
                    </div>
                  </div>
                  <button
                    onClick={() => setBundlesOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50 mb-5">
                    <div className="text-sm font-bold text-orange-800">How it works</div>
                    <div className="text-sm text-orange-800/90 mt-1">
                      Create multiple role profiles on the same account, then subscribe to Pro for each — we apply <span className="font-bold">20% off</span> the combined total.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {BUNDLE_OPTIONS.map((roles, idx) => {
                      const baseMonthly = bundleBasePrice(roles);
                      const discountedMonthly = Math.floor(baseMonthly * 0.8);
                      const price = bundlePrice(roles);
                      const suffix = billingCycle === 'annual' ? '/ year' : '/ month';
                      return (
                        <div key={idx} className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-gray-900 truncate">{bundleLabel(roles)}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Base: Rs.{baseMonthly.toLocaleString()}/month → Bundle: Rs.{discountedMonthly.toLocaleString()}/month
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-extrabold" style={{ color: BUNDLE_COLOR }}>
                              Rs.{Number(price).toLocaleString()}
                              <span className="text-xs font-bold text-gray-500"> {suffix}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 text-xs text-gray-500">
                    Note: Annual pricing includes the existing ~17% annual savings shown on plans.
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* What Everyone Gets Free */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-100 rounded-2xl p-6 md:p-8 text-center border border-gray-200">
            <h4 className="text-xl font-bold text-gray-900 mb-4 flex justify-center items-center gap-2">
              <Info className="w-6 h-6 text-gray-500" /> What Everyone Gets for Free
            </h4>
            <p className="text-gray-600 font-medium leading-relaxed">
              {FREE_FOR_ALL.join(' | ')}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
