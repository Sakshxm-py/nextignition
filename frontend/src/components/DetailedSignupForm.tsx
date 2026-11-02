import { useState, useRef, type ChangeEvent } from 'react';
import api from '../services/api';
import { requestVerificationOtp } from '../services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  Upload,
  Camera,
  Video,
  Linkedin,
  Twitter,
  Github,
  Instagram,
  Sparkles,
  Loader2,
  BadgeCheck,
  Clock,
  Mail,
  ChevronDown,
  Rocket,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { formatWithCommas, parseNumericValue } from '../utils/formatters';
import logoImage from '../assets/logo.png';

type SignupStep = 1 | 2 | 3 | 4;
type UserRole = 'founder' | 'expert' | 'investor';

interface DetailedSignupFormProps {
  selectedRoles: UserRole[];
  userInfo: { fullName: string; email: string };
  onComplete: () => void;
}

export function DetailedSignupForm({ selectedRoles, userInfo, onComplete }: DetailedSignupFormProps) {
  const [currentStep, setCurrentStep] = useState<SignupStep>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [linkedinOption, setLinkedinOption] = useState<'connect' | 'url'>('connect');
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Form state - Basic Info
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Founder fields
  const [hasStartup, setHasStartup] = useState<'yes' | 'no' | 'building'>('building');
  const [startupName, setStartupName] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [isFundraising, setIsFundraising] = useState(false);

  // Expert fields
  const [expertise, setExpertise] = useState('');
  const [experience, setExperience] = useState('');
  const [previousRoles, setPreviousRoles] = useState('');
  const [offerConsultations, setOfferConsultations] = useState(false);

  // Investor fields
  const [investorType, setInvestorType] = useState('');
  const [firmName, setFirmName] = useState('');
  const [checkSize, setCheckSize] = useState('');
  const [investmentStages, setInvestmentStages] = useState<string[]>([]);
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);

  // Optional fields
  const [bio, setBio] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleResendEmail = async () => {
    if (!userInfo?.email || isResendingEmail) return;
    setIsResendingEmail(true);
    setResendMessage('');
    try {
      await requestVerificationOtp(userInfo.email);
      setResendMessage('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMessage('Could not resend right now. Please try again in a moment.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleProfilePictureChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(URL.createObjectURL(file));
    }
    // Reset so selecting the same file again still fires onChange
    e.target.value = '';
  };

  const primaryRole = selectedRoles[0];

  const roleConfig = {
    founder: {
      message: 'Start your funding journey',
      icon: Rocket,
      color: brandColors.electricBlue,
      gradient: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
    },
    expert: {
      message: 'Start earning from your expertise',
      icon: TrendingUp,
      color: brandColors.atomicOrange,
      gradient: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})`
    },
    investor: {
      message: 'Access exclusive deal flow',
      icon: DollarSign,
      color: brandColors.navyBlue,
      gradient: `linear-gradient(135deg, ${brandColors.navyBlue}, ${brandColors.electricBlue})`
    }
  };

  const config = roleConfig[primaryRole];

  // Username format validation (uniqueness is enforced by the server at registration).
  const checkUsername = (value: string) => {
    setUsername(value);
    if (value.length === 0) {
      setUsernameAvailable(null);
    } else {
      setUsernameAvailable(value.length >= 3 && /^[a-zA-Z0-9_]+$/.test(value));
    }
  };

  const handleLinkedinConnect = () => {
    // Open LinkedIn so the user can copy their profile URL, then capture it via the
    // URL field. (No fake "instant verification".)
    window.open('https://www.linkedin.com', '_blank', 'noopener');
    setLinkedinOption('url');
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as SignupStep);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as SignupStep);
    }
  };

  const handleSubmit = async () => {
    if (currentStep === 3) {
      setCurrentStep(4); // Go to verification screen

      // Persist hasStartup for founders so the backend recognises them as existing-product founders
      if (selectedRoles.includes('founder') && hasStartup) {
        try {
          await api.put('/auth/profile', { hasStartup });
        } catch {
          // Non-critical — proceed regardless
        }
      }

      if (isVerified) {
        setTimeout(() => {
          onComplete();
        }, 5000);
      }
    }
  };

  const toggleIndustry = (ind: string) => {
    if (preferredIndustries.includes(ind)) {
      setPreferredIndustries(preferredIndustries.filter(i => i !== ind));
    } else {
      setPreferredIndustries([...preferredIndustries, ind]);
    }
  };

  const toggleStage = (stg: string) => {
    if (investmentStages.includes(stg)) {
      setInvestmentStages(investmentStages.filter(s => s !== stg));
    } else {
      setInvestmentStages([...investmentStages, stg]);
    }
  };

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-white flex">
      {/* LEFT PANEL - Static messaging */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 flex-col justify-between relative overflow-hidden sticky top-0 h-screen">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-16">
            <img
              src={logoImage}
              alt="NextIgnition"
              className="h-10 cursor-pointer"
              onClick={() => window.location.hash = '#'}
            />
            <button
              onClick={() => window.location.hash = '#signup'}
              className="text-white/80 hover:text-white flex items-center gap-2 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Change role
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: config.color }}
            >
              <config.icon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
              Complete Your Profile
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              {selectedRoles.length > 1
                ? `You're signing up as ${selectedRoles.length} roles`
                : config.message
              }
            </p>

            {/* Selected Roles Display */}
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedRoles.map(role => (
                <div
                  key={role}
                  className="px-4 py-2 rounded-full text-white text-sm font-semibold"
                  style={{ backgroundColor: roleConfig[role].color }}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </div>
              ))}
            </div>
          </motion.div>

          {currentStep <= 3 && (
            <div className="mt-12">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white font-semibold">Step {currentStep} of {totalSteps}</span>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {currentStep === 1 && 'Verification & Basic Info'}
                {currentStep === 2 && 'Role-Specific Details'}
                {currentStep === 3 && 'Profile Enhancements'}
              </p>
            </div>
          )}
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-start gap-3">
            <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-white text-sm">Instant verification with LinkedIn</p>
          </div>
          <div className="flex items-start gap-3">
            <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-white text-sm">Connect with 5,000+ verified members</p>
          </div>
          <div className="flex items-start gap-3">
            <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-white text-sm">AI-powered matching and recommendations</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Scrollable form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* STEP 1: LinkedIn Verification & Basic Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
                  <p className="text-gray-600">Quick verification to unlock instant access</p>
                </div>

                {/* LinkedIn Verification */}
                <div className="border-2 border-blue-100 bg-blue-50 rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <label className="block text-sm font-medium text-gray-900">
                      LinkedIn Profile <span className="text-red-500">*</span>
                    </label>
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded">
                      Recommended
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-4">
                    LinkedIn required for profile verification and instant access
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="linkedin"
                        checked={linkedinOption === 'connect'}
                        onChange={() => setLinkedinOption('connect')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">Connect with LinkedIn</p>
                        <button
                          type="button"
                          onClick={handleLinkedinConnect}
                          disabled={isVerifying || isVerified}
                          className="w-full py-2.5 px-4 bg-[#0A66C2] text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#004182] transition-colors disabled:opacity-50"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Connecting...
                            </>
                          ) : isVerified ? (
                            <>
                              <BadgeCheck className="w-5 h-5" />
                              Connected
                            </>
                          ) : (
                            <>
                              <Linkedin className="w-5 h-5" />
                              Connect with LinkedIn
                            </>
                          )}
                        </button>
                        {isVerified && (
                          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3 text-blue-600" />
                            Instant verification complete!
                          </p>
                        )}
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="linkedin"
                        checked={linkedinOption === 'url'}
                        onChange={() => setLinkedinOption('url')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">Enter LinkedIn URL</p>
                        {linkedinOption === 'url' && (
                          <>
                            <input
                              name="linkedin_url"
                              type="url"
                              value={linkedinUrl}
                              onChange={(e) => setLinkedinUrl(e.target.value)}
                              placeholder="linkedin.com/in/yourprofile"
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoComplete="url"
                            />
                            <p className="text-xs text-orange-600 mt-2">
                              ⏱️ Manual verification required (24-48 hours)
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username (Handle) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => checkUsername(e.target.value)}
                      placeholder="johndoe"
                      className="w-full pl-8 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      autoComplete="username"
                    />
                    {usernameAvailable !== null && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {usernameAvailable ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-xs text-red-500 mt-1">
                      Use at least 3 characters — letters, numbers, or underscores only.
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-gray-400">(Optional)</span>
                  </label>
                  <div className="flex gap-3">
                    <select name="select-4b7d98" className="px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>+91</option>
                      <option>+1</option>
                      <option>+44</option>
                    </select>
                    <input name="input-c01886"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <input name="input-90ab7f" type="checkbox" className="rounded" />
                    Send me updates via SMS
                  </label>
                </div>

                <button
                  onClick={handleNextStep}
                  disabled={!username || usernameAvailable === false || (!isVerified && linkedinOption === 'connect' && !linkedinUrl)}
                  className="w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: config.gradient }}
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* STEP 2: Role-Specific Fields (All Selected Roles) */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell Us About Yourself</h2>
                  <p className="text-gray-600">Complete the sections for your selected role(s)</p>
                </div>

                {/* FOUNDER SECTION */}
                {selectedRoles.includes('founder') && (
                  <div className="border-2 border-blue-100 rounded-2xl p-6 bg-blue-50/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Rocket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Founder Profile</h3>
                        <p className="text-sm text-gray-600">Startup & fundraising details</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Do you have a startup?
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['yes', 'no', 'building'] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setHasStartup(option)}
                              className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${hasStartup === option
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {hasStartup === 'yes' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Startup Name
                            </label>
                            <input name="input-31463a"
                              type="text"
                              value={startupName}
                              onChange={(e) => setStartupName(e.target.value)}
                              placeholder="Acme Inc."
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Industry
                              </label>
                              <select name="select-dbe852"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select...</option>
                                <option>SaaS</option>
                                <option>FinTech</option>
                                <option>HealthTech</option>
                                <option>EdTech</option>
                                <option>E-commerce</option>
                                <option>AI/ML</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stage
                              </label>
                              <select name="select-1f4716"
                                value={stage}
                                onChange={(e) => setStage(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select...</option>
                                <option>Idea</option>
                                <option>MVP</option>
                                <option>Growth</option>
                                <option>Scaling</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                            <div>
                              <p className="font-medium text-gray-900">Are you fundraising?</p>
                              <p className="text-xs text-gray-500">We'll help you submit your pitch after signup</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsFundraising(!isFundraising)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${isFundraising ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isFundraising ? 'translate-x-6' : ''
                                  }`}
                              />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* EXPERT SECTION */}
                {selectedRoles.includes('expert') && (
                  <div className="border-2 border-orange-100 rounded-2xl p-6 bg-orange-50/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Expert Profile</h3>
                        <p className="text-sm text-gray-600">Expertise & experience details</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Primary Expertise <span className="text-red-500">*</span>
                        </label>
                        <select name="select-3b9cc5"
                          value={expertise}
                          onChange={(e) => setExpertise(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          required
                        >
                          <option value="">Select...</option>
                          <option>Growth Marketing</option>
                          <option>Product Management</option>
                          <option>Tech/CTO</option>
                          <option>Fundraising</option>
                          <option>Sales</option>
                          <option>Design/UX</option>
                          <option>Operations</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Years of Experience <span className="text-red-500">*</span>
                        </label>
                        <input name="input-b8e474"
                          type="text"
                          value={formatWithCommas(experience)}
                          onChange={(e) => {
                            const val = parseNumericValue(e.target.value);
                            if (val === '' || /^\d+$/.test(val)) setExperience(val);
                          }}
                          placeholder="10"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Previous Companies/Roles <span className="text-gray-400">(Optional)</span>
                        </label>
                        <input name="input-9a8bdc"
                          type="text"
                          value={previousRoles}
                          onChange={(e) => setPreviousRoles(e.target.value)}
                          placeholder="Ex-Google PM, Ex-Stripe Growth"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Offer paid consultations?</p>
                          <p className="text-xs text-gray-500">Set your rates after profile setup</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOfferConsultations(!offerConsultations)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${offerConsultations ? 'bg-orange-500' : 'bg-gray-300'
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${offerConsultations ? 'translate-x-6' : ''
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* INVESTOR SECTION */}
                {selectedRoles.includes('investor') && (
                  <div className="border-2 border-purple-100 rounded-2xl p-6 bg-purple-50/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Investor Profile</h3>
                        <p className="text-sm text-gray-600">Investment preferences & details</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Investor Type <span className="text-red-500">*</span>
                        </label>
                        <select name="select-9ea3b1"
                          value={investorType}
                          onChange={(e) => setInvestorType(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        >
                          <option value="">Select...</option>
                          <option>Angel</option>
                          <option>VC</option>
                          <option>Family Office</option>
                          <option>Syndicate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          VC Firm/Fund Name <span className="text-gray-400">(Optional)</span>
                        </label>
                        <input name="input-7b108b"
                          type="text"
                          value={firmName}
                          onChange={(e) => setFirmName(e.target.value)}
                          placeholder="Acme Ventures"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Typical Check Size <span className="text-red-500">*</span>
                        </label>
                        <select name="select-bdeb2c"
                          value={checkSize}
                          onChange={(e) => setCheckSize(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        >
                          <option value="">Select...</option>
                          <option>₹5L - ₹25L</option>
                          <option>₹25L - ₹1Cr</option>
                          <option>₹1Cr+</option>
                          <option>Flexible</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Investment Stage <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Pre-seed', 'Seed', 'Series A', 'Series B+'].map((stg) => (
                            <button
                              key={stg}
                              type="button"
                              onClick={() => toggleStage(stg)}
                              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${investmentStages.includes(stg)
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              {stg}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Preferred Industries
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML'].map((ind) => (
                            <button
                              key={ind}
                              type="button"
                              onClick={() => toggleIndustry(ind)}
                              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${preferredIndustries.includes(ind)
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              {ind}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-800">
                          ℹ️ Investor profiles require manual verification for platform quality
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handlePreviousStep}
                    className="px-6 py-4 rounded-xl font-bold border-2 border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    style={{ background: config.gradient }}
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Optional Enhancements */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Make Your Profile Stand Out
                  </h2>
                  <p className="text-gray-600">Optional - but highly recommended</p>
                </div>

                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Profile Picture
                  </label>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    {profilePicture && (
                      <button
                        type="button"
                        onClick={() => setProfilePicture('')}
                        className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-sm font-medium">Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2"
                    >
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-sm font-medium">Take Photo</span>
                    </button>
                  </div>
                </div>

                {/* Intro Video */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <Video className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">30-Second Intro Video</p>
                      <p className="text-sm text-gray-600 mb-3">
                        📈 Profiles with videos get 3x more engagement
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Record
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Social Links
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input name="input-b41310"
                        type="url"
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                        placeholder="twitter.com/yourusername"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="relative">
                      <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input name="input-8b526a"
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="github.com/yourusername"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio/Tagline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio/Tagline
                  </label>
                  <textarea name="textarea-43b2dc"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="Tell us about yourself in 160 characters..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate with Ignisha AI
                    </button>
                    <span className="text-xs text-gray-500">{bio.length}/160</span>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    onClick={handlePreviousStep}
                    className="px-6 py-4 rounded-xl font-bold border-2 border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    style={{ background: config.gradient }}
                  >
                    Complete Profile
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full text-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Skip for Now
                </button>
              </motion.div>
            )}

            {/* STEP 4: Verification Screen */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-12"
              >
                {isVerified ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', duration: 0.6 }}
                      className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6"
                    >
                      <BadgeCheck className="w-12 h-12 text-blue-600" />
                    </motion.div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                      Welcome to NextIgnition!
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                      Your profile is verified ✓
                    </p>

                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                      {selectedRoles.map(role => {
                        const RoleIcon = roleConfig[role].icon;
                        return (
                          <div
                            key={role}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold"
                            style={{ backgroundColor: `${roleConfig[role].color}20`, color: roleConfig[role].color }}
                          >
                            <RoleIcon className="w-5 h-5" />
                            {role.charAt(0).toUpperCase() + role.slice(1)} Profile Activated
                          </div>
                        );
                      })}
                    </div>

                    <div className="max-w-md mx-auto">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Setting up your dashboard...</span>
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 5 }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-3 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="text-sm">Account created</span>
                        </div>
                        <div className="flex items-center gap-3 text-blue-600">
                          <BadgeCheck className="w-5 h-5" />
                          <span className="text-sm">LinkedIn verified</span>
                        </div>
                        <div className="flex items-center gap-3 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="text-sm">Profile analyzed</span>
                        </div>
                        <div className="flex items-center gap-3 text-blue-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Setting up your dashboard...</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6"
                    >
                      <Clock className="w-12 h-12 text-amber-600" />
                    </motion.div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                      Almost There!
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                      Your profile is under review
                    </p>

                    <div className="max-w-md mx-auto mb-8">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm text-blue-800 mb-2">
                          📧 We sent a verification email to <strong>{userInfo?.email || 'your email'}</strong>
                        </p>
                        <button
                          type="button"
                          onClick={handleResendEmail}
                          disabled={isResendingEmail}
                          className="text-sm text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-60"
                        >
                          {isResendingEmail ? 'Sending…' : 'Resend Email'}
                        </button>
                        {resendMessage && (
                          <p className="text-xs text-blue-700 mt-2">{resendMessage}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={onComplete}
                      className="px-8 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ background: config.gradient }}
                    >
                      Go to Dashboard
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}