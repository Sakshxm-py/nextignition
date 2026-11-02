import logoImage from '../assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Rocket, Lightbulb, DollarSign, CheckCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { brandColors } from '../utils/colors';
import { getSingletonApiBase } from '../utils/apiResolution';

import { googleLogin, register, initGoogleSignIn, nativeGoogleSignIn, appleLogin, nativeAppleSignIn, completeAuthRedirect } from '../services/authService';
import { Capacitor } from '@capacitor/core';

/* ── Google SVG icon ─────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.03 24.03 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

/* ── Apple SVG icon ──────────────────────────────────────── */
const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 814 1000">
    <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-167.2-137.1S92 312.3 92 280.8c0-168.4 110.1-257.6 215.7-257.6 79.1 0 144.6 52.2 194.7 52.2 48.1 0 123.8-55.4 214.4-55.4 33 0 120.2 3 179.2 53.7zm-165.9-111.4c-3.2-24.2-28.7-98.3-98.3-149.6-21.4-15.8-59.6-39-96.6-39-5.8 0-11.6.6-16.4 1.3 3.2 24.2 28.7 98.3 98.3 149.6 21.4 15.8 59.6 39 96.6 39 5.8 0 11.6-.6 16.4-1.3z"/>
  </svg>
);

type SignupStep = 'role-selection' | 'account-details';

interface UserRole {
  id: 'founder' | 'expert' | 'investor';
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  color: string;
  benefits: string[];
}

