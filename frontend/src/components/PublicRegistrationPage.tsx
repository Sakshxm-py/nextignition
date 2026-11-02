import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Briefcase, MapPin, Linkedin, Globe,
  ArrowRight, ArrowLeft, CheckCircle, Rocket, TrendingUp,
  DollarSign, Building2, Target, Loader2, Sparkles, ChevronDown,
  BadgeCheck, Heart, Star
} from 'lucide-react';
import api from '../services/api';

type UserRole = 'founder' | 'expert' | 'investor';
type Step = 1 | 2 | 3 | 4;

const INDUSTRIES = [
  'SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML',
  'CleanTech', 'DeepTech', 'Consumer', 'B2B', 'Marketplace', 'Other'
];

const STAGES = ['Idea / Pre-seed', 'MVP / Prototype', 'Early Revenue', 'Growth', 'Series A+'];
const EXPERTISE_LIST = ['Growth Marketing', 'Product Management', 'Tech / CTO', 'Fundraising', 'Sales & BD', 'Design / UX', 'Operations', 'Legal / Finance'];
const INVESTOR_TYPES = ['Angel Investor', 'VC / Partner', 'Family Office', 'Syndicate Lead', 'Corporate VC'];
const CHECK_SIZES = ['< ₹10L', '₹10L – ₹50L', '₹50L – ₹1Cr', '₹1Cr – ₹5Cr', '₹5Cr+', 'Flexible'];
const COUNTRY_CODES = ['+91', '+1', '+44', '+65', '+971', '+61', '+49'];

const roleConfig = {
  founder: {
    label: 'Founder / Co-Founder',
    icon: Rocket,
    color: '#2563EB',
    gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    description: 'Building the next big startup',
    benefits: ['Connect with investors', 'Find co-founders & mentors', 'Access startup resources'],
  },
  expert: {
    label: 'Expert / Mentor',
    icon: TrendingUp,
    color: '#EA580C',
    gradient: 'linear-gradient(135deg, #EA580C, #D97706)',
    bg: '#FFF7ED',
    border: '#FED7AA',
    description: 'Sharing expertise with startups',
    benefits: ['Monetize your knowledge', 'Build your reputation', 'Flexible consulting'],
  },
  investor: {
    label: 'Investor / VC',
    icon: DollarSign,
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED, #2563EB)',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    description: 'Discovering high-quality deal flow',
    benefits: ['Curated startups', 'Due diligence tools', 'Co-invest network'],
  },
};

