import { Capacitor } from '@capacitor/core';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Wrench,
  TrendingUp,
  Rocket,
  CheckCircle,
  ArrowRight,
  HelpCircle,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { IdeationStageFlow } from './IdeationStageFlow';
import { MVPDevelopmentFlow } from './MVPDevelopmentFlow';
import { GrowthFundraisingFlow } from './GrowthFundraisingFlow';
import { ScalingOperationsFlow } from './ScalingOperationsFlow';
import { StartupProfilePage } from './StartupProfilePage';
import { StartupProfilesManager } from './StartupProfilesManager';
import { StageAssessmentModal } from './StageAssessmentModal';
import { StartupJourneyHub } from './StartupJourneyHub';
import { canAccessStage, ensureJourney, getActiveStartupProfileId, readCreatedProfiles, setActiveStartupProfileId } from '../services/startupJourneyService';
import { getAllStartups } from '../services/startupService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { toast } from 'sonner';

interface MyStartupPageProps {
  userRole?: 'founder' | 'investor' | 'expert';
  onNavigate?: (tab: string, subTab?: string) => void;
}

type StartupStage = 'ideation' | 'mvp' | 'growth' | 'scaling' | null;

export function MyStartupPage({ userRole = 'founder', onNavigate }: MyStartupPageProps) {
  const [selectedStage, setSelectedStage] = useState<StartupStage>(null);
  const [showFlow, setShowFlow] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showProfileAfterCompletion, setShowProfileAfterCompletion] = useState(false);
  const [showProfilesManager, setShowProfilesManager] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [publicStartups, setPublicStartups] = useState<any[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const { userPlan } = useFeatureAccess();

  // Load created profiles from localStorage
  const createdProfiles = readCreatedProfiles();
  const allProfiles = [...createdProfiles];

  // Check if user has already created a startup profile
  const hasStartupProfile = sessionStorage.getItem('hasStartupProfile') === 'true';

  const refreshSelectedProfile = () => {
    const activeId = selectedProfileId || getActiveStartupProfileId();
    if (!activeId) return;
    const latest = (readCreatedProfiles() as any[]).find((p) => String(p?.id) === String(activeId));
    if (latest) setSelectedProfile(ensureJourney(latest));
  };

  useEffect(() => {
    if (userRole !== 'founder') return;
    const activeId = getActiveStartupProfileId();
    const initialId = activeId || (allProfiles[0]?.id ? String(allProfiles[0].id) : null);
    if (initialId && allProfiles.length > 0) {
      setSelectedProfileId(initialId);
      setActiveStartupProfileId(initialId);
      const p = allProfiles.find((x: any) => String(x?.id) === String(initialId));
      if (p) setSelectedProfile(ensureJourney(p));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'founder') return;
    let cancelled = false;
    const run = async () => {
      try {
        setPublicLoading(true);
        const data = await getAllStartups();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setPublicStartups(list.map((s) => ensureJourney(s)));
        const first = list[0];
        if (first?.id) {
          setSelectedProfileId(String(first.id));
          setSelectedProfile(ensureJourney(first));
        }
      } catch {
        if (!cancelled) setPublicStartups([]);
      } finally {
        if (!cancelled) setPublicLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [userRole]);

  const selectableStartups = useMemo(() => {
    if (userRole === 'founder') return allProfiles.map((p: any) => ensureJourney(p));
    return publicStartups;
  }, [allProfiles, publicStartups, userRole]);

  const stageCards = [
    {
      id: 'ideation',
      icon: Lightbulb,
      emoji: '💡',
      title: 'Ideation Stage',
      badge: 'Ideation',
      color: brandColors.electricBlue,
      bgGradient: 'from-blue-500/5 to-blue-600/5',
      borderColor: 'border-blue-500',
      description: 'I have an idea and need to validate it, build a business model, and find co-founders',
      benefits: [
        'AI business idea validator',
        'Co-founder matching',
        'Business model canvas builder',
        'Market research tools',
        'Access to mentor consultations'
      ],
      ctaText: 'Start Ideation Journey',
      ctaColor: brandColors.electricBlue
    },
    {
      id: 'mvp',
      icon: Wrench,
      emoji: '🛠️',
      title: 'MVP Development',
      badge: 'MVP Development',
      color: brandColors.atomicOrange,
      bgGradient: 'from-orange-500/5 to-orange-600/5',
      borderColor: 'border-orange-500',
      description: 'I need to build my Minimum Viable Product with expert technical support',
      benefits: [
        'MVP Development Service (Platform Team)',
        'Access to verified tech experts/CTOs',
        'Product requirements workshop',
        'UI/UX design consultation',
        'Technical architecture planning',
        'No-code/low-code options assessment'
      ],
      ctaText: 'Request MVP Development',
      ctaColor: brandColors.atomicOrange,
      priceTag: 'Starting at ₹50,000',
      priceLink: 'Get Quote'
    },
    {
      id: 'growth',
      icon: TrendingUp,
      emoji: '📈',
      title: 'Growth & Fundraising',
      badge: 'Growth/Funding',
      color: brandColors.navyBlue,
      bgGradient: 'from-indigo-500/5 to-indigo-600/5',
      borderColor: 'border-indigo-600',
      description: 'I have an MVP and need funding, investor connections, and growth strategies',
      benefits: [
        'Pitch deck review & optimization',
        'Direct investor introductions',
        'Traction metrics dashboard',
        'Funding portal submission (featured)',
        'Growth marketing consultation',
        'Term sheet & legal support'
      ],
      ctaText: 'Submit for Funding',
      ctaColor: brandColors.navyBlue,
      requirement: 'Elite Tier Required',
      requirementLink: 'Upgrade to Access'
    },
    {
      id: 'scaling',
      icon: Rocket,
      emoji: '🚀',
      title: 'Scaling & Operations',
      badge: 'Scaling',
      color: '#10b981',
      bgGradient: 'from-green-500/5 to-green-600/5',
      borderColor: 'border-green-500',
      description: 'I\'ve raised funding and need help scaling operations, hiring, and expanding',
      benefits: [
        'Hiring & team building support',
        'Market expansion strategies',
        'Advanced analytics & BI tools',
        'C-suite advisor connections',
        'Enterprise sales consultation',
        'Process automation guidance'
      ],
      ctaText: 'Access Scaling Resources',
      ctaColor: '#10b981',
      requirement: 'Requires verified funding history'
    }
  ];

  const handleStageSelect = (stageId: StartupStage) => {
    if (userRole !== 'founder') return;
    if (!stageId) return;

    const j = selectedProfile?.journey;
    if (j && !canAccessStage(j, stageId)) return;

    if (stageId === 'growth' && userPlan === 'free') {
      toast.error(Capacitor.getPlatform() === 'ios'
        ? "The Growth & Fundraising stage is available with NextIgnition Premium."
        : "The Growth & Fundraising stage requires a Pro or Elite subscription.", {
        action: { label: 'View Plans', onClick: () => window.location.hash = '#pricing' }
      });
      return;
    }

    setSelectedStage(stageId);
    setShowFlow(true);
  };

  const handleBackToGateway = () => {
    setShowFlow(false);
    setSelectedStage(null);
  };

  const handleCompletion = () => {
    setShowFlow(false);
    setSelectedStage(null);
    setShowProfileAfterCompletion(true);
    refreshSelectedProfile();
  };

  const handleBackFromProfile = () => {
    setShowProfileAfterCompletion(false);
  };

  const handleOpenProfilesManager = () => {
    setShowProfilesManager(true);
  };

  const handleCloseProfilesManager = () => {
    setShowProfilesManager(false);
  };

  const handleSelectProfile = (profileId: string) => {
    const profile = allProfiles.find(p => p.id === profileId);
    setSelectedProfile(profile ? ensureJourney(profile) : null);
    setSelectedProfileId(profileId);
    setActiveStartupProfileId(profileId);
    setShowProfilesManager(false);
    setShowProfileAfterCompletion(true);
  };

  const handleSelectStartupFromList = (id: string) => {
    setSelectedProfileId(id);
    if (userRole === 'founder') {
      setActiveStartupProfileId(id);
      const profile = allProfiles.find((p: any) => String(p?.id) === String(id));
      setSelectedProfile(profile ? ensureJourney(profile) : null);
    } else {
      const s = publicStartups.find((p: any) => String(p?.id) === String(id));
      setSelectedProfile(s ? ensureJourney(s) : null);
    }
  };

  const handleOpenAssessment = () => {
    setShowAssessment(true);
  };

  const handleCloseAssessment = () => {
    setShowAssessment(false);
  };

  // If showing profiles manager
  if (showProfilesManager) {
    return (
      <StartupProfilesManager
        onSelectProfile={handleSelectProfile}
        onBack={handleCloseProfilesManager}
        onCreateNew={handleCloseProfilesManager}
      />
    );
  }

  // If a flow is active, show the appropriate flow component
  if (showFlow && selectedStage) {
    const pid = selectedProfileId || getActiveStartupProfileId();
    return (
      <div className="min-h-screen bg-gray-50">
        {selectedStage === 'ideation' && (
          <IdeationStageFlow onBack={handleBackToGateway} onComplete={handleCompletion} profileId={pid || undefined} />
        )}
        {selectedStage === 'mvp' && (
          <MVPDevelopmentFlow onBack={handleBackToGateway} onComplete={handleCompletion} profileId={pid || undefined} />
        )}
        {selectedStage === 'growth' && (
          <GrowthFundraisingFlow onBack={handleBackToGateway} onComplete={handleCompletion} profileId={pid || undefined} />
        )}
        {selectedStage === 'scaling' && (
          <ScalingOperationsFlow
            onBack={handleBackToGateway}
            onComplete={handleCompletion}
            profileId={pid || undefined}
            onNavigate={onNavigate}
          />
        )}
      </div>
    );
  }

  // If profile creation is required after completion, show the profile page
  if (showProfileAfterCompletion) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StartupProfilePage
          viewerType="founder"
          isOwnProfile={true}
          showBackToGateway={true}
          onBackToGateway={handleBackFromProfile}
          profileData={selectedProfile}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end mb-6"
        >
          {userRole === 'founder' ? (
            <button
              onClick={handleOpenProfilesManager}
              className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2 hover:shadow-lg"
            >
              <Building2 className="w-5 h-5" />
              View My Startup Profiles
            </button>
          ) : null}
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Rocket Illustration */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="mb-6 flex justify-center"
          >
            <div className="relative">
              <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-orange-100 rounded-full flex items-center justify-center">
                <Rocket className="w-24 h-24 text-blue-600" />
              </div>
              {/* Animated particles */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-orange-400/30 rounded-full blur-xl"
              />
            </div>
          </motion.div>

          <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
            Your Startup on NextIgnition
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose your stage — or jump straight to your profile if you already have a product
          </p>
        </motion.div>

        {/* ── Already Have a Product? Fast-Track Banner ── */}
        {userRole === 'founder' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 rounded-2xl border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 text-2xl">
                ✅
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Already have a product or startup?</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Skip the build steps — create your startup profile directly and start posting updates to the community.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowProfilesManager(true)}
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              Create My Profile
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <div className="mb-8">
          {/* Startup Selector — always show for non-founders; for founders only show if they have profiles */}
          {(userRole !== 'founder' || selectableStartups.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <div className="font-bold mb-2">
                {userRole === 'founder' ? 'My Startups' : 'Select Startup'}
              </div>
              {publicLoading ? <div className="text-sm text-gray-500">Loading startups...</div> : null}
              <div className="flex flex-wrap gap-2">
                {selectableStartups.map((p: any) => (
                  <button
                    key={String(p?.id)}
                    onClick={() => handleSelectStartupFromList(String(p?.id))}
                    className={`px-4 py-2 rounded-xl border text-sm font-bold ${String(p?.id) === String(selectedProfileId) ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {p?.name || 'Startup'}
                  </button>
                ))}
                {!selectableStartups.length && !publicLoading ? (
                  <div className="text-sm text-gray-500">
                    {userRole === 'founder' ? 'No startup profiles yet — choose a stage below to get started.' : 'No startups found.'}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {selectedProfileId && selectedProfile?.journey ? (
            <StartupJourneyHub
              userRole={userRole as any}
              profileId={selectedProfileId}
              journey={selectedProfile.journey}
              industry={selectedProfile?.industry}
              onRefresh={refreshSelectedProfile}
              onNavigate={onNavigate}
            />
          ) : null}
        </div>

        {/* Stage Selection Cards - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {stageCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`bg-gradient-to-br ${card.bgGradient} rounded-2xl p-8 border-2 transition-all duration-300 cursor-pointer ${hoveredCard === card.id
                ? `${card.borderColor} shadow-2xl scale-[1.02]`
                : 'border-gray-200 hover:border-gray-300'
                }`}
              style={{
                boxShadow: hoveredCard === card.id ? `0 20px 40px ${card.color}30` : 'none'
              }}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-6">
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  {card.emoji}
                </div>

                {/* Badge */}
                <span
                  className="px-4 py-2 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: card.color }}
                >
                  {card.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                {card.description}
              </p>

              {/* Benefits List */}
              <div className="mb-6 space-y-2">
                <p className="text-sm font-bold text-gray-800 mb-3">What You'll Get:</p>
                {card.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: card.color }} />
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Price/Requirement Tags */}
              {card.priceTag && (
                <div className="mb-4 flex items-center gap-3">
                  {Capacitor.getPlatform() !== 'ios' && (
                    <span className="text-sm font-bold text-gray-800">{card.priceTag}</span>
                  )}
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={(e) => { e.stopPropagation(); onNavigate?.('contact'); }}
                  >
                    {card.priceLink}
                  </button>
                </div>
              )}
              {/* On iOS every stage is unlocked (fully-free), so don't show a
                  tier/plan "requirement" badge that contradicts that. */}
              {card.requirement && Capacitor.getPlatform() !== 'ios' && (
                <div className="mb-4">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                    {card.requirement}
                  </span>
                  {card.requirementLink && Capacitor.getPlatform() !== 'ios' && (
                    <button
                      className="ml-2 text-sm text-blue-600 hover:underline"
                      onClick={(e) => { e.stopPropagation(); window.location.hash = '#pricing'; }}
                    >
                      {card.requirementLink}
                    </button>
                  )}
                </div>
              )}

              {/* CTA Button */}
              {userRole !== 'founder' ? (
                <div
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 opacity-50 cursor-not-allowed select-none"
                  title={`Only founders can select a stage`}
                  style={{ background: card.color }}
                >
                  {card.ctaText}
                  <ArrowRight className="w-5 h-5" />
                </div>
              ) : (
                <button
                  onClick={() => handleStageSelect(card.id as StartupStage)}
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg group"
                  style={{
                    background: hoveredCard === card.id
                      ? `linear-gradient(135deg, ${card.color}, ${brandColors.atomicOrange})`
                      : card.color
                  }}
                >
                  {card.ctaText}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {/* Radio Button Indicator */}
              <div className="mt-4 flex justify-end">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${hoveredCard === card.id ? 'border-current' : 'border-gray-300'
                    }`}
                  style={{ borderColor: hoveredCard === card.id ? card.color : undefined }}
                >
                  {hoveredCard === card.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: card.color }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-3"
        >
          {userRole === 'founder' && (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <HelpCircle className="w-5 h-5" />
              <button className="text-blue-600 hover:underline font-medium" onClick={handleOpenAssessment}>
                Not sure which stage? Take our 2-minute assessment
              </button>
            </div>
          )}
          <p className="text-sm text-gray-500">
            You can update your stage anytime in settings
          </p>
          {userRole === 'founder' && (
            <button
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              onClick={handleOpenProfilesManager}
            >
              Skip for now, view my startup profiles
            </button>
          )}
        </motion.div>
      </div>

      {/* Assessment Modal */}
      <StageAssessmentModal
        isOpen={showAssessment}
        onClose={handleCloseAssessment}
        onSelectStage={handleStageSelect}
      />
    </div>
  );
}