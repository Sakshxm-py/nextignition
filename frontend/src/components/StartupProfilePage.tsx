import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  MapPin,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  ExternalLink,
  Mail,
  Linkedin,
  Twitter,
  Globe,
  Star,
  Heart,
  Bookmark,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Zap,
  Award,
  FileText,
  BarChart3,
  MessageCircle,
  Phone,
  Video,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Rocket,
  Briefcase,
  Camera,
  UserPlus,
  Send,
  Play
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { AIDueDiligenceAssistant } from './AIDueDiligenceAssistant';
import { getStartupById, updateStartup, upvoteStartup, addStartupComment } from '../services/startupService';
import { EditStartupProfileModal } from './EditStartupProfileModal';
import { runQuickAction } from '../services/aiService';
import { getCurrentUser } from '../services/authService';
import { Capacitor } from '@capacitor/core';

interface StartupProfileProps {
  viewerType?: 'founder' | 'investor' | 'mentor' | 'talent';
  isOwnProfile?: boolean;
  showBackToGateway?: boolean;
  onBackToGateway?: () => void;
  profileId?: string | null;
  startupId?: string | null;
  profileData?: any;
  onBack?: () => void;
  defaultEditMode?: boolean;
}

interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  linkedin?: string;
}

interface Update {
  id: number;
  title: string;
  date: string;
  content: string;
}

export function StartupProfilePage({ viewerType = 'investor', isOwnProfile = false, showBackToGateway = false, onBackToGateway, profileId, startupId, profileData, onBack, defaultEditMode = false }: StartupProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isSavedOrInterested, setIsSavedOrInterested] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(defaultEditMode);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [startupProfile, setStartupProfile] = useState<any>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (profileData) {
      setStartupProfile(profileData);
      setLoadingProfile(false);
      setProfileError('');
      return;
    }

    const id = startupId || profileId;
    if (!id) {
      setStartupProfile(null);
      setProfileError('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingProfile(true);
        setProfileError('');
        const data = await getStartupById(id);
        if (!cancelled) {
          setStartupProfile(data);
          setUpvoteCount(data.upvotes?.length || 0);
          setComments(data.comments || []);
          
          // Check if current user upvoted
          const user = getCurrentUser() || {};
          if (user.id && data.upvotes?.includes(user.id)) {
            setIsUpvoted(true);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setStartupProfile(null);
          setProfileError(e?.response?.data?.message || e?.message || 'Failed to load startup');
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileData, startupId, profileId]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleGetDetailedAnalysis = async () => {
    try {
      const cacheKey = `startupAnalysis:${String(startupProfile?.id || startupId || profileId || 'unknown')}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setAiAnalysisError('');
          setAiAnalysisResult(JSON.parse(cached));
          return;
        } catch {
          // ignore bad cache
        }
      }

      setAiAnalysisLoading(true);
      setAiAnalysisError('');

      const profileForContext = startupProfile || {};
      const context = JSON.stringify(
        {
          name: profileForContext.name || profileForContext.startupName || profileForContext.companyName,
          tagline: profileForContext.tagline || profileForContext.oneLiner || profileForContext.summary,
          industry: profileForContext.industry,
          stage: profileForContext.stage,
          location: profileForContext.location,
          foundedDate: profileForContext.foundedDate,
          fundingAsk: profileForContext.fundingAsk,
          equityOffered: profileForContext.equityOffered,
          teamSize: profileForContext.teamSize,
          mission: profileForContext.mission,
          problem: profileForContext.problem,
          solution: profileForContext.solution,
          businessModel: profileForContext.businessModel,
          marketSize: profileForContext.marketSize,
          traction: profileForContext.traction,
          funding: profileForContext.funding,
        },
        null,
        2
      );

      const resp = await runQuickAction('startup_health_check', context);
      setAiAnalysisResult(resp);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(resp));
      } catch {
        // ignore cache errors
      }
    } catch (err: any) {
      setAiAnalysisResult(null);
      setAiAnalysisError(err?.response?.data?.message || err?.message || 'Failed to generate analysis');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const analysisPayload = (() => {
    if (!aiAnalysisResult) return null;
    const type = aiAnalysisResult?.type;
    const data = aiAnalysisResult?.data ?? aiAnalysisResult;
    const scoreRaw =
      (data as any)?.overallScore ??
      (data as any)?.investorReadinessScore ??
      (data as any)?.score;
    const score = typeof scoreRaw === 'number' ? scoreRaw : null;
    const summary =
      (data as any)?.summary ??
      (data as any)?.executiveSummary ??
      (data as any)?.verdict ??
      '';
    const strengths =
      (data as any)?.strengths ??
      (data as any)?.highlights ??
      [];
    const risks =
      (data as any)?.risks ??
      (data as any)?.gaps ??
      [];
    const nextSteps =
      (data as any)?.nextSteps ??
      (data as any)?.details ??
      [];

    return {
      type: typeof type === 'string' ? type : undefined,
      mode: (data as any)?.mode as string | undefined,
      score,
      summary: String(summary || '').trim(),
      strengths: Array.isArray(strengths) ? strengths.filter(Boolean).map(String) : [],
      risks: Array.isArray(risks) ? risks.filter(Boolean).map(String) : [],
      nextSteps: Array.isArray(nextSteps) ? nextSteps.filter(Boolean).map(String) : [],
      raw: aiAnalysisResult,
    };
  })();

  // Mock startup data
  const startupData = {
    name: '',
    tagline: '',
    logo: '',
    coverImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    industry: [],
    location: '',
    foundedDate: '',
    stage: '',
    fundingAsk: '',
    equityOffered: '',
    teamSize: 0,
    website: '',
    social: {
      linkedin: '',
      twitter: ''
    },
    mission: '',
    problem: '',
    solution: '',
    businessModel: '',
    marketSize: '',
    currentRevenue: '',
    growth: '',
    customers: 0,
    retention: ''
  };

  const displayProfile = startupProfile
    ? {
      ...startupData,
      ...startupProfile,
      name: startupProfile.name || startupProfile.startupName || startupProfile.companyName || startupData.name,
      tagline:
        startupProfile.tagline ||
        startupProfile.summary ||
        startupProfile.oneLiner ||
        startupProfile.description ||
        startupData.tagline,
      mission:
        startupProfile.mission ||
        startupProfile.vision ||
        startupProfile.startupMission ||
        startupProfile.description ||
        startupData.mission,
      problem:
        startupProfile.problem ||
        startupProfile.problemStatement ||
        startupProfile.description ||
        startupData.problem,
      solution:
        startupProfile.solution ||
        startupProfile.solutionStatement ||
        startupProfile.valueProposition ||
        startupProfile.canvasBlocks?.valueProposition ||
        startupData.solution,
      industry: Array.isArray(startupProfile.industry)
        ? startupProfile.industry
        : typeof startupProfile.industry === 'string'
          ? startupProfile.industry.split(',').map((s: string) => s.trim()).filter(Boolean)
          : startupData.industry,
    }
    : startupData;

  const headerProfile = startupProfile
    ? {
      name: startupProfile.name || startupProfile.startupName || startupProfile.companyName || '',
      tagline:
        startupProfile.tagline ||
        startupProfile.summary ||
        startupProfile.oneLiner ||
        startupProfile.description ||
        '',
      logo: startupProfile.logo || '',
      logoInitials: (startupProfile.name || startupProfile.startupName || startupProfile.companyName)
        ? String(startupProfile.name || startupProfile.startupName || startupProfile.companyName)
          .substring(0, 2)
          .toUpperCase()
        : '',
      coverImage: startupProfile.coverImage || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      industry: Array.isArray(startupProfile.industry)
        ? startupProfile.industry
        : typeof startupProfile.industry === 'string'
          ? startupProfile.industry.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
      stage: startupProfile.stage || '',
    }
    : {
      name: 'Loading...',
      tagline: '',
      logo: '',
      logoInitials: '...',
      coverImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      industry: [],
      stage: '',
    };

  const editInitialData = startupProfile
    ? {
      ...startupData,
      name: startupProfile.name || startupProfile.startupName || startupProfile.companyName || startupData.name,
      tagline:
        startupProfile.tagline ||
        startupProfile.summary ||
        startupProfile.oneLiner ||
        startupProfile.description ||
        startupData.tagline,
      logo: startupProfile.logo || startupData.logo,
      industry: headerProfile.industry.length ? headerProfile.industry : startupData.industry,
      stage: startupProfile.stage || startupData.stage,
      location: startupProfile.location || startupData.location,
      foundedDate: startupProfile.foundedDate || startupData.foundedDate,
      fundingAsk: startupProfile.fundingAsk || startupData.fundingAsk,
      equityOffered: startupProfile.equityOffered || startupData.equityOffered,
      teamSize: startupProfile.teamSize || startupData.teamSize,
      website: startupProfile.website || startupData.website,
      social: startupProfile.social || startupData.social,
      mission: startupProfile.mission || startupProfile.vision || startupProfile.startupMission || startupData.mission,
      problem: startupProfile.problem || startupProfile.problemStatement || startupProfile.description || startupData.problem,
      solution:
        startupProfile.solution ||
        startupProfile.solutionStatement ||
        startupProfile.valueProposition ||
        startupProfile.canvasBlocks?.valueProposition ||
        startupData.solution,
      businessModel: startupProfile.businessModel || startupData.businessModel,
      marketSize: startupProfile.marketSize || startupData.marketSize,
    }
    : startupData;

  const handleSaveProfile = async (updatedData: any) => {
    setStartupProfile((prev: any) => ({ ...(prev || {}), ...(updatedData || {}) }));

    // Persist edits for locally-created profiles
    try {
      const currentId = startupProfile?.id;
      if (currentId) {
        let created = [];
        try {
          created = JSON.parse(localStorage.getItem('createdProfiles') || '[]');
        } catch(e) {}
        if (Array.isArray(created)) {
          const updated = created.map((p: any) =>
            p?.id === currentId
              ? {
                ...p,
                name: updatedData?.name,
                tagline: updatedData?.tagline,
                logo: updatedData?.logo,
                industry: Array.isArray(updatedData?.industry) ? updatedData.industry.join(', ') : updatedData?.industry,
                stage: updatedData?.stage,
                location: updatedData?.location,
                foundedDate: updatedData?.foundedDate,
                website: updatedData?.website,
                social: updatedData?.social,
                mission: updatedData?.mission,
                problem: updatedData?.problem,
                solution: updatedData?.solution,
                businessModel: updatedData?.businessModel,
                marketSize: updatedData?.marketSize,
                fundingAsk: updatedData?.fundingAsk,
                equityOffered: updatedData?.equityOffered,
                teamSize: updatedData?.teamSize,
              }
              : p
          );
          localStorage.setItem('createdProfiles', JSON.stringify(updated));
        }
      }
    } catch {
      // ignore persistence errors
    }

    try {
      const id = startupId || profileId;
      if (!id) {
        setIsEditModalOpen(false);
        return;
      }

      await updateStartup(id, updatedData);

      const data = await getStartupById(id);
      setStartupProfile(data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update startup profile:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handlePostUpdate = async () => {
    if (!newUpdateTitle.trim() || !newUpdateContent.trim()) return;

    const newUpdate = {
      id: Date.now(),
      title: newUpdateTitle,
      content: newUpdateContent,
      date: 'Just now'
    };

    const updatedUpdates = [newUpdate, ...(startupProfile?.updates || [])];

    // Optimistic update
    setStartupProfile((prev: any) => ({ ...prev, updates: updatedUpdates }));
    setNewUpdateTitle('');
    setNewUpdateContent('');
    setIsPostingUpdate(false);

    try {
      const id = startupId || profileId;
      if (id) {
        await updateStartup(id, { updates: updatedUpdates });
      }
    } catch (err) {
      console.error('Failed to save update:', err);
    }
  };

  const [isAddingMetric, setIsAddingMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricValue, setNewMetricValue] = useState('');
  const [newMetricGrowth, setNewMetricGrowth] = useState('');

  const handleAddMetric = async () => {
    if (!newMetricName.trim() || !newMetricValue.trim()) return;

    const newMetric = {
      metric: newMetricName,
      value: newMetricValue,
      growth: newMetricGrowth || '+0%'
    };

    const updatedTraction = [...(startupProfile?.traction || []), newMetric];

    setStartupProfile((prev: any) => ({ ...prev, traction: updatedTraction }));
    setNewMetricName('');
    setNewMetricValue('');
    setNewMetricGrowth('');
    setIsAddingMetric(false);

    try {
      const id = startupId || profileId;
      if (id) {
        await updateStartup(id, { traction: updatedTraction });
      }
    } catch (err) {
      console.error('Failed to save metric:', err);
    }
  };

  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestoneStatus, setNewMilestoneStatus] = useState<'completed' | 'in-progress' | 'upcoming'>('upcoming');

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim() || !newMilestoneDate.trim()) return;

    const newMilestone = {
      title: newMilestoneTitle,
      date: newMilestoneDate,
      status: newMilestoneStatus
    };

    const updatedMilestones = [...(startupProfile?.milestones || []), newMilestone];

    setStartupProfile((prev: any) => ({ ...prev, milestones: updatedMilestones }));
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setNewMilestoneStatus('upcoming');
    setIsAddingMilestone(false);

    try {
      const id = startupId || profileId;
      if (id) {
        await updateStartup(id, { milestones: updatedMilestones });
      }
    } catch (err) {
      console.error('Failed to save milestone:', err);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: headerProfile.name,
        text: headerProfile.tagline,
        url: url
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleUpvote = async () => {
    const id = startupId || profileId;
    if (!id) return;
    
    // Optimistic UI
    const prevUpvoted = isUpvoted;
    setIsUpvoted(!prevUpvoted);
    setUpvoteCount(prev => prevUpvoted ? prev - 1 : prev + 1);
    
    try {
      const data = await upvoteStartup(id);
      setUpvoteCount(data.upvotes?.length || 0);
    } catch (err) {
      console.error('Upvote failed:', err);
      // Rollback
      setIsUpvoted(prevUpvoted);
      setUpvoteCount(prev => prevUpvoted ? prev + 1 : prev - 1);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    const id = startupId || profileId;
    if (!id) return;

    try {
      setIsSubmittingComment(true);
      const comment = await addStartupComment(id, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };


  const teamMembers: TeamMember[] = startupProfile?.team?.length ? startupProfile.team : [];

  const traction: any[] = startupProfile?.traction?.length ? startupProfile.traction : [];

  const milestones: any[] = startupProfile?.milestones?.length ? startupProfile.milestones : [];

  const updates: Update[] = startupProfile?.updates?.length ? startupProfile.updates : [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Rocket },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'pitch', label: 'Pitch', icon: FileText },
    { id: 'traction', label: 'Traction', icon: TrendingUp },
    { id: 'journey', label: 'Funding Journey', icon: DollarSign },
    { id: 'updates', label: 'Updates', icon: Calendar }
  ];

  // Open a DM with this startup's founder (used by the talent/mentor CTAs).
  // Dispatches the shared dashboard-navigation event, which every dashboard
  // listens for and routes into its Messages tab with the target user preselected.
  const contactFounder = () => {
    const founderId =
      startupProfile?.founder || profileData?.founder || profileData?.data?.founder;
    if (!founderId) {
      alert('This founder can’t be messaged right now.');
      return;
    }
    window.dispatchEvent(
      new CustomEvent('navigateDashboard', {
        detail: { tab: 'Messages', messageUserId: String(founderId) },
      }),
    );
  };

  const getCTAButton = () => {
    if (isOwnProfile) {
      return (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsEditModalOpen(true)}
          className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-[#f78405] to-[#ff9933] text-white rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Edit Profile
        </motion.button>
      );
    }

    switch (viewerType) {
      case 'investor':
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsSavedOrInterested(!isSavedOrInterested)}
            className={`w-full md:w-auto px-8 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${isSavedOrInterested
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-[#f78405] to-[#ff9933] text-white'
              }`}
          >
            <Heart className={`w-5 h-5 ${isSavedOrInterested ? 'fill-white' : ''}`} />
            {isSavedOrInterested ? 'Interested' : 'Express Interest'}
          </motion.button>
        );
      case 'talent':
        if (Capacitor.getPlatform() === 'ios') return null;
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={contactFounder}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-[#6666ff] to-[#8888ff] text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Join Our Team
          </motion.button>
        );
      case 'mentor':
        if (Capacitor.getPlatform() === 'ios') return null;
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={contactFounder}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-[#242b64] to-[#3a4280] text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Offer Mentorship
          </motion.button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto relative">
      {/* Back to Gateway Button */}
      {showBackToGateway && onBackToGateway && (
        <div className="bg-gradient-to-r from-orange-50 to-blue-50 border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <h3 className="font-bold text-gray-900">Profile Created Successfully!</h3>
                  <p className="text-sm text-gray-600">Your startup profile is now live and visible to investors</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBackToGateway}
                className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-orange-500 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Gateway
              </motion.button>
            </div>
          </div>
        </div>
      )}
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Hero Banner */}
          <div className="relative">
            {/* Cover Image */}
            <div
              className="h-36 sm:h-48 md:h-64 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              style={{
                backgroundImage: headerProfile.coverImage ? (
                  headerProfile.coverImage.startsWith('linear-gradient') 
                    ? headerProfile.coverImage 
                    : `url(${headerProfile.coverImage})`
                ) : undefined
              }}
            />

            {/* Profile Header */}
            <div className="max-w-6xl mx-auto px-4 md:px-6">
                <div className="relative mt-4 md:-mt-20">
                  {/* Logo + Name Row */}
                <div className="flex items-end gap-4">
                  {/* Logo */}
                  <div className="flex-shrink-0 w-20 h-20 md:w-32 md:h-32 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl md:text-5xl border-4 border-white overflow-hidden">
                    {headerProfile.logo && (headerProfile.logo.startsWith('http') || headerProfile.logo.startsWith('data:')) ? (
                      <img
                        src={headerProfile.logo}
                        alt={headerProfile.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="select-none">{headerProfile.logo || headerProfile.logoInitials}</span>
                    )}
                  </div>

                  {/* Desktop action buttons next to logo */}
                  <div className="hidden md:flex items-center gap-3 pb-6 ml-auto">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleUpvote}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-bold transition-all ${
                        isUpvoted
                        ? 'bg-[#f78405] border-[#f78405] text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#f78405]'
                      }`}
                    >
                      <ChevronUp className={`w-5 h-5 ${isUpvoted ? 'text-white' : 'text-[#f78405]'}`} />
                      {upvoteCount}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleShare}
                      className="p-2 border-2 border-gray-200 rounded-lg hover:border-[#f78405] transition-colors bg-white"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </motion.button>
                    {getCTAButton()}
                  </div>
                </div>

                {/* Name, tagline, tags — below logo */}
                <div className="mt-3 pb-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{headerProfile.name}</h1>
                  {headerProfile.tagline ? (
                    <p className="text-sm sm:text-base text-gray-600 mt-1 leading-snug">{headerProfile.tagline}</p>
                  ) : null}
                  {headerProfile.industry.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {headerProfile.industry.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Bar */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-y border-gray-200 mt-4">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-6">
                <div className="text-left">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                    <Target className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">Stage</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{headerProfile.stage || 'Not set'}</p>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                    <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">Funding Ask</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {startupProfile?.funding?.target
                      ? `₹${startupProfile.funding.target.toLocaleString()}`
                      : startupProfile?.fundingAsk || displayProfile.fundingAsk || 'Not set'}
                  </p>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                    <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">Equity</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {startupProfile?.funding?.equity
                      ? `${startupProfile.funding.equity}%`
                      : startupProfile?.equity
                        ? `${startupProfile.equity}%`
                        : displayProfile.equityOffered || 'Not set'}
                  </p>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">Team Size</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{startupProfile?.teamSize || displayProfile.teamSize || 'Not set'}</p>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">Founded</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {startupProfile?.foundedDate
                      ? new Date(startupProfile.foundedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                      : displayProfile.foundedDate || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="max-w-6xl mx-auto">
              <div className="flex overflow-x-auto hide-scrollbar px-2 md:px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 md:px-5 py-3 md:py-4 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                        ? 'border-[#f78405] text-[#f78405]'
                        : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* AI Analysis Card - Only visible for founders (isOwnProfile) */}
                {isOwnProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-[#6666FF]/10 via-purple-50 to-[#F78405]/10 border-2 border-[#6666FF]/30 rounded-xl p-6 relative overflow-hidden"
                  >
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6666FF]/20 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#F78405]/20 to-transparent rounded-full blur-3xl" />

                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Ignisha's Startup Health Check</h2>
                            <p className="text-sm text-gray-600">AI-powered analysis of your startup profile</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Score */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                        <div className="md:col-span-1 flex flex-row md:flex-col items-center justify-start md:justify-center bg-white/80 backdrop-blur rounded-xl p-4 md:p-6 border border-[#6666FF]/20 gap-4 md:gap-0">
                          <div className="relative flex-shrink-0">
                            <svg className="w-20 h-20 md:w-32 md:h-32 transform -rotate-90" viewBox="0 0 80 80">
                              <circle
                                cx="40"
                                cy="40"
                                r="34"
                                stroke="#E5E7EB"
                                strokeWidth="6"
                                fill="none"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="34"
                                stroke="url(#score-gradient)"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 34}`}
                                strokeDashoffset={`${2 * Math.PI * 34 * (1 - 0.83)}`}
                                strokeLinecap="round"
                              />
                              <defs>
                                <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#6666FF" />
                                  <stop offset="100%" stopColor="#F78405" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-[#6666FF] to-[#F78405] bg-clip-text text-transparent">83</span>
                              <span className="text-[10px] md:text-sm text-gray-600">/100</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 md:mt-3 font-medium">Overall Score</p>
                        </div>

                        {/* Metrics Breakdown */}
                        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Pitch Strength</span>
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-bold text-gray-900">89</span>
                              <span className="text-sm text-gray-500 mb-1">/100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{ width: '89%' }} />
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Market Viability</span>
                              <BarChart3 className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-bold text-gray-900">81</span>
                              <span className="text-sm text-gray-500 mb-1">/100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style={{ width: '81%' }} />
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-orange-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Funding Readiness</span>
                              <DollarSign className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-bold text-gray-900">79</span>
                              <span className="text-sm text-gray-500 mb-1">/100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full" style={{ width: '79%' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Last updated: <span className="font-medium">Today</span>
                        </p>
                        <button
                          onClick={handleGetDetailedAnalysis}
                          disabled={aiAnalysisLoading}
                          className="px-5 py-2.5 bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {aiAnalysisLoading ? 'Analyzing...' : 'Get Detailed Analysis'}
                        </button>
                      </div>

                      {(aiAnalysisError || aiAnalysisResult) && (
                        <div className="mt-4">
                          {aiAnalysisError && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                              {aiAnalysisError}
                            </div>
                          )}

                          {!aiAnalysisError && aiAnalysisResult && (
                            <div className="p-4 rounded-xl bg-white/80 backdrop-blur border border-[#6666FF]/20">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-sm font-bold text-gray-900">Ignisha AI Analysis</div>
                                  {analysisPayload?.mode && (
                                    <div className="text-xs text-gray-500 mt-0.5">Mode: {analysisPayload.mode}</div>
                                  )}
                                </div>
                                {typeof analysisPayload?.score === 'number' && (
                                  <div className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg">
                                    <Sparkles className="w-4 h-4" />
                                    <div className="text-sm font-bold">{analysisPayload.score}/100</div>
                                  </div>
                                )}
                              </div>

                              {analysisPayload?.summary && (
                                <div className="mt-3">
                                  <div className="max-h-56 overflow-y-auto pr-2 text-sm text-gray-700 leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisPayload.summary}</ReactMarkdown>
                                  </div>
                                </div>
                              )}

                              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                  <div className="flex items-center gap-2 text-sm font-bold text-green-800">
                                    <CheckCircle className="w-4 h-4" /> Strengths
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {(analysisPayload?.strengths?.length ? analysisPayload.strengths : ['No strengths returned.']).map((s, idx) => (
                                      <div key={`str-${idx}`} className="text-xs text-green-900 leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{s}</ReactMarkdown>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                  <div className="flex items-center gap-2 text-sm font-bold text-red-800">
                                    <AlertTriangle className="w-4 h-4" /> Risks
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {(analysisPayload?.risks?.length ? analysisPayload.risks : ['No risks returned.']).map((r, idx) => (
                                      <div key={`risk-${idx}`} className="text-xs text-red-900 leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{r}</ReactMarkdown>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                  <div className="flex items-center gap-2 text-sm font-bold text-blue-800">
                                    <TrendingUp className="w-4 h-4" /> Next steps
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {(analysisPayload?.nextSteps?.length ? analysisPayload.nextSteps : ['No next steps returned.']).map((n, idx) => (
                                      <div key={`next-${idx}`} className="text-xs text-blue-900 leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{n}</ReactMarkdown>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Discussion Section */}
                <div className="mt-4 bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-200">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <MessageCircle className="w-6 h-6 text-[#f78405]" />
                      Discussion ({comments.length})
                    </h3>
                  </div>

                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-8">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6666FF] to-[#F78405] flex-shrink-0 flex items-center justify-center text-white font-bold">
                        {(getCurrentUser() || {}).name?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="What do you think of this startup?"
                          className="w-full border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none py-2"
                          rows={2}
                        />
                        <div className="flex justify-end mt-2 pt-2 border-t border-gray-50">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmitComment}
                            disabled={isSubmittingComment || !newComment.trim()}
                            className="px-6 py-2 bg-[#f78405] text-white rounded-lg font-bold text-sm disabled:opacity-50"
                          >
                            {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {comments.length > 0 ? (
                      comments.slice().reverse().map((comment) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={comment.id}
                          className="flex gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-600 font-bold overflow-hidden">
                            {comment.userAvatar ? (
                              <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" />
                            ) : (
                              comment.userName?.[0] || '?'
                            )}
                          </div>
                          <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-gray-900">{comment.userName}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No comments yet. Be the first to start the discussion!</p>
                      </div>
                    )}
                  </div>
                </div>


                {/* Mission */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer md:cursor-default"
                    onClick={() => toggleSection('mission')}
                  >
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-[#f78405]" />
                      Mission
                    </h2>
                    <ChevronDown className={`w-5 h-5 text-gray-400 md:hidden transition-transform ${expandedSections['mission'] ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`mt-4 text-gray-700 leading-relaxed ${expandedSections['mission'] === false ? 'hidden md:block' : ''}`}>
                    {displayProfile.mission ||
                      (isOwnProfile
                        ? 'No mission statement added yet. Click edit to add one.'
                        : 'Mission statement not available.')}
                  </div>
                </motion.div>

                {/* Problem & Solution */}
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-6"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer md:cursor-default"
                      onClick={() => toggleSection('problem')}
                    >
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Problem
                      </h3>
                      <ChevronDown className={`w-5 h-5 text-gray-400 md:hidden transition-transform ${expandedSections['problem'] ? 'rotate-180' : ''}`} />
                    </div>
                    <p className={`mt-4 text-gray-700 leading-relaxed ${expandedSections['problem'] === false ? 'hidden md:block' : ''}`}>
                      {displayProfile.problem ||
                        (isOwnProfile ? 'No problem statement added yet.' : 'Problem statement not available.')}
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-green-50 border border-green-200 rounded-xl p-6"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer md:cursor-default"
                      onClick={() => toggleSection('solution')}
                    >
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Solution
                      </h3>
                      <ChevronDown className={`w-5 h-5 text-gray-400 md:hidden transition-transform ${expandedSections['solution'] ? 'rotate-180' : ''}`} />
                    </div>
                    <p className={`mt-4 text-gray-700 leading-relaxed ${expandedSections['solution'] === false ? 'hidden md:block' : ''}`}>
                      {displayProfile.solution ||
                        (isOwnProfile ? 'No solution statement added yet.' : 'Solution statement not available.')}
                    </p>
                  </motion.div>
                </div>

                {/* Business Model */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer md:cursor-default"
                    onClick={() => toggleSection('business')}
                  >
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-[#6666ff]" />
                      Business Model
                    </h2>
                    <ChevronDown className={`w-5 h-5 text-gray-400 md:hidden transition-transform ${expandedSections['business'] ? 'rotate-180' : ''}`} />
                  </div>
                  <p className={`mt-4 text-gray-700 leading-relaxed ${expandedSections['business'] === false ? 'hidden md:block' : ''}`}>
                    {displayProfile.businessModel ||
                      (isOwnProfile ? 'No business model details added yet.' : 'Business model not available.')}
                  </p>
                </motion.div>

                {/* Market Size */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer md:cursor-default"
                    onClick={() => toggleSection('market')}
                  >
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Market Opportunity
                    </h2>
                    <ChevronDown className={`w-5 h-5 text-gray-400 md:hidden transition-transform ${expandedSections['market'] ? 'rotate-180' : ''}`} />
                  </div>
                  <p className={`mt-4 text-gray-700 leading-relaxed ${expandedSections['market'] === false ? 'hidden md:block' : ''}`}>
                    {displayProfile.marketSize ||
                      (isOwnProfile ? 'No market size details added yet.' : 'Market size not available.')}
                  </p>
                </motion.div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Our Team</h2>
                  <p className="text-gray-600">{teamMembers.length} members</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teamMembers.map((member, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f78405] to-[#ff9933] flex items-center justify-center text-white font-bold text-lg">
                          {member.avatar}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{member.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{member.role}</p>
                          {member.linkedin && (
                            <div className="flex gap-2 mt-3">
                              <motion.a
                                href={member.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.1 }}
                                className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Linkedin className="w-4 h-4 text-blue-600" />
                              </motion.a>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Pitch Tab */}
            {activeTab === 'pitch' && (
              <div className="space-y-8">
                {/* Pitch Deck */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#f78405]" />
                    Pitch Deck
                  </h2>
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        {startupProfile?.pitchDeckUrl
                          ? 'Pitch deck available'
                          : startupProfile?.pitchDeckLocked
                            ? 'Pitch deck available — follow the founder to download'
                            : 'No pitch deck uploaded'}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (startupProfile?.pitchDeckUrl) {
                            window.open(startupProfile.pitchDeckUrl, '_blank');
                          }
                        }}
                        disabled={!startupProfile?.pitchDeckUrl}
                        className={`px-6 py-2 rounded-lg flex items-center gap-2 mx-auto ${startupProfile?.pitchDeckUrl ? 'bg-[#f78405] text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                      >
                        <Download className="w-4 h-4" />
                        {startupProfile?.pitchDeckLocked && !startupProfile?.pitchDeckUrl ? 'Follow to Download' : 'Download Deck'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Pitch Video */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-[#6666ff]" />
                    Pitch Video
                  </h2>
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {startupProfile?.pitchVideoUrl ? (
                      <video
                        src={startupProfile.pitchVideoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // No pitch video uploaded yet — show a non-interactive placeholder
                      // rather than a button that can't play anything (avoids a dead button).
                      <div className="flex flex-col items-center justify-center text-gray-500 z-10">
                        <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center shadow-lg opacity-70">
                          <Play className="w-8 h-8 text-[#6666ff] ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    {startupProfile?.pitchVideoUrl ? '2-minute founder pitch video' : 'No pitch video uploaded yet'}
                  </p>
                </motion.div>

                {/* Business Plan */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Business Plan</h2>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-[#f78405]" />
                      <div>
                        <p className="font-semibold text-gray-900">TechFlow_Business_Plan_2024.pdf</p>
                        <p className="text-sm text-gray-600">2.4 MB • 28 pages</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-[#f78405] text-white rounded-lg flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Traction Tab */}
            {activeTab === 'traction' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Key Metrics</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Updated today</span>
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsAddingMetric(!isAddingMetric)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                      >
                        {isAddingMetric ? 'Cancel' : 'Add Metric'}
                      </button>
                    )}
                  </div>
                </div>

                {isAddingMetric && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Metric Name</label>
                      <input name="input-2a81e4"
                        type="text"
                        value={newMetricName}
                        onChange={(e) => setNewMetricName(e.target.value)}
                        placeholder="e.g. Users"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                      <input name="input-9a1bb5"
                        type="text"
                        value={newMetricValue}
                        onChange={(e) => setNewMetricValue(e.target.value)}
                        placeholder="e.g. 10k"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Growth (optional)</label>
                      <div className="flex gap-2">
                        <input name="input-5ad589"
                          type="text"
                          value={newMetricGrowth}
                          onChange={(e) => setNewMetricGrowth(e.target.value)}
                          placeholder="e.g. +20%"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                          onClick={handleAddMetric}
                          disabled={!newMetricName.trim() || !newMetricValue.trim()}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {traction.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-sm text-gray-600">{item.metric}</p>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mb-2">{item.value}</p>
                      <div className="flex items-center gap-1 text-green-600">
                        <span className="text-sm font-semibold">{item.growth}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Growth Chart Placeholder */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Revenue Growth</h3>
                  <div className="h-64 bg-gradient-to-t from-orange-50 to-transparent rounded-lg flex items-end justify-around p-4">
                    {[20, 35, 48, 62, 78, 95, 100].map((height, index) => (
                      <motion.div
                        key={index}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5 }}
                        className="w-12 bg-gradient-to-t from-[#f78405] to-[#ff9933] rounded-t-lg"
                      />
                    ))}
                  </div>
                  <div className="flex justify-around mt-4 text-sm text-gray-600">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Funding Journey Tab */}
            {activeTab === 'journey' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Milestones & Funding Journey</h2>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                      className="px-4 py-2 bg-[#f78405] text-white rounded-lg text-sm font-medium"
                    >
                      {isAddingMilestone ? 'Cancel' : 'Add Milestone'}
                    </button>
                  )}
                </div>

                {isAddingMilestone && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-50 border border-orange-200 rounded-xl p-6 space-y-4"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Title</label>
                        <input name="input-b745ac"
                          type="text"
                          value={newMilestoneTitle}
                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                          placeholder="e.g. Prototype Complete"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                        <input name="input-1a3efe"
                          type="text"
                          value={newMilestoneDate}
                          onChange={(e) => setNewMilestoneDate(e.target.value)}
                          placeholder="e.g. Q4 2024"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="flex gap-3">
                        {['completed', 'in-progress', 'upcoming'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setNewMilestoneStatus(s as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${newMilestoneStatus === s
                              ? 'bg-[#f78405] text-white'
                              : 'bg-white border border-gray-300 text-gray-700'}`}
                          >
                            {s.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddMilestone}
                        disabled={!newMilestoneTitle.trim() || !newMilestoneDate.trim()}
                        className="px-6 py-2 bg-[#f78405] text-white rounded-lg font-bold disabled:opacity-50"
                      >
                        Add Milestone
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="relative">
                  {milestones.map((milestone, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative pl-8 pb-8 last:pb-0"
                    >
                      {/* Timeline Line */}
                      {index < milestones.length - 1 && (
                        <div className="absolute left-3 top-8 w-0.5 h-full bg-gray-200" />
                      )}

                      {/* Timeline Dot */}
                      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${milestone.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : milestone.status === 'in-progress'
                          ? 'bg-orange-500 border-orange-500 animate-pulse'
                          : 'bg-white border-gray-300'
                        }`}>
                        {milestone.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900">{milestone.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{milestone.date}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${milestone.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : milestone.status === 'in-progress'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>
                            {milestone.status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Updates Tab */}
            {activeTab === 'updates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Startup Updates</h2>
                  {isOwnProfile && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsPostingUpdate(!isPostingUpdate)}
                      className="px-4 py-2 bg-[#f78405] text-white rounded-lg text-sm font-medium"
                    >
                      {isPostingUpdate ? 'Cancel' : 'Post Update'}
                    </motion.button>
                  )}
                </div>

                {isPostingUpdate && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-50 border border-orange-200 rounded-xl p-6 space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Update Title</label>
                      <input name="input-934739"
                        type="text"
                        value={newUpdateTitle}
                        onChange={(e) => setNewUpdateTitle(e.target.value)}
                        placeholder="e.g. Monthly Traction Report"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <textarea name="textarea-a3de1b"
                        value={newUpdateContent}
                        onChange={(e) => setNewUpdateContent(e.target.value)}
                        placeholder="What's the latest with your startup?"
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePostUpdate}
                        disabled={!newUpdateTitle.trim() || !newUpdateContent.trim()}
                        className="px-6 py-2 bg-[#f78405] text-white rounded-lg font-bold disabled:opacity-50"
                      >
                        Publish Update
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {updates.map((update, index) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white border border-gray-200 rounded-xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f78405] to-[#ff9933] flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                        {headerProfile.logo ? (
                          <img 
                            src={headerProfile.logo} 
                            alt="Startup Logo" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.innerText = headerProfile.logoInitials;
                              }
                            }}
                          />
                        ) : (
                          headerProfile.logoInitials
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{update.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{update.date}</p>
                        <p className="text-gray-700 mt-3 leading-relaxed">{update.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Sticky CTA Bar */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 border-2 border-gray-200 rounded-lg"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </motion.button>
              {getCTAButton()}
            </div>
          </div>

          {/* Add padding at bottom for mobile to account for sticky CTA */}
          <div className="md:hidden h-20" />

          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </div>

        {/* AI Due Diligence Assistant - Sticky Sidebar for Investors.
            Hidden on iOS: it renders illustrative/sample analysis data and would
            otherwise be visible on iPad (lg+). Apple Guideline 2.1. */}
        {viewerType === 'investor' && !isOwnProfile && Capacitor.getPlatform() !== 'ios' && (
          <aside className="hidden lg:block w-96 border-l border-gray-200 overflow-y-auto">
            <div className="sticky top-6 p-6">
              <AIDueDiligenceAssistant />
            </div>
          </aside>
        )}
      </div>

      {/* Edit Startup Profile Modal */}
      <EditStartupProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
        initialData={editInitialData}
      />
    </div>
  );
}