export function PublicRegistrationPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Step 2 — personal info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Step 3 — role-specific info
  // Founder
  const [startupName, setStartupName] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [isFundraising, setIsFundraising] = useState(false);
  const [fundingGoal, setFundingGoal] = useState('');
  const [founderBio, setFounderBio] = useState('');
  // Expert
  const [expertise, setExpertise] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [expertBio, setExpertBio] = useState('');
  const [offerConsult, setOfferConsult] = useState(false);
  // Investor
  const [investorType, setInvestorType] = useState('');
  const [firmName, setFirmName] = useState('');
  const [checkSize, setCheckSize] = useState('');
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);
  const [investorBio, setInvestorBio] = useState('');

  const cfg = selectedRole ? roleConfig[selectedRole] : null;

  const toggleIndustry = (ind: string) => {
    setPreferredIndustries(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const canProceedStep1 = !!selectedRole;
  const canProceedStep2 =
    fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    phone.trim().length >= 7;
  const canProceedStep3 =
    selectedRole === 'founder'
      ? !!industry && !!stage
      : selectedRole === 'expert'
        ? !!expertise && !!yearsExp
        : !!investorType && !!checkSize;

  const handleSubmit = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    setError('');

    const payload = {
      // Meta
      source: 'public_registration',
      registeredAt: new Date().toISOString(),
      role: selectedRole,

      // Personal
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: `${countryCode}${phone.trim()}`,
      city: city.trim(),
      linkedinUrl: linkedinUrl.trim(),
      websiteUrl: websiteUrl.trim(),

      // Role-specific
      ...(selectedRole === 'founder' && {
        startupName: startupName.trim(),
        industry,
        stage,
        isFundraising,
        fundingGoal: fundingGoal.trim(),
        bio: founderBio.trim(),
      }),
      ...(selectedRole === 'expert' && {
        expertise,
        yearsOfExperience: yearsExp,
        currentCompany: currentCompany.trim(),
        offerConsultations: offerConsult,
        bio: expertBio.trim(),
      }),
      ...(selectedRole === 'investor' && {
        investorType,
        firmName: firmName.trim(),
        checkSize,
        preferredIndustries,
        bio: investorBio.trim(),
      }),
    };

    try {
      const response = await api.post('/auth/public-register', payload);
      const { token, refreshToken, user } = response.data;

      // Establish a guest session in localStorage
      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...user, token }));
        // Persist the refresh token so the session can renew instead of logging out.
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      }

      // Redirect to the survey page (not step 4)
      window.location.hash = '#event-survey';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = ((step - 1) / 3) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-10 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-purple-100 blur-3xl opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-50 blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-medium mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Join NextIgnition — Free Registration
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 leading-tight">
            Start Your Journey
          </h1>
          <p className="text-gray-500 text-lg">
            Connect with founders, experts & investors. No credit card required.
          </p>
        </motion.div>

        {/* Progress Bar */}
        {step < 4 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Step {step} of 3</span>
              <span>{Math.round(progressPct)}% complete</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {['Choose Role', 'Your Details', 'Profile Info'].map((label, i) => (
                <div key={i} className={`text-xs font-medium ${step > i + 1 ? 'text-blue-500' : step === i + 1 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                  {step > i + 1 && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <motion.div
          className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AnimatePresence mode="wait">

            {/* STEP 1 — Role Selection */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">I am a...</h2>
                <p className="text-gray-500 text-sm mb-6">Select your primary role on the platform</p>
                <div className="space-y-3 mb-8">
                  {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                    const rc = roleConfig[role];
                    const Icon = rc.icon;
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: isSelected ? rc.gradient : '#F3F4F6' }}
                          >
                            <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-900 text-lg">{rc.label}</span>
                              {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                            </div>
                            <p className="text-gray-500 text-sm mb-3">{rc.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {rc.benefits.map(b => (
                                <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{b}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: canProceedStep1 ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : '#334155' }}
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>

                <div className="mt-6 text-center">
                  <p className="text-slate-400 text-sm">
                    Already have an account?{' '}
                    <button
                      onClick={() => window.location.hash = '#login'}
                      className="text-blue-400 font-semibold hover:text-blue-300 underline underline-offset-2"
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Personal Info */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <div className="flex items-center gap-3 mb-6">
                  {cfg && (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.gradient }}>
                      <cfg.icon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Details</h2>
                    <p className="text-gray-500 text-sm">Tell us a bit about yourself</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="rahul@startup.com"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <select
                          value={countryCode}
                          onChange={e => setCountryCode(e.target.value)}
                          className="pl-3 pr-8 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                        >
                          {COUNTRY_CODES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="9876543210"
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City / Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="Mumbai, India"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
                    <div className="relative">
                      <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={e => setLinkedinUrl(e.target.value)}
                        placeholder="linkedin.com/in/yourprofile"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Website / Portfolio</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourstartup.com"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3.5 rounded-2xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: canProceedStep2 ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : '#9CA3AF' }}
                  >
                    Continue <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Role-specific Info */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <div className="flex items-center gap-3 mb-6">
                  {cfg && (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.gradient }}>
                      <cfg.icon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedRole === 'founder' ? 'Startup Details' : selectedRole === 'expert' ? 'Expertise Details' : 'Investment Profile'}
                    </h2>
                    <p className="text-gray-500 text-sm">Help us personalise your experience</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  {/* FOUNDER FIELDS */}
                  {selectedRole === 'founder' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Startup Name <span className="text-gray-400">(if any)</span></label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" value={startupName} onChange={e => setStartupName(e.target.value)} placeholder="Acme Inc."
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry <span className="text-red-500">*</span></label>
                          <select value={industry} onChange={e => setIndustry(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
                            <option value="" className="text-gray-500">Select...</option>
                            {INDUSTRIES.map(i => <option key={i} value={i} className="text-black">{i}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Stage <span className="text-red-500">*</span></label>
                          <select value={stage} onChange={e => setStage(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
                            <option value="" className="text-gray-500">Select...</option>
                            {STAGES.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Currently fundraising?</p>
                          <p className="text-xs text-gray-500">We'll connect you with relevant investors</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isFundraising}
                          aria-label="Currently fundraising"
                          onClick={() => setIsFundraising(!isFundraising)}
                          style={{
                            position: 'relative',
                            flexShrink: 0,
                            width: '44px',
                            height: '24px',
                            borderRadius: '9999px',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            backgroundColor: isFundraising ? '#3b82f6' : '#d1d5db',
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: '2px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '9999px',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transform: isFundraising ? 'translateX(20px)' : 'translateX(0)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </button>
                      </div>
                      {isFundraising && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Funding Goal (INR)</label>
                          <div className="relative">
                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={fundingGoal} onChange={e => setFundingGoal(e.target.value)} placeholder="₹50 Lakhs"
                              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Brief Bio</label>
                        <textarea value={founderBio} onChange={e => setFounderBio(e.target.value)} placeholder="Tell us about yourself and your startup journey..." rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all" />
                      </div>
                    </>
                  )}

                  {/* EXPERT FIELDS */}
                  {selectedRole === 'expert' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Expertise <span className="text-red-500">*</span></label>
                        <select value={expertise} onChange={e => setExpertise(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
                          <option value="" className="text-gray-500">Select your area...</option>
                          {EXPERTISE_LIST.map(e => <option key={e} value={e} className="text-black">{e}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience <span className="text-red-500">*</span></label>
                          <input type="number" min="1" max="50" value={yearsExp} onChange={e => setYearsExp(e.target.value)} placeholder="10"
                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Company</label>
                          <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="Google, Ex-Amazon..."
                              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Open to paid consultations?</p>
                          <p className="text-xs text-gray-500">Set your rates after signup</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={offerConsult}
                          aria-label="Open to paid consultations"
                          onClick={() => setOfferConsult(!offerConsult)}
                          style={{
                            position: 'relative',
                            flexShrink: 0,
                            width: '44px',
                            height: '24px',
                            borderRadius: '9999px',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            backgroundColor: offerConsult ? '#f78405' : '#d1d5db',
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: '2px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '9999px',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transform: offerConsult ? 'translateX(20px)' : 'translateX(0)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Brief Bio</label>
                        <textarea value={expertBio} onChange={e => setExpertBio(e.target.value)} placeholder="Share your background and what you're looking to help startups with..." rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all" />
                      </div>
                    </>
                  )}

                  {/* INVESTOR FIELDS */}
                  {selectedRole === 'investor' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Investor Type <span className="text-red-500">*</span></label>
                          <select value={investorType} onChange={e => setInvestorType(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
                            <option value="" className="text-gray-500">Select...</option>
                            {INVESTOR_TYPES.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Typical Check Size <span className="text-red-500">*</span></label>
                          <select value={checkSize} onChange={e => setCheckSize(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
                            <option value="" className="text-gray-500">Select...</option>
                            {CHECK_SIZES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Firm / Fund Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" value={firmName} onChange={e => setFirmName(e.target.value)} placeholder="Acme Ventures"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Industries</label>
                        <div className="flex flex-wrap gap-2">
                          {INDUSTRIES.map(ind => (
                            <button key={ind} type="button" onClick={() => toggleIndustry(ind)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${preferredIndustries.includes(ind)
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}>
                              {ind}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Brief Bio</label>
                        <textarea value={investorBio} onChange={e => setInvestorBio(e.target.value)} placeholder="Tell founders about your investment thesis and what you look for..." rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all" />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3.5 rounded-2xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!canProceedStep3 || submitting}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: canProceedStep3 ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : '#9CA3AF' }}
                  >
                    {submitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Complete Registration</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20"
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">You're In! 🎉</h2>
                <p className="text-gray-700 text-lg mb-2">Registration successful</p>
                <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
                  Our team will reach out to onboard you onto NextIgnition. In the meantime, create your full account to unlock all features.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: Heart, label: 'Personalized', desc: 'Curated matches' },
                    { icon: Star, label: 'Priority Access', desc: 'Early onboarding' },
                    { icon: BadgeCheck, label: 'Verified Profile', desc: 'Trusted network' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <Icon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-gray-900 text-sm font-semibold">{label}</p>
                      <p className="text-gray-500 text-xs">{desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => window.location.hash = '#signup'}
                    className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
                  >
                    <Rocket className="w-5 h-5" />
                    Create Full Account & Get Started
                  </button>
                  <button
                    onClick={() => window.location.hash = '#'}
                    className="w-full py-3 rounded-2xl font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all text-sm"
                  >
                    Go to Homepage
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Trust indicators */}
        {step < 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex items-center justify-center gap-6 text-gray-500 text-xs font-medium"
          >
            <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-blue-500" /> 100% Free</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-blue-500" /> No spam ever</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-blue-500" /> Data stays private</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
