import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, TrendingUp, DollarSign, Users, BookOpen, Lightbulb,
  Network, Target, ArrowRight, CheckCircle, Sparkles, Star,
  Briefcase, GraduationCap, Heart, Zap
} from 'lucide-react';
import api from '../services/api';
import { getCurrentUser, setCurrentUser } from '../services/authService';

// ── Data ─────────────────────────────────────────────────────────────────────

const WHY_OPTIONS = [
  { id: 'networking', icon: Network, label: 'Networking', desc: 'Connect with like-minded people' },
  { id: 'learning', icon: BookOpen, label: 'Learning', desc: 'Gain new knowledge & skills' },
  { id: 'funding', icon: DollarSign, label: 'Fundraising', desc: 'Find investors & capital' },
  { id: 'mentorship', icon: Star, label: 'Mentorship', desc: 'Find or become a mentor' },
  { id: 'hiring', icon: Briefcase, label: 'Hiring / Jobs', desc: 'Recruit or find opportunities' },
  { id: 'inspiration', icon: Lightbulb, label: 'Inspiration', desc: 'Get motivated & inspired' },
  { id: 'partnerships', icon: Target, label: 'Partnerships', desc: 'Build business collaborations' },
  { id: 'community', icon: Heart, label: 'Community', desc: 'Be part of something bigger' },
];

const ROLE_OPTIONS = [
  {
    id: 'founder',
    icon: Rocket,
    label: 'Founder / Co-Founder',
    desc: "I'm building a startup",
    gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',
    bg: '#EFF6FF',
    border: '#2563EB',
  },
  {
    id: 'expert',
    icon: TrendingUp,
    label: 'Expert / Mentor',
    desc: "I want to share knowledge",
    gradient: 'linear-gradient(135deg, #EA580C, #D97706)',
    bg: '#FFF7ED',
    border: '#EA580C',
  },
  {
    id: 'investor',
    icon: DollarSign,
    label: 'Investor',
    desc: "I'm looking to invest",
    gradient: 'linear-gradient(135deg, #7C3AED, #2563EB)',
    bg: '#F5F3FF',
    border: '#7C3AED',
  },
  {
    id: 'student',
    icon: GraduationCap,
    label: 'Student / Researcher',
    desc: "I'm here to learn & explore",
    gradient: 'linear-gradient(135deg, #059669, #0891B2)',
    bg: '#ECFDF5',
    border: '#059669',
  },
  {
    id: 'enthusiast',
    icon: Users,
    label: 'Enthusiast / Observer',
    desc: "I love the startup ecosystem",
    gradient: 'linear-gradient(135deg, #DB2777, #9333EA)',
    bg: '#FDF2F8',
    border: '#DB2777',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function EventSurveyPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentUser = getCurrentUser();

  const toggleReason = (id: string) => {
    setSelectedReasons(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    setError('');
    try {
      // Update the guest user's profile with survey answers
      await api.put('/auth/profile', {
        guestSurvey: {
          whyAttend: selectedReasons,
          eventRole: selectedRole,
          completedAt: new Date().toISOString(),
        },
      });

      // Refresh the stored user so the app reflects the survey completion
      const user = getCurrentUser();
      if (user) {
        setCurrentUser({ ...user, guestSurvey: { whyAttend: selectedReasons, eventRole: selectedRole } });
      }

      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToEvents = () => {
    window.location.hash = '#events';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-purple-100 blur-3xl opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-50 blur-3xl opacity-40" />
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
            Quick Survey — Takes 30 seconds
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 leading-tight">
            Tell Us About<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Yourself
            </span>
          </h1>
          <p className="text-gray-500 text-lg">
            {currentUser?.name ? `Hey ${currentUser.name}! Help` : 'Help'} us personalise your event experience.
          </p>
        </motion.div>

        {/* Progress */}
        {step < 3 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Step {step} of 2</span>
              <span>{step === 1 ? '50' : '100'}% complete</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: step === 1 ? '50%' : '100%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {['Why Attend?', 'Your Event Role'].map((label, i) => (
                <div
                  key={i}
                  className={`text-xs font-medium ${step > i + 1 ? 'text-blue-500' : step === i + 1 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}
                >
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

            {/* STEP 1 — Why attend */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Why do you want to attend events?</h2>
                <p className="text-gray-500 text-sm mb-6">Select all that apply</p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {WHY_OPTIONS.map(({ id, icon: Icon, label, desc }) => {
                    const selected = selectedReasons.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleReason(id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              selected ? 'bg-blue-500' : 'bg-gray-100'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${selected ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${selected ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                          </div>
                        </div>
                        {selected && (
                          <div className="flex justify-end mt-2">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={selectedReasons.length === 0}
                  className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: selectedReasons.length > 0
                      ? 'linear-gradient(135deg, #2563EB, #7C3AED)'
                      : '#9CA3AF',
                  }}
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* STEP 2 — Event role */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Which role best describes you?</h2>
                <p className="text-gray-500 text-sm mb-6">Choose how you'd like to engage at events</p>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-3 mb-8">
                  {ROLE_OPTIONS.map(({ id, icon: Icon, label, desc, gradient, bg, border }) => {
                    const selected = selectedRole === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedRole(id)}
                        className="w-full p-4 rounded-2xl border-2 text-left transition-all"
                        style={{
                          borderColor: selected ? border : '#F3F4F6',
                          background: selected ? bg : '#FFFFFF',
                          boxShadow: selected ? `0 4px 14px ${border}25` : undefined,
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: selected ? gradient : '#F3F4F6' }}
                          >
                            <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{label}</p>
                            <p className="text-sm text-gray-500">{desc}</p>
                          </div>
                          {selected && <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: border }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3.5 rounded-2xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedRole || submitting}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: selectedRole ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : '#9CA3AF',
                    }}
                  >
                    {submitting ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                    ) : (
                      <><Zap className="w-5 h-5" /> Go to Events</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Success */}
            {step === 3 && (
              <motion.div
                key="step3"
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

                <h2 className="text-3xl font-bold text-gray-900 mb-3">You're All Set! 🎉</h2>
                <p className="text-gray-500 text-lg mb-2">Thanks for sharing your goals.</p>
                <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
                  You have <strong className="text-blue-600">1 free event</strong> as a guest. {Capacitor.getPlatform() === 'ios' ? 'Create a free account anytime to unlock unlimited access.' : 'Upgrade anytime to unlock unlimited access.'}
                </p>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Guest Access Activated</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        You can register for and attend 1 event. Create a full account to attend more.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={goToEvents}
                    className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
                  >
                    <Rocket className="w-5 h-5" />
                    Browse Events
                  </button>
                  <button
                    onClick={() => window.location.hash = '#signup'}
                    className="w-full py-3 rounded-2xl font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all text-sm"
                  >
                    Create Full Account — Unlimited Access
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Trust */}
        {step < 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex items-center justify-center gap-6 text-gray-400 text-xs font-medium"
          >
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-blue-500" /> 30 seconds</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-blue-500" /> No spam</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Cancel anytime</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