const GOOGLE_CLIENT_ID = Capacitor.isNativePlatform()
  ? (import.meta as any).env.VITE_GOOGLE_ANDROID_CLIENT_ID
  : (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

export function SignupPage() {
  const [currentStep, setCurrentStep] = useState<SignupStep>('role-selection');
  const [selectedRoles, setSelectedRoles] = useState<Array<'founder' | 'expert' | 'investor'>>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [checkingSettings, setCheckingSettings] = useState(true);
  const selectedRolesRef = useRef(selectedRoles);

  useEffect(() => {
    selectedRolesRef.current = selectedRoles;
  }, [selectedRoles]);

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const apiBase = getSingletonApiBase(import.meta.env.VITE_API_URL);
        const res = await fetch(`${apiBase}/public/settings`);
        if (res.ok) {
          const data = await res.json();
          setAllowRegistration(data.allowRegistration);
        }
      } catch (err) { console.error(err); }
      finally { setCheckingSettings(false); }
    };
    checkSettings();
  }, []);

  /* ── Google credential callback ───────────────────────── */
  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    try {
      setGoogleLoading(true);
      setError('');
      const currentRoles = selectedRolesRef.current;
      const data = await googleLogin({
        credential: response.credential,
        roles: currentRoles.length ? currentRoles : ['founder'],
        role: currentRoles.length ? currentRoles[0] : 'founder',
      });

      const userRoles = data.roles || (currentRoles.length ? currentRoles : [data.role]);
      sessionStorage.setItem('selectedRoles', JSON.stringify(userRoles));
      sessionStorage.setItem('userBasicInfo', JSON.stringify({ fullName: data.name, email: data.email }));
      completeAuthRedirect(data.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google signup failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  /* ── Google Sign-In: use official renderButton (same as LoginPage) — One Tap prompt() is flaky on mobile ─ */
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const mountId =
      currentStep === 'role-selection' ? 'google-signup-btn-role' : 'google-signup-btn-account';

    const clearRoleMount = () => {
      const el = document.getElementById('google-signup-btn-role');
      if (el) el.innerHTML = '';
    };
    const clearAccountMount = () => {
      const el = document.getElementById('google-signup-btn-account');
      if (el) el.innerHTML = '';
    };

    if (currentStep === 'role-selection' && selectedRoles.length === 0) {
      clearRoleMount();
      return;
    }

    const tryMount = () => {
      if (!initGoogleSignIn(GOOGLE_CLIENT_ID!, handleGoogleCredential)) return false;
      const g = (window as any).google;
      const container = document.getElementById(mountId);
      if (!container || !g?.accounts?.id?.renderButton) return false;
      container.innerHTML = '';
      try {
        g.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'signup_with',
          width: Math.min(420, container.offsetWidth || 400),
        });
      } catch (e) {
        console.error('Google signup renderButton error:', e);
        return false;
      }
      return true;
    };

    if (tryMount()) {
      return () => {
        clearRoleMount();
        clearAccountMount();
      };
    }

    const start = Date.now();
    const timer = setInterval(() => {
      if (tryMount() || Date.now() - start > 10000) clearInterval(timer);
    }, 300);

    return () => {
      clearInterval(timer);
      clearRoleMount();
      clearAccountMount();
    };
  }, [handleGoogleCredential, currentStep, selectedRoles.length]);

  const roles: UserRole[] = [
    {
      id: 'founder',
      title: 'Founder / Co-founder',
      subtitle: '',
      description: 'Build your startup, find co-founders, raise funding, get mentorship',
      icon: Rocket,
      color: brandColors.electricBlue,
      benefits: ['Pitch to investors', 'Find co-founders', 'Expert mentorship']
    },
    {
      id: 'expert',
      title: 'Expert / Mentor',
      subtitle: '',
      description: 'Share your expertise, mentor startups, earn revenue, build your brand',
      icon: Lightbulb,
      color: brandColors.atomicOrange,
      benefits: ['Monetize expertise', 'Build reputation', 'Flexible schedule']
    },
    {
      id: 'investor',
      title: 'Investor/VC',
      subtitle: '',
      description: 'Discover startups, access pitch decks, manage deal flow, co-invest',
      icon: DollarSign,
      color: brandColors.navyBlue,
      benefits: ['Curated deal flow', 'Due diligence tools', 'Co-investment network']
    }
  ];

  const testimonials = [
    {
      role: 'Founder',
      quote: 'Found my co-founder in 2 weeks',
      author: 'Founder',
      company: 'Early Stage Startup',
      avatar: 'F',
      color: brandColors.electricBlue
    },
    {
      role: 'Expert',
      quote: 'Built a sustainable channel for mentorship',
      author: 'Expert Advisor',
      company: 'Industry Specialist',
      avatar: 'E',
      color: brandColors.atomicOrange
    },
    {
      role: 'Investor',
      quote: 'Discovered high-quality investment deals',
      author: 'Angel Investor',
      company: 'Early Stage Fund',
      avatar: 'I',
      color: brandColors.navyBlue
    }
  ];

  useEffect(() => {
    const prefillRolesRaw = sessionStorage.getItem('prefillSelectedRoles');
    if (!prefillRolesRaw) return;

    try {
      const parsed = JSON.parse(prefillRolesRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validRoles = parsed.filter((r) => r === 'founder' || r === 'expert' || r === 'investor');
        if (validRoles.length > 0) {
          setSelectedRoles(validRoles);
          setCurrentStep('account-details');
        }
      }
    } catch {
      // ignore
    } finally {
      sessionStorage.removeItem('prefillSelectedRoles');
    }
  }, []);

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleRole = (roleId: 'founder' | 'expert' | 'investor') => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const handleRoleSubmit = () => {
    if (selectedRoles.length > 0) {
      setCurrentStep('account-details');
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const primaryRole = selectedRoles[0];
      const data = await register({
        name: fullName,
        email,
        password,
        role: primaryRole,
        roles: selectedRoles
      });

      // Save token & user info so the app recognises the session immediately
      if (data.token) {
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('token', data.token);
        // Persist the refresh token so the session renews instead of logging out.
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      }


      sessionStorage.setItem('selectedRoles', JSON.stringify(selectedRoles));
      sessionStorage.setItem('userBasicInfo', JSON.stringify({ fullName, email }));

      completeAuthRedirect(data.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* LEFT PANEL - Branding & Testimonials */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 flex-col justify-between relative overflow-hidden sticky top-0 h-screen">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <img src={logoImage} alt="NextIgnition" className="h-10 cursor-pointer" onClick={() => window.location.hash = '#'} />
          </motion.div>

          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Join the Startup<br />Ecosystem
            </h1>
            <p className="text-xl text-gray-300 max-w-lg">
              Choose your path to connect, build, and grow
            </p>
          </motion.div>

          {/* Rotating Testimonials */}
          <div className="relative h-48">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: testimonials[activeTestimonial].color }}
                    >
                      {testimonials[activeTestimonial].avatar}
                    </div>
                    <div>
                      <p className="text-white text-lg font-semibold mb-1">
                        "{testimonials[activeTestimonial].quote}"
                      </p>
                      <p className="text-gray-300 text-sm">
                        {testimonials[activeTestimonial].author}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {testimonials[activeTestimonial].company} • {testimonials[activeTestimonial].role}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Testimonial Dots */}
            <div className="absolute -bottom-8 left-0 flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${index === activeTestimonial ? 'bg-white w-6' : 'bg-white/40'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="flex -space-x-2">
            {['#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EC4899'].map((color, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: color }}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <div>
            <p className="text-white font-semibold">5,000+ founders, experts, and investors</p>
            <p className="text-gray-400 text-sm">Join the community today</p>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL - Role Selection / Account Details */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto min-h-screen">
        <div className="w-full max-w-2xl">
          <div className="lg:hidden mb-8 pt-[env(safe-area-inset-top)]">
            <img src={logoImage} alt="NextIgnition" className="h-8" />
          </div>

          {!allowRegistration && !checkingSettings ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center p-8 bg-gray-50 rounded-3xl border border-gray-200">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Rocket className="w-10 h-10 rotate-45" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration is Temporarily Closed</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                We've reached our current capacity for new members. We limit signups to ensure every founder and expert gets the premium attention they deserve.
              </p>
              <button onClick={() => window.location.hash = '#'} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors">
                Return to Home
              </button>
            </motion.div>
          ) : checkingSettings ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400 font-medium">Preparing your workspace...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
            {currentStep === 'role-selection' ? (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">I am a...</h2>
                  <p className="text-gray-600">Select your role(s) - you can choose multiple</p>
                </div>

                {/* Role Cards */}
                <div className="space-y-4 mb-8">
                  {roles.map((role, index) => (
                    <motion.div
                      key={role.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <button
                        onClick={() => toggleRole(role.id)}
                        className={`w-full p-6 rounded-2xl border-2 transition-all text-left group hover:shadow-lg ${selectedRoles.includes(role.id)
                          ? 'border-current shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                        style={{
                          borderColor: selectedRoles.includes(role.id) ? role.color : undefined
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl flex-shrink-0 transition-transform group-hover:scale-110"
                            style={{
                              backgroundColor: selectedRoles.includes(role.id) ? role.color : `${role.color}20`,
                            }}
                          >
                            <role.icon className="w-7 h-7" style={{ color: selectedRoles.includes(role.id) ? 'white' : role.color }} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{role.title}</h3>
                            <p className="text-sm text-gray-600 mb-3">{role.description}</p>

                            {/* Benefits */}
                            <div className="flex flex-wrap gap-2">
                              {role.benefits.map((benefit) => (
                                <span
                                  key={benefit}
                                  className="px-3 py-1 rounded-full text-xs font-medium border"
                                  style={{
                                    backgroundColor: selectedRoles.includes(role.id) ? `${role.color}15` : '#f3f4f6',
                                    borderColor: selectedRoles.includes(role.id) ? `${role.color}40` : '#e5e7eb',
                                    color: selectedRoles.includes(role.id) ? role.color : '#6b7280'
                                  }}
                                >
                                  {benefit}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Checkbox */}
                          <div className="flex-shrink-0">
                            <div
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${selectedRoles.includes(role.id)
                                ? 'border-transparent'
                                : 'border-gray-300'
                                }`}
                              style={{
                                backgroundColor: selectedRoles.includes(role.id) ? role.color : 'transparent'
                              }}
                            >
                              {selectedRoles.includes(role.id) && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* Continue Button */}
                <motion.button
                  onClick={handleRoleSubmit}
                  disabled={selectedRoles.length === 0}
                  whileHover={selectedRoles.length > 0 ? { scale: 1.02 } : {}}
                  whileTap={selectedRoles.length > 0 ? { scale: 0.98 } : {}}
                  className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${selectedRoles.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r hover:shadow-xl'
                    }`}
                  style={
                    selectedRoles.length > 0
                      ? {
                        background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                      }
                      : undefined
                  }
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                {/* Login Link */}
                <p className="text-center mt-6 text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => window.location.hash = '#login'}
                    className="text-orange-600 font-semibold hover:text-orange-700 underline-offset-4 hover:underline"
                  >
                    Log in
                  </button>
                </p>

                {/* Google Sign-Up (role-selection step) — hidden on iOS (Google
                    blocks OAuth in embedded WebViews; use Apple/email instead). */}
                {GOOGLE_CLIENT_ID && Capacitor.getPlatform() !== 'ios' && (
                  <>
                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-sm text-gray-400">or</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {Capacitor.isNativePlatform() ? (
                      <button
                        type="button"
                        onClick={async () => {
                          console.log('[NativeAuthSignup] Button clicked (Step 1)');
                          if (selectedRoles.length === 0) {
                            setError('Please select a role above first');
                            return;
                          }
                          setGoogleLoading(true);
                          setError('');
                          try {
                            const result = await nativeGoogleSignIn();
                            await handleGoogleCredential({ credential: result.credential });
                          } catch (err: any) {
                            console.error('[NativeAuth] Detailed Error:', err);
                            const msg = err.response?.data?.message || err.message || 'Native Google Sign-In failed.';
                            // Ignore generic format and user cancellation errors
                            if (msg !== 'Generic format error' && !msg.includes('12501') && !msg.toLowerCase().includes('cancel')) {
                              setError(`Google Error: ${msg}`);
                            }
                            setGoogleLoading(false);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all mb-2 relative overflow-hidden"
                        style={{ minHeight: '48px', borderRadius: '12px' }}
                        disabled={googleLoading || selectedRoles.length === 0}
                      >
                        {googleLoading ? (
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        ) : (
                          <>
                            <GoogleIcon />
                            <span>Continue with Google</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div
                        id="google-signup-btn-role"
                        className="w-full min-h-[48px] flex justify-center [&_iframe]:!max-w-full"
                      />
                    )}
                    {selectedRoles.length === 0 && (
                      <p className="text-xs text-orange-500 text-center mt-2">Please select a role above first</p>
                    )}

                    {/* Apple Sign-In — iOS only */}
                    {Capacitor.getPlatform() === 'ios' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedRoles.length === 0) { setError('Please select a role above first'); return; }
                          setAppleLoading(true); setError('');
                          try {
                            const result = await nativeAppleSignIn();
                            const data = await appleLogin({
                              ...result,
                              roles: selectedRoles.length ? selectedRoles : ['founder'],
                              role: selectedRoles.length ? selectedRoles[0] : 'founder',
                            });
                            const userRoles = data.roles || selectedRoles;
                            sessionStorage.setItem('selectedRoles', JSON.stringify(userRoles));
                            sessionStorage.setItem('userBasicInfo', JSON.stringify({ fullName: data.name, email: data.email }));
                            completeAuthRedirect(data.role);
                          } catch (err: any) {
                            const msg = String(err?.message || err?.error || '');
                            if (err?.code === '1001' || /cancel/i.test(msg)) { setAppleLoading(false); return; }
                            setError(err?.response?.data?.message || msg || 'Apple Sign-In failed. Please try again.');
                          } finally { setAppleLoading(false); }
                        }}
                        disabled={appleLoading || selectedRoles.length === 0}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-800 bg-white hover:bg-gray-50 transition-all mt-2 disabled:opacity-50"
                        style={{ minHeight: '48px' }}
                      >
                        {appleLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" /> : <><AppleIcon /><span>Continue with Apple</span></>}
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="account-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                {/* Back Button */}
                <button
                  onClick={() => setCurrentStep('role-selection')}
                  className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span className="text-sm font-medium">Back to role selection</span>
                </button>

                {/* Header */}
                <div className="mb-8">
                  <p className="text-gray-600">
                    You selected:{' '}
                    <span className="font-semibold">
                      {selectedRoles.map(roleId => roles.find(r => r.id === roleId)?.title).join(', ')}
                    </span>
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Google Sign-Up (account-details step) — hidden on iOS (Google
                    blocks OAuth in embedded WebViews; use Apple/email instead). */}
                {GOOGLE_CLIENT_ID && Capacitor.getPlatform() !== 'ios' && (
                  <>
                    {Capacitor.isNativePlatform() ? (
                      <button
                        type="button"
                        onClick={async () => {
                          console.log('[NativeAuthSignup] Button clicked (Step 2)');
                          setGoogleLoading(true);
                          setError('');
                          try {
                            const result = await nativeGoogleSignIn();
                            await handleGoogleCredential({ credential: result.credential });
                          } catch (err: any) {
                            if (err.message !== 'Generic format error') {
                              setError(err.message || 'Native Google Sign-In failed.');
                            }
                            setGoogleLoading(false);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all relative overflow-hidden"
                        style={{ minHeight: '48px', borderRadius: '12px' }}
                        disabled={googleLoading}
                      >
                        {googleLoading ? (
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        ) : (
                          <>
                            <GoogleIcon />
                            <span>Continue with Google</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div
                        id="google-signup-btn-account"
                        className="w-full min-h-[48px] flex justify-center [&_iframe]:!max-w-full"
                      />
                    )}
                    {googleLoading && (
                      <p className="text-xs text-center text-gray-500 mt-2">Completing Google sign-up…</p>
                    )}

                    {/* Apple Sign-In — iOS only */}
                    {Capacitor.getPlatform() === 'ios' && (
                      <button
                        type="button"
                        onClick={async () => {
                          setAppleLoading(true); setError('');
                          try {
                            const result = await nativeAppleSignIn();
                            const data = await appleLogin({
                              ...result,
                              roles: selectedRoles.length ? selectedRoles : ['founder'],
                              role: selectedRoles.length ? selectedRoles[0] : 'founder',
                            });
                            const userRoles = data.roles || selectedRoles;
                            sessionStorage.setItem('selectedRoles', JSON.stringify(userRoles));
                            sessionStorage.setItem('userBasicInfo', JSON.stringify({ fullName: data.name, email: data.email }));
                            completeAuthRedirect(data.role);
                          } catch (err: any) {
                            const msg = String(err?.message || err?.error || '');
                            if (err?.code === '1001' || /cancel/i.test(msg)) { setAppleLoading(false); return; }
                            setError(err?.response?.data?.message || msg || 'Apple Sign-In failed. Please try again.');
                          } finally { setAppleLoading(false); }
                        }}
                        disabled={appleLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-800 bg-white hover:bg-gray-50 transition-all mt-2 disabled:opacity-50"
                        style={{ minHeight: '48px' }}
                      >
                        {appleLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" /> : <><AppleIcon /><span>Continue with Apple</span></>}
                      </button>
                    )}

                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-sm text-gray-400">or sign up with email</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  </>
                )}

                {/* Account Form */}
                <form className="space-y-5 mb-8" onSubmit={handleAccountSubmit}>
                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-gray-700">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        id="fullName"
                        name="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                        autoComplete="email"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-700">
                      Password
                    </label>
                    <div className="flex items-center w-full pl-4 pr-2 py-3.5 rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                      <Lock className="w-5 h-5 text-gray-400 mr-3 shrink-0 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full p-0 border-0 bg-transparent focus:outline-none focus:ring-0"
                        required
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="ml-2 shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none p-0 border-0 bg-transparent cursor-pointer appearance-none"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Must be at least 8 characters
                    </p>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="terms"
                      className="w-4 h-4 rounded border-gray-300 mt-1"
                      style={{ accentColor: brandColors.electricBlue }}
                      required
                    />
                    <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                      I agree to the{' '}
                      <a
                        href="#terms"
                        onClick={(e) => { e.preventDefault(); window.location.hash = '#terms'; }}
                        className="underline"
                        style={{ color: brandColors.electricBlue }}
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="#privacy"
                        onClick={(e) => { e.preventDefault(); window.location.hash = '#privacy'; }}
                        className="underline"
                        style={{ color: brandColors.electricBlue }}
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    style={{
                      background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                    }}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      </div>
    </div>
  );
}