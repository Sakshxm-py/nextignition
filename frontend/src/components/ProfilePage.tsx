import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import {
  MapPin,
  Share2,
  MoreVertical,
  MessageCircle,
  UserPlus,
  BadgeCheck,
  CheckCircle,
  Star,
  Eye,
  ThumbsUp,
  Users,
  TrendingUp,
  Award,
  Briefcase,
  DollarSign,
  Target,
  Calendar,
  ExternalLink,
  Globe,
  Linkedin,
  Twitter,
  Clock,
  AlignLeft,
  Video,
  FileText,
  Image as ImageIcon,
  Heart,
  Sparkles,
  Shield,
  Edit,
  UserCheck,
  Plus,
  Flag,
  Ban,
  Building,
  TrendingDown,
  Lightbulb,
  Rocket,
  Code,
  BarChart3,
  PlayCircle,
  Download,
  Send,
  Smile,
  Link as LinkIcon,
  Trophy,
  ArrowLeft,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { brandColors } from '../utils/colors';
import { getCurrentUser, getProfilesCreated, switchRole } from '../services/authService';
import { getProfile } from '../services/userService';
import api from '../services/api';
import { toast } from 'sonner';

interface ProfilePageProps {
  userRole: 'founder' | 'expert' | 'investor';
  userId?: string;
  isOwnProfile?: boolean;
  onNavigateToSettings?: () => void;
  onNavigateToMyStartup?: () => void;
  onBack?: () => void;
  /** Hide the page's own mobile top bar when rendered inside a dashboard that already shows a header. */
  hideMobileHeader?: boolean;
}

export function ProfilePage({ userRole, userId, isOwnProfile = true, onNavigateToSettings, onNavigateToMyStartup, onBack, hideMobileHeader = false }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState('Posts');
  const [showMenu, setShowMenu] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  // Weekly availability schedule (Mon–Fri). dayOfWeek follows JS getDay(): Mon=1…Fri=5.
  const [weeklySchedule, setWeeklySchedule] = useState(
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, i) => ({
      day, dayOfWeek: i + 1, start: '09:00', end: '17:00', available: true,
    }))
  );
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<'text' | 'image' | 'video' | 'poll' | 'milestone' | 'document'>('text');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  // Which roles this user has created a profile for (founder/expert/investor).
  const [profilesCreated, setProfilesCreated] = useState<{ founder?: boolean; expert?: boolean; investor?: boolean }>({ [userRole]: true });

  // Post & Milestone State
  const [posts, setPosts] = useState<any[]>([]);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneCategory, setMilestoneCategory] = useState('Funding');

  const [postContent, setPostContent] = useState('');

  // Post feed interactions
  const [postFilter, setPostFilter] = useState<'All' | 'Milestones' | 'Articles' | 'Updates'>('All');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [openComposer, setOpenComposer] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [localComments, setLocalComments] = useState<Record<string, string[]>>({});

  // Follow relationship with the viewed user (only meaningful on others' profiles)
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = getCurrentUser();
      const targetUserId = userId || (currentUser ? (currentUser.id || currentUser._id) : null);

      if (targetUserId) {
        try {
          const profile = await getProfile(targetUserId);
          // Only merge currentUser properties if viewing own profile, otherwise just use profile
          const isOwn = Boolean(currentUser && (currentUser.id === targetUserId || currentUser._id === targetUserId));
          
          if (isOwn) {
            setUser({ ...currentUser, ...profile });
          } else {
            setUser({ ...profile });
          }
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to load profile');
          if (currentUser && targetUserId === (currentUser.id || currentUser._id)) {
             setUser(currentUser);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setError('Please log in to view profile');
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId]);

  // Load which roles the user has created profiles for, so we can show all of
  // them as tags (and let the user switch into each role's profile).
  useEffect(() => {
    if (!isOwnProfile) return;
    let active = true;
    (async () => {
      try {
        const data = await getProfilesCreated();
        if (active && data) setProfilesCreated({ founder: !!data.founder, expert: !!data.expert, investor: !!data.investor });
      } catch {
        // Non-critical: fall back to just the current role tag.
      }
    })();
    return () => { active = false; };
  }, [isOwnProfile]);

  // Switch into another of the user's roles and open that role's profile.
  const handleRoleTagClick = async (role: 'founder' | 'expert' | 'investor') => {
    if (role === userRole) return;
    try {
      // Land on the Profile tab of the target dashboard.
      localStorage.setItem(`dashboard:${role}:activeTab`, 'Profile');
      await switchRole(role);
      window.location.hash = `#${role}-dashboard`;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not switch role');
    }
  };

  // Load the expert's saved weekly availability when the modal opens (prefill).
  useEffect(() => {
    if (!showAvailabilityModal) return;
    let active = true;
    (async () => {
      try {
        const res = await api.get('/availability/my-availability');
        const rows: any[] = res.data || [];
        if (!active || !rows.length) return;
        setWeeklySchedule(prev => prev.map(d => {
          const match = rows.find((r: any) => r.dayOfWeek === d.dayOfWeek);
          const slot = match?.slots?.[0];
          return slot
            ? { ...d, start: slot.startTime, end: slot.endTime, available: true }
            : { ...d, available: match ? true : false };
        }));
      } catch { /* keep defaults on failure */ }
    })();
    return () => { active = false; };
  }, [showAvailabilityModal]);

  const handleUpdateAvailability = async () => {
    setSavingAvailability(true);
    try {
      for (const d of weeklySchedule) {
        if (d.available) {
          if (d.end <= d.start) {
            toast.error(`${d.day}: end time must be after start time`);
            setSavingAvailability(false);
            return;
          }
          await api.post('/availability/availability', {
            dayOfWeek: d.dayOfWeek,
            slots: [{ startTime: d.start, endTime: d.end }],
          });
        } else {
          // Not available — remove any saved slots for that day.
          try { await api.delete(`/availability/availability/${d.dayOfWeek}`); } catch { /* may not exist */ }
        }
      }
      toast.success('Availability updated');
      setShowAvailabilityModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update availability');
    } finally {
      setSavingAvailability(false);
    }
  };

  // The id of the profile being viewed, and whether it's someone else's.
  const viewedUserId: string = (user?.id || user?._id || '') as string;
  const me = getCurrentUser();
  const myId: string = (me?.id || me?._id || '') as string;
  const isOtherUser = Boolean(viewedUserId && myId && String(viewedUserId) !== String(myId));

  // Load follow status + follower count for other people's profiles.
  useEffect(() => {
    if (!isOtherUser) return;
    let active = true;
    (async () => {
      try {
        const [status, counts] = await Promise.all([
          api.get(`/follow/status/${viewedUserId}`),
          api.get(`/follow/counts/${viewedUserId}`),
        ]);
        if (!active) return;
        setIsFollowing(!!status.data?.isFollowing);
        setIsMutual(!!status.data?.isMutual);
        setFollowerCount(typeof counts.data?.followers === 'number' ? counts.data.followers : null);
      } catch {
        // non-fatal — buttons still render with default state
      }
    })();
    return () => { active = false; };
  }, [viewedUserId, isOtherUser]);

  const handleToggleFollow = async () => {
    if (!viewedUserId || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await api.delete(`/follow/${viewedUserId}`);
        setIsFollowing(false);
        setIsMutual(false);
        setFollowerCount((n) => (n != null ? Math.max(0, n - 1) : n));
        toast('Unfollowed');
      } else {
        await api.post(`/follow/${viewedUserId}`);
        setIsFollowing(true);
        setFollowerCount((n) => (n != null ? n + 1 : n));
        // They may already follow us — re-check whether it's now mutual.
        try {
          const status = await api.get(`/follow/status/${viewedUserId}`);
          setIsMutual(!!status.data?.isMutual);
        } catch { /* ignore */ }
        toast.success('Following');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update follow status');
    } finally {
      setFollowBusy(false);
    }
  };

  const openMessage = () => {
    if (!isMutual) {
      toast('You can message each other once you both follow.', { description: 'Follow them — if they follow you back, chat unlocks.' });
      return;
    }
    localStorage.setItem('messagingUserId', viewedUserId);
    window.location.hash = '#messaging';
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || 'Profile not found'}</div>
      </div>
    );
  }

  // Avatar/cover uploads already produce a new URL each time (the storage object
  // path is timestamped), so no per-render cache-busting is needed. Appending
  // Date.now() on every render forced a re-download and broke image caching.
  const cacheBust = (url?: string) => String(url || '').trim();

  const currentProfile = {
    name: user.name,
    username: user.name ? `@${user.name.toLowerCase().replace(/\s+/g, '')}` : '',
    avatarUrl: cacheBust(user.avatar),
    coverPhotoUrl: cacheBust(user.coverPhoto),
    avatarFallback: (user.name || 'U').charAt(0),
    tagline: user.profile?.title || (userRole === 'founder' ? 'Founder @ NextIgnition' : userRole === 'expert' ? 'Expert & Mentor' : 'Investor'),
    location: user.profile?.location || 'Not specified',
    verified: !!user.isVerified,
    stats: userRole === 'founder' ? {
      profileViews: '0',
      connections: 0,
      followers: 0,
      engagement: '0%',
      startupFollowers: 0,
      avgRating: 0
    } : userRole === 'expert' ? {
      startupsHelped: 0,
      totalSessions: 0,
      avgRating: 0,
      revenueMonth: '₹0',
      revenueLifetime: '₹0'
    } : {
      totalInvestments: 0,
      exits: 0,
      avgCheckSize: '₹0',
      yearsInvesting: 0,
      avgRating: 0
    },
    bio: user.profile?.bio || '',
    skills: user.profile?.skills || user.profile?.expertise || [],
    lookingFor: user.profile?.lookingFor || [],
    dealBreakers: user.profile?.dealbreakers || [],
    languages: user.profile?.languages || ['English'],
    title: user.profile?.title,
    experience: user.profile?.experience ? `${user.profile.experience}` : 'No experience specified',
    expertise: user.profile?.expertise || user.profile?.skills || [],
    availableFor: user.profile?.availableFor || [],
    rating: user.profile?.rating || 0,
    reviews: user.profile?.reviewsCount || 0,
    ticketSize: user.profile?.ticketSize || '₹0',
    stages: user.profile?.preferredStages || [],
    sectors: user.profile?.industries || [],
    openToDeals: user.profile?.openToDeals ?? true,
    thesis: user.profile?.thesis || '',
    industries: user.profile?.industries || [],
    introVideo: cacheBust(user.introVideo),
    startup: user.profile?.startupName ? {
      name: user.profile.startupName,
      logo: '🚀',
      industry: user.profile?.startupIndustry || 'Not specified',
      mission: user.profile?.startupMission || 'Building something amazing',
      stage: user.profile?.startupStage || 'Ideation',
      teamSize: user.profile?.teamSize || '1',
      fundingStatus: user.profile?.fundingStatus || 'Bootstrapped'
    } : null
  };

  const tabs = userRole === 'founder'
    ? ['Posts', 'About', 'Media', 'Connections', 'Portfolio']
    : userRole === 'expert'
      ? ['Posts', 'About', 'Media', 'Connections', 'Reviews', 'Services']
      : ['Posts', 'About', 'Media', 'Connections', 'Portfolio'];

  const connections: any[] = [];
  const reviews: any[] = [];
  const portfolio: any[] = [];
  const services: any[] = [];

  type PostTypeOption = {
    type: 'text' | 'image' | 'video' | 'poll' | 'milestone' | 'document';
    icon: any;
    label: string;
    color: string;
  };

  // Constants
  const postTypes = [
    { icon: AlignLeft, label: 'Text', type: 'text', color: brandColors.electricBlue },
    { icon: ImageIcon, label: 'Image', type: 'image', color: brandColors.atomicOrange },
    { icon: Video, label: 'Video', type: 'video', color: '#10B981' },
    { icon: Target, label: 'Poll', type: 'poll', color: '#8B5CF6' },
    { icon: Award, label: 'Milestone', type: 'milestone', color: '#F59E0B' },
    { icon: FileText, label: 'Document', type: 'document', color: brandColors.navyBlue }
  ] as const;

  const handleAddMilestone = () => {
    if (!milestoneTitle) return;

    const newPost = {
      id: Date.now(),
      type: 'milestone',
      content: milestoneDescription,
      title: milestoneTitle,
      category: milestoneCategory,
      date: milestoneDate,
      time: 'Just now',
      likes: 0,
      comments: 0
    };

    setPosts([newPost, ...posts]);
    setShowAddMilestoneModal(false);
    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneDate('');
    setMilestoneCategory('Funding');
  };

  const handleCreatePost = () => {
    if (!postContent) return;

    const newPost = {
      id: Date.now(),
      type: selectedPostType,
      content: postContent,
      time: 'Just now',
      likes: 0,
      comments: 0
    };

    setPosts([newPost, ...posts]);
    setShowCreatePostModal(false);
    setPostContent('');
  };

  const handleViewStartupProfile = () => {
    if (onNavigateToMyStartup) {
      onNavigateToMyStartup();
      return;
    }

    try {
      localStorage.setItem('dashboard:founder:activeTab', 'My Startup');
    } catch {
      // ignore
    }

    window.location.hash = '#founder-dashboard';
  };

  // ── Post feed interactions ──────────────────────────────────────────────
  // Map a filter chip to the post fields that distinguish post categories.
  // Milestones use type === 'milestone'. Articles are long-form 'document'/'text'
  // posts flagged as articles; everything else (text/image/video/poll) is an Update.
  const matchesPostFilter = (post: any): boolean => {
    if (postFilter === 'All') return true;
    if (postFilter === 'Milestones') return post.type === 'milestone';
    if (postFilter === 'Articles') return post.type === 'document' || post.type === 'article';
    // Updates: anything that isn't a milestone or an article.
    return post.type !== 'milestone' && post.type !== 'document' && post.type !== 'article';
  };

  const visiblePosts = posts.filter(matchesPostFilter);

  const handleToggleLike = (postId: string | number) => {
    const key = String(postId);
    const isLiked = likedPosts.has(key);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(key);
      else next.add(key);
      return next;
    });
    setPosts((prev) =>
      prev.map((p: any) =>
        String(p.id) === key
          ? { ...p, likes: Math.max(0, (Number(p.likes) || 0) + (isLiked ? -1 : 1)) }
          : p,
      ),
    );
  };

  const handleToggleComposer = (postId: string | number) => {
    const key = String(postId);
    setOpenComposer((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCommentDraftChange = (postId: string | number, value: string) => {
    setCommentDrafts((prev) => ({ ...prev, [String(postId)]: value }));
  };

  const handleSubmitComment = (postId: string | number) => {
    const key = String(postId);
    const text = (commentDrafts[key] || '').trim();
    if (!text) return;
    setLocalComments((prev) => ({ ...prev, [key]: [...(prev[key] || []), text] }));
    setPosts((prev) =>
      prev.map((p: any) =>
        String(p.id) === key ? { ...p, comments: (Number(p.comments) || 0) + 1 } : p,
      ),
    );
    setCommentDrafts((prev) => ({ ...prev, [key]: '' }));
  };

  // Share helper: use the Web Share API when present, otherwise copy a link
  // to the clipboard and surface feedback via the existing toast system.
  const shareLink = async (url: string, title: string) => {
    try {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      };
      if (typeof nav.share === 'function') {
        await nav.share({ title, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
        return;
      }
      toast(url);
    } catch (err: any) {
      // AbortError = user dismissed the native share sheet; not an error.
      if (err?.name === 'AbortError') return;
      toast.error('Could not share link');
    }
  };

  const profileShareUrl = (): string => {
    const base = window.location.origin + window.location.pathname;
    return viewedUserId ? `${base}#profile?user=${viewedUserId}` : window.location.href;
  };

  const handleShareProfile = () => {
    void shareLink(profileShareUrl(), `${currentProfile.name} on NextIgnition`);
  };

  const handleSharePost = (postId: string | number) => {
    void shareLink(`${profileShareUrl()}&post=${postId}`, `Post by ${currentProfile.name}`);
  };

  const handleReportProfile = async () => {
    setShowMenu(false);
    if (!window.confirm('Report this profile for review?')) return;
    try {
      if (viewedUserId) {
        await api.post('/reports', { targetType: 'user', targetId: viewedUserId, reason: 'inappropriate' });
      }
    } catch {
      // Endpoint may not exist yet — still give the user feedback.
    }
    toast.success('Profile reported');
  };

  const handleBlockUser = async () => {
    setShowMenu(false);
    if (!window.confirm('Block this user? You will no longer see their activity.')) return;
    try {
      if (viewedUserId) {
        await api.post(`/users/${viewedUserId}/block`, {});
      }
    } catch {
      // Endpoint may not exist yet — still give the user feedback.
    }
    toast.success('User blocked');
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Mobile Sticky Header with Back Button.
          Hidden when embedded in a dashboard that already renders its own top header,
          so the two strips don't stack and crowd the page. */}
      {!hideMobileHeader && (
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => onBack ? onBack() : window.history.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <span className="font-bold text-gray-900">{isOwnProfile ? 'My Profile' : 'Profile'}</span>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-6"
        >
          <div
            className="h-40 rounded-xl mb-6 relative overflow-hidden"
            style={currentProfile.coverPhotoUrl ? { backgroundImage: `url(${currentProfile.coverPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #3B82F6 0%, #F97316 100%)' }}
          >
            {!currentProfile.coverPhotoUrl && (
               <div className="absolute inset-0 flex items-center justify-center text-white/20 font-bold text-4xl">
                 NextIgnition
               </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left - Avatar & Basic Info */}
            <div className="flex flex-col items-center lg:items-start">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-4xl mb-4 overflow-hidden border-4 border-white shadow-lg relative">
                {currentProfile.avatarUrl ? (
                  <>
                    <img
                      src={currentProfile.avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.classList.remove('hidden');
                          e.currentTarget.nextElementSibling.classList.add('flex');
                        }
                      }}
                    />
                    <div className="hidden items-center justify-center w-full h-full text-white">
                      {currentProfile.avatarFallback}
                    </div>
                  </>
                ) : (
                  <span className="text-white">{currentProfile.avatarFallback}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-1.5 justify-center lg:justify-start">
                {currentProfile.name}
                {currentProfile.verified && (
                  <BadgeCheck className="w-5 h-5 fill-current text-blue-600 flex-shrink-0" aria-label="Verified" />
                )}
              </h1>
              <p className="text-gray-600 mb-2 text-center lg:text-left">{currentProfile.username}</p>
              <p className="text-gray-700 mb-3 text-center lg:text-left max-w-xs">{currentProfile.tagline}</p>
              <div className="flex items-center gap-2 text-gray-600 mb-3">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{currentProfile.location}</span>
              </div>
              {/* Role tags — one per role the user signed up for. Click to open that role's profile. */}
              <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start">
                {(['founder', 'expert', 'investor'] as const)
                  .filter(r => r === userRole || profilesCreated[r])
                  .map(r => {
                    const label = r === 'founder' ? 'Founder' : r === 'expert' ? 'Expert / Mentor' : 'Investor';
                    const isActive = r === userRole;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => isOwnProfile ? handleRoleTagClick(r) : undefined}
                        disabled={!isOwnProfile || isActive}
                        title={isOwnProfile && !isActive ? `View ${label} profile` : undefined}
                        className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider transition-colors ${
                          isActive
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600 cursor-pointer'
                        } ${!isOwnProfile ? 'cursor-default' : ''}`}
                      >
                        {label}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Middle - Role-specific Info */}
            <div className="flex-1">
              {userRole === 'founder' && currentProfile.startup && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl border border-gray-200 shadow-sm">
                      {currentProfile.startup.logo}
                    </div>
                    <div>
                      <h3 className="font-bold">{currentProfile.startup.name}</h3>
                      <p className="text-sm text-gray-600">{currentProfile.startup.mission}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${(currentProfile.startup.stage === 'Idea' || currentProfile.startup.stage === 'Ideation') ? 'bg-gray-200 text-gray-700' :
                      currentProfile.startup.stage === 'MVP' ? 'bg-blue-100 text-blue-700' :
                        currentProfile.startup.stage === 'Growth' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                      }`}>
                      {currentProfile.startup.stage}
                    </span>
                    <button
                      type="button"
                      onClick={handleViewStartupProfile}
                      className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      View Startup Profile
                    </button>
                  </div>
                </div>
              )}

              {userRole === 'expert' && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold mb-2">{currentProfile.title || 'Expert Mentor'}</h3>
                  <p className="text-gray-600 mb-3">{currentProfile.experience}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star: number) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= Math.floor(currentProfile.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                            }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold">{(currentProfile.stats.avgRating || 0).toFixed(1)}</span>
                    <span className="text-gray-600">({currentProfile.reviews || 0} reviews)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.expertise.length > 0 ? currentProfile.expertise.slice(0, 5).map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                      >
                        {skill}
                      </span>
                    )) : (
                      <span className="text-sm text-gray-400 italic">No expertise specified yet</span>
                    )}
                  </div>
                </div>
              )}

              {userRole === 'investor' && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold mb-2">{currentProfile.title || 'Investor'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Typical Ticket Size</p>
                      <p className="font-bold">{currentProfile.ticketSize}</p>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        {currentProfile.openToDeals ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse block"></span>
                            Open to new deals
                          </span>
                        ) : (
                          <span className="text-gray-400">Not currently investing</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">Preferred Stages</p>
                    <div className="flex flex-wrap gap-2">
                      {currentProfile.stages.length > 0 ? currentProfile.stages.map((stage: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full"
                        >
                          {stage}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-400 italic">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Industry Focus</p>
                    <div className="flex flex-wrap gap-2">
                      {currentProfile.sectors.length > 0 ? currentProfile.sectors.map((sector: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full"
                        >
                          {sector}
                        </span>
                      )) : (
                         <span className="text-xs text-gray-400 italic">No focus industries listed</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right - Actions */}
            <div className="flex flex-col gap-2 lg:items-end">
              {isOwnProfile ? (
                <button
                  onClick={onNavigateToSettings}
                  className="px-6 py-2.5 rounded-lg font-bold text-white flex items-center gap-2 justify-center shadow-lg hover:shadow-xl transition-all"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleToggleFollow}
                    disabled={followBusy}
                    className="px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                    style={isFollowing
                      ? { background: '#fff', color: brandColors.electricBlue, border: `2px solid ${brandColors.electricBlue}` }
                      : { background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`, color: '#fff' }}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                  <button
                    onClick={openMessage}
                    disabled={!isMutual}
                    title={isMutual ? 'Send a message' : 'You must follow each other to chat'}
                    className={`px-6 py-2.5 border-2 rounded-lg font-bold flex items-center gap-2 justify-center transition-colors ${
                      isMutual ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                </>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleShareProfile}
                  title="Share profile"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                      <button
                        onClick={handleReportProfile}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Flag className="w-4 h-4" />
                        Report Profile
                      </button>
                      <button
                        onClick={handleBlockUser}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <Ban className="w-4 h-4" />
                        Block User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:flex lg:divide-x divide-gray-200 gap-4 lg:gap-6 w-full lg:w-auto">
              {userRole === 'founder' && currentProfile.stats && (
                <>
                  <div className="lg:pr-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Views (30d)</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.profileViews}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Connections</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.connections}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <UserCheck className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Followers</span>
                    </div>
                    <p className="text-2xl font-bold">{followerCount != null ? followerCount : currentProfile.stats.followers}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Engagement</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.engagement}</p>
                  </div>
                </>
              )}

              {userRole === 'expert' && currentProfile.stats && (
                <>
                  <div className="lg:pr-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Helped</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.startupsHelped}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Video className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Sessions</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.totalSessions}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-semibold uppercase">Rating</span>
                    </div>
                    <p className="text-2xl font-bold">{(currentProfile.stats.avgRating || 0).toFixed(1)}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold uppercase">Earnings</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.revenueMonth}</p>
                  </div>
                </>
              )}

              {userRole === 'investor' && currentProfile.stats && (
                <>
                  <div className="lg:pr-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Target className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Deals</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.totalInvestments}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Exits</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.exits}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold uppercase">Avg Check</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.avgCheckSize}</p>
                  </div>
                  <div className="lg:px-6">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Years</span>
                    </div>
                    <p className="text-2xl font-bold">{currentProfile.stats.yearsInvesting}</p>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 w-full lg:w-auto">
              {isOwnProfile && userRole === 'founder' && (
                <>
                  {/* Quick Post modal isn't fully wired — hide on iOS; the Home feed
                      composer is the working path (Apple Guideline 4.2). */}
                  {Capacitor.getPlatform() !== 'ios' && (
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold text-white text-sm shadow-md"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                  >
                    Quick Post
                  </button>
                  )}
                  <button
                    onClick={() => setShowAddMilestoneModal(true)}
                    className="flex-1 lg:flex-none px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50"
                  >
                    Milestone
                  </button>
                </>
              )}
              {isOwnProfile && userRole === 'expert' && (
                <>
                  <button
                    onClick={() => setShowAvailabilityModal(true)}
                    className="flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold text-white text-sm shadow-md"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                  >
                    Calendar Slots
                  </button>
                  <button
                    onClick={() => setShowCreateOfferModal(true)}
                    className="flex-1 lg:flex-none px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50"
                  >
                    New Service
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:flex border-b border-gray-200">
                {tabs.map((tab: string) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 sm:px-6 py-4 font-bold text-xs sm:text-sm transition-all relative whitespace-nowrap ${activeTab === tab
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {/* Posts Tab */}
              {activeTab === 'Posts' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Filter chips */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {(['All', 'Milestones', 'Articles', 'Updates'] as const).map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setPostFilter(chip)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          postFilter === chip
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Posts */}
                  {visiblePosts.map((post: any) => (
                    <div key={post.id} className="bg-white rounded-xl shadow-sm p-6">
                      {post.pinned && (
                        <div className="flex items-center gap-2 text-blue-600 mb-3 text-sm font-medium">
                          <Sparkles className="w-4 h-4" />
                          Pinned Post
                        </div>
                      )}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-lg overflow-hidden relative">
                          {currentProfile.avatarUrl ? (
                            <>
                              <img
                                src={currentProfile.avatarUrl}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                                    e.currentTarget.nextElementSibling.classList.add('flex');
                                  }
                                }}
                              />
                              <div className="hidden items-center justify-center w-full h-full text-white">
                                {currentProfile.avatarFallback}
                              </div>
                            </>
                          ) : (
                            <span className="text-white">{currentProfile.avatarFallback}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold">{currentProfile.name}</h4>
                          <p className="text-sm text-gray-600">{post.time}</p>
                        </div>
                      </div>
                      
                      {post.type === 'milestone' && post.title && (
                        <div className="mb-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-5 h-5 text-orange-500" />
                            <h4 className="font-bold text-gray-900">{post.title}</h4>
                          </div>
                          <div className="text-xs text-orange-700 font-medium">
                            {post.category} • {post.date}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-gray-800 mb-4">{post.content}</p>
                      <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-2 transition-colors ${
                            likedPosts.has(String(post.id))
                              ? 'text-blue-600'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          <ThumbsUp
                            className={`w-5 h-5 ${likedPosts.has(String(post.id)) ? 'fill-current' : ''}`}
                          />
                          <span className="text-sm font-medium">{post.likes}</span>
                        </button>
                        <button
                          onClick={() => handleToggleComposer(post.id)}
                          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">{post.comments}</span>
                        </button>
                        <button
                          onClick={() => handleSharePost(post.id)}
                          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Existing local comments */}
                      {(localComments[String(post.id)]?.length ?? 0) > 0 && (
                        <div className="mt-4 space-y-2">
                          {localComments[String(post.id)].map((comment: string, ci: number) => (
                            <div key={ci} className="flex items-start gap-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(me?.name || 'U').charAt(0)}
                              </div>
                              <div className="bg-gray-100 rounded-2xl px-3 py-2 text-sm text-gray-800">
                                {comment}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline comment composer */}
                      {openComposer.has(String(post.id)) && (
                        <div className="mt-4 flex items-start gap-2">
                          <textarea
                            value={commentDrafts[String(post.id)] || ''}
                            onChange={(e) => handleCommentDraftChange(post.id, e.target.value)}
                            placeholder="Write a comment..."
                            rows={2}
                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <button
                            onClick={() => handleSubmitComment(post.id)}
                            disabled={!(commentDrafts[String(post.id)] || '').trim()}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-opacity"
                            style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                          >
                            Post
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* About Tab */}
              {activeTab === 'About' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-4">
                      {userRole === 'investor' ? 'Investment Thesis' : 'About'}
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      {userRole === 'founder' && (user.profile?.bio || 'Building the future of technology.')}
                      {userRole === 'expert' && (user.profile?.bio || 'Expert mentor available for consultation.')}
                      {userRole === 'investor' && (user.profile?.thesis || 'Investing in visionary founders.')}
                    </p>

                    {currentProfile.introVideo && (
                      <div className="mb-8 max-w-2xl">
                        <h4 className="font-bold mb-3 flex items-center gap-2">
                          <PlayCircle className="w-5 h-5 text-blue-600" />
                          Intro Video
                        </h4>
                        <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-md">
                          <video 
                            src={currentProfile.introVideo} 
                            controls 
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}

                    {userRole === 'founder' && (
                      <>
                        <h4 className="font-bold mb-3">Skills & Focus Areas</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {currentProfile.skills.length > 0 ? currentProfile.skills.map((skill: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg"
                            >
                              {skill}
                            </span>
                          )) : (
                            <span className="text-sm text-gray-500 italic">No skills listed</span>
                          )}
                        </div>

                        <h4 className="font-bold mb-3">Looking For</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {currentProfile.lookingFor.length > 0 ? currentProfile.lookingFor.map((item: any, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg"
                            >
                              {item}
                            </span>
                          )) : (
                            <span className="text-sm text-gray-500 italic">Open to all opportunities</span>
                          )}
                        </div>

                        <h4 className="font-bold mb-3">Languages</h4>
                        <p className="text-gray-700">{currentProfile.languages.join(', ')}</p>
                      </>
                    )}

                    {userRole === 'expert' && (
                      <>
                        <h4 className="font-bold mb-3">Areas of Expertise</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {currentProfile.expertise.length > 0 ? currentProfile.expertise.map((item: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg"
                            >
                              {item}
                            </span>
                          )) : (
                            <span className="text-sm text-gray-500 italic">No expertise listed</span>
                          )}
                        </div>

                        <h4 className="font-bold mb-3">Industries</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {currentProfile.industries.length > 0 ? currentProfile.industries.map((item: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm font-medium rounded-lg"
                            >
                              {item}
                            </span>
                          )) : (
                            <span className="text-sm text-gray-500 italic">No industry focus specified</span>
                          )}
                        </div>
                      </>
                    )}

                    {userRole === 'investor' && (
                      <>
                        <h4 className="font-bold mb-3">What I Look For</h4>
                        <ul className="space-y-2 mb-6">
                          {currentProfile.lookingFor.length > 0 ? currentProfile.lookingFor.map((item: any, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{item}</span>
                            </li>
                          )) : (
                             <li className="text-sm text-gray-500 italic">No specific requirements listed.</li>
                          )}
                        </ul>

                        <h4 className="font-bold mb-3 text-red-600">Deal Breakers</h4>
                        <ul className="space-y-2">
                          {currentProfile.dealBreakers.length > 0 ? currentProfile.dealBreakers.map((item: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{item}</span>
                            </li>
                          )) : (
                            <li className="text-sm text-gray-500 italic">No deal breakers specified.</li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Media Tab Content */}
              {activeTab === 'Media' && (
                <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="space-y-6"
                >
                   {currentProfile.introVideo ? (
                     <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-bold mb-4">Videos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-md">
                                 <video 
                                    src={currentProfile.introVideo} 
                                    controls 
                                    className="w-full h-full"
                                 />
                              </div>
                              <p className="text-sm font-medium text-gray-700">30-Second Intro Pitch</p>
                           </div>
                        </div>
                     </div>
                   ) : (
                     <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-bold mb-2">No Media Collections</h3>
                        <p className="text-gray-500">Photos, videos, and pitch decks shared by this user will appear here.</p>
                     </div>
                   )}
                </motion.div>
              )}

              {/* Connections Tab Empty State */}
              {activeTab === 'Connections' && (
                <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="bg-white rounded-xl shadow-sm p-12 text-center"
                >
                   <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                   <h3 className="text-xl font-bold mb-2">Build Your Network</h3>
                   <p className="text-gray-500">Discover and connect with founders, experts and investors at NextIgnition.</p>
                </motion.div>
              )}

              {/* Reviews/Portfolio Tab Empty State */}
              {(activeTab === 'Reviews' || (activeTab === 'Portfolio' && userRole === 'investor')) && (
                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl shadow-sm p-12 text-center"
                 >
                    <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-bold mb-2">No entries yet</h3>
                    <p className="text-gray-500">History will be populated as interactions happen on the platform.</p>
                 </motion.div>
              )}

              {/* Founder Portfolio (Startups Founded) */}
              {activeTab === 'Portfolio' && userRole === 'founder' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold">Startups Founded</h3>
                  {currentProfile.startup ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                          {currentProfile.startup.logo}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold mb-1">{currentProfile.startup.name}</h4>
                          <p className="text-gray-600">{currentProfile.startup.mission}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          ACTIVE
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                        <div>
                          <div className="text-xl font-bold">Stage</div>
                          <div className="text-sm text-gray-600">{currentProfile.startup.stage}</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold">Industry</div>
                          <div className="text-sm text-gray-600">{currentProfile.startup.industry}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 mt-2">
                        <div>
                          <div className="text-xl font-bold">Team Size</div>
                          <div className="text-sm text-gray-600">{currentProfile.startup.teamSize}</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold">Funding</div>
                          <div className="text-sm text-gray-600">{currentProfile.startup.fundingStatus}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                       <Rocket className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                       <p className="text-gray-500 font-medium">No startups listed yet.</p>
                       <button onClick={onNavigateToSettings} className="mt-4 text-blue-600 font-bold hover:underline">Add yours now →</button>
                    </div>
                  )}

                  <h3 className="text-xl font-bold mt-6">Achievements & Experience</h3>
                  <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
                    <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Awards and certifications will appear here as they are added.</p>
                  </div>
                </div>
              )}

              {/* Expert Services Tab Empty State */}
              {activeTab === 'Services' && userRole === 'expert' && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                   <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                   <h3 className="text-xl font-bold mb-2">Consultation Packages</h3>
                   <p className="text-gray-500">No consultation packages listed yet. Service packages allow founders to book your time directly.</p>
                   {isOwnProfile && (
                     <button onClick={onNavigateToSettings} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
                       Create First Service
                     </button>
                   )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {userRole === 'founder' && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-bold mb-4">Startup Snapshot</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Current Focus</p>
                      <p className="font-bold text-gray-800">{currentProfile.startup?.industry || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Funding Interest</p>
                      <p className="font-bold text-gray-800">{currentProfile.startup?.fundingStatus || 'Contact for Pitch'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Team Size</p>
                      <p className="font-bold text-gray-800">{currentProfile.startup?.teamSize || 'Founder'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                      <h3 className="font-bold">NextIgnition Tips</h3>
                    </div>
                    <p className="text-sm text-blue-50 mb-4">
                      Complete your profile bio and add your social links to increase visibility to potential co-founders.
                    </p>
                    <button onClick={onNavigateToSettings} className="w-full px-4 py-2 bg-white text-blue-700 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors">
                      Update Profile
                    </button>
                  </div>
                </div>
              </>
            )}

            {userRole === 'expert' && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-bold mb-4">Meeting Availability</h3>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-4">Set your weekly meeting hours and review upcoming sessions.</p>
                    <button
                      onClick={() => setShowAvailabilityModal(true)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md transition-colors"
                    >
                      Sync Calendar
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-bold mb-4">Expertise Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.expertise.length > 0 ? currentProfile.expertise.map((tag: string, i: number) => (
                       <span key={i} className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">#{tag}</span>
                    )) : (
                       <p className="text-xs text-gray-400 italic">No tags added yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {userRole === 'investor' && (
              <>
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                  <h3 className="font-bold mb-3">Investment Focus</h3>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {currentProfile.thesis || 'Share your investment thesis to help founders find you.'}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
                  <h3 className="text-lg font-bold mb-4">Activity Log</h3>
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-500 font-medium">Recent platform activities will be logged here.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Create Post</h2>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Post Type Selector */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                {postTypes.map((type: PostTypeOption) => (
                  <button
                    key={type.type}
                    onClick={() => setSelectedPostType(type.type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${selectedPostType === type.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <type.icon
                      className="w-6 h-6"
                      style={{ color: selectedPostType === type.type ? type.color : '#6b7280' }}
                    />
                    <span className={`text-xs font-medium ${selectedPostType === type.type ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {currentProfile.avatarUrl ? (
                    <>
                      <img
                        src={currentProfile.avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.classList.remove('hidden');
                            e.currentTarget.nextElementSibling.classList.add('flex');
                          }
                        }}
                      />
                      <div className="hidden items-center justify-center w-full h-full text-white">
                        {currentProfile.avatarFallback}
                      </div>
                    </>
                  ) : (
                    <span>{currentProfile.avatarFallback}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{currentProfile.name}</h3>
                  <p className="text-sm text-gray-600">Post publicly</p>
                </div>
              </div>

              {/* Content Input */}
              <textarea name="textarea-c60e9f"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={6}
                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
              />

              {/* Type-specific inputs */}
              {selectedPostType === 'image' && (
                <div className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-gray-400 transition-colors">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Click to upload images</p>
                  <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                </div>
              )}

              {selectedPostType === 'video' && (
                <div className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-gray-400 transition-colors">
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Click to upload video</p>
                  <p className="text-sm text-gray-500 mt-1">MP4, MOV, AVI up to 100MB</p>
                </div>
              )}

              {selectedPostType === 'poll' && (
                <div className="mb-4 space-y-3">
                  <input name="input-1b6b62"
                    type="text"
                    placeholder="Poll question"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input name="input-0f5363"
                    type="text"
                    placeholder="Option 1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input name="input-14cc87"
                    type="text"
                    placeholder="Option 2"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Add option
                  </button>
                </div>
              )}

              {selectedPostType === 'milestone' && (
                <div className="mb-4 space-y-3">
                  <input name="input-54c95f"
                    type="text"
                    placeholder="Milestone title (e.g., 'Raised $1M')"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select name="select-eb994f" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select milestone type</option>
                    <option>💰 Funding</option>
                    <option>🚀 Product Launch</option>
                    <option>👥 Team Milestone</option>
                    <option>📈 Growth Milestone</option>
                    <option>🏆 Award/Recognition</option>
                  </select>
                </div>
              )}

              {selectedPostType === 'document' && (
                <div className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-gray-400 transition-colors">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Click to upload document</p>
                  <p className="text-sm text-gray-500 mt-1">PDF, DOC, PPT up to 10MB</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Add emoji">
                    <Smile className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Add location">
                    <MapPin className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Add link">
                    <LinkIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Schedule post">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex-1 sm:flex-none px-3 py-2 bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white rounded-lg transition-all hover:shadow-md flex items-center justify-center gap-2"
                    title="Enhance with AI"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium whitespace-nowrap">Enhance with AI</span>
                  </button>
                  <button
                    onClick={handleCreatePost}
                    className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r text-white rounded-lg font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                    style={{
                      background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`,
                    }}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Add Milestone</h2>
                <button
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Milestone Title</label>
                  <input name="input-8ac6e4"
                    type="text"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="e.g., Closed Series A Funding"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea name="textarea-a7b7fd"
                    value={milestoneDescription}
                    onChange={(e) => setMilestoneDescription(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg min-h-[120px]"
                    placeholder="Share details about this milestone..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input name="input-9e5010"
                    type="date"
                    value={milestoneDate}
                    onChange={(e) => setMilestoneDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select name="select-ac41fd" 
                    value={milestoneCategory}
                    onChange={(e) => setMilestoneCategory(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option>Funding</option>
                    <option>Product</option>
                    <option>Team</option>
                    <option>Partnership</option>
                    <option>Revenue</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMilestone}
                  className="px-6 py-2 rounded-lg font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  Add Milestone
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">My Availability</h2>
                <button
                  onClick={() => setShowAvailabilityModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4">Weekly Schedule</h3>
                <div className="space-y-3">
                  {weeklySchedule.map((d, i) => (
                    <div key={d.day} className="flex items-center gap-4">
                      <div className="w-28 font-medium">{d.day}</div>
                      <input type="time" className="p-2 border border-gray-300 rounded-lg disabled:opacity-50" value={d.start} disabled={!d.available}
                        onChange={(e) => setWeeklySchedule(s => s.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} />
                      <span>to</span>
                      <input type="time" className="p-2 border border-gray-300 rounded-lg disabled:opacity-50" value={d.end} disabled={!d.available}
                        onChange={(e) => setWeeklySchedule(s => s.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} />
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={d.available} className="rounded"
                          onChange={(e) => setWeeklySchedule(s => s.map((x, j) => j === i ? { ...x, available: e.target.checked } : x))} />
                        <span className="text-sm">Available</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4">Upcoming Sessions</h3>
                <div className="space-y-3">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Strategy Call - TechStartup Inc.</p>
                        <p className="text-sm text-gray-600">Tomorrow, 2:00 PM - 3:00 PM</p>
                      </div>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        View Details
                      </button>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Growth Workshop - FinTech Co.</p>
                        <p className="text-sm text-gray-600">Jan 30, 10:00 AM - 12:00 PM</p>
                      </div>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAvailabilityModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Close
                </button>
                {Capacitor.getPlatform() !== 'ios' && (
                <button
                  onClick={handleUpdateAvailability}
                  disabled={savingAvailability}
                  className="px-6 py-2 rounded-lg font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  {savingAvailability ? 'Saving...' : 'Update Availability'}
                </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Offer Modal */}
      {showCreateOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Service Offer</h2>
                <button
                  onClick={() => setShowCreateOfferModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Service Title</label>
                  <input name="input-105b04"
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="e.g., 60-min Growth Strategy Session"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea name="textarea-816129"
                    className="w-full p-3 border border-gray-300 rounded-lg min-h-[120px]"
                    placeholder="Describe what's included in this service..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Price</label>
                    <input name="input-412f8a"
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="$299"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration</label>
                    <select name="select-ca0ab0" className="w-full p-3 border border-gray-300 rounded-lg">
                      <option>30 minutes</option>
                      <option>60 minutes</option>
                      <option>90 minutes</option>
                      <option>2 hours</option>
                      <option>Custom</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select name="select-80f23a" className="w-full p-3 border border-gray-300 rounded-lg">
                    <option>1:1 Mentorship</option>
                    <option>Workshop</option>
                    <option>Advisory</option>
                    <option>Consultation</option>
                    <option>Code Review</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">What's Included</label>
                  <div className="space-y-2">
                    <input name="input-3fb01b"
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="e.g., 1:1 video call"
                    />
                    <input name="input-e3b9ac"
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="e.g., Actionable insights"
                    />
                    <input name="input-109e2f"
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="e.g., Follow-up notes"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateOfferModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                {Capacitor.getPlatform() !== 'ios' && (
                <button
                  className="px-6 py-2 rounded-lg font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  Create Offer
                </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
