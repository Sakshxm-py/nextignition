import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Mic,
  SlidersHorizontal,
  Sparkles,
  Grid3x3,
  List,
  MapPin,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Check,
  Building2,
  Briefcase,
  GraduationCap,
  Target,
  BarChart3,
  Award,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  FileText,
  Video,
  Download,
  ThumbsUp,
  Plus,
  UserPlus,
  UserCheck,
  BadgeCheck
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { getInvestorDiscovery, addStartupToPipeline } from '../services/investorService';
import { toggleProfileBookmark, getSavedProfiles } from '../services/bookmarkService';
import DirectMessaging from './DirectMessaging';
import { Avatar } from './common/Avatar';
import { ProfileViewModal } from './ProfileViewModal';
import api from '../services/api';

type SearchMode = 'founders' | 'startups' | 'combined';
type ViewMode = 'grid' | 'list';

interface Founder {
  id: number;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location: string;
  aiScore: number;
  isOnline: boolean;
  isVerified: boolean;
  currentStartup?: {
    name: string;
    logo: string;
    pitch: string;
    stage: string;
  };
  skills: string[];
  metrics: {
    startupsFounded: number;
    fundingRaised: string;
    connections: number;
    exits: number;
  };
  highlights: string[];
  aiInsight: string;
  recentAt?: number;
}

interface Startup {
  id: string | number;
  name: string;
  logo: string;
  pitch: string;
  founderId?: string;
  industry: string[];
  stage: string;
  fundingNeed: string;
  equity: string;
  aiScore: number;
  traction: string[];
  founders?: { name: string; avatar: string; role: string }[];
  investorActivity?: {
    views: number;
    interested: number;
    lastUpdated: string;
  };
  metrics: {
    users: string;
    growth: string;
    mrr: string;
  };
  hasPitchDeck: boolean;
  hasPitchVideo: boolean;
  aiInsight?: string;
  recentAt?: number;
}

interface DiscoverInvestorProps {
  onViewStartupProfile?: (startupId: string) => void;
}

// ── AI match score ───────────────────────────────────────────────────────────
// Deterministic 0-100 "investment-readiness" score derived from real profile
// signals (completeness, verification, traction). Replaces the old hardcoded 0
// so the "AI: x%" badge reflects something meaningful and varies per profile.
function computeFounderAiScore(u: any): number {
  const p = u?.profile || {};
  let score = 42; // baseline for a listed, discoverable founder
  if (String(p.bio || u?.bio || '').trim().length > 40) score += 12;
  if (p.location || u?.location) score += 5;
  if (u?.avatar && /^https?:\/\//i.test(String(u.avatar))) score += 6;
  const skills = Array.isArray(p.skills) ? p.skills : [];
  score += Math.min(skills.length, 5) * 2; // up to +10
  if (u?.isVerified) score += 13;
  if (u?.startupName) score += 8;
  const m = u?.metrics || {};
  if (Number(m.startupsFounded) > 0) score += 4;
  if (Number(m.connections) > 0) score += Math.round(Math.min(Number(m.connections) / 20, 1) * 4);
  if (Number(m.exits) > 0) score += 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeStartupAiScore(s: any): number {
  let score = 42;
  if (String(s?.description || '').trim().length > 40) score += 14;
  const hasIndustry = Array.isArray(s?.industry) ? s.industry.length > 0 : !!s?.industry;
  if (hasIndustry) score += 8;
  if (s?.stage && s.stage !== 'unknown') score += 10;
  if (Number(s?.funding?.target) > 0) score += 12;
  if (s?.equity) score += 6;
  if (s?.founder) score += 4;
  if (s?.isVerified || s?.verified) score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Client-side predicate for the founder filter drawer. Filters we can't evaluate
// from the available data pass through (never exclude) so the list can't be
// accidentally emptied.
function founderMatchesFilter(f: any, filter: string): boolean {
  const hay = `${f.name || ''} ${f.bio || ''} ${(f.skills || []).join(' ')} ${(f.highlights || []).join(' ')} ${f.currentStartup?.name || ''}`.toLowerCase();
  const loc = String(f.location || '').toLowerCase();
  switch (filter) {
    case 'High AI Score (80+)': return (f.aiScore || 0) >= 80;
    case 'Active This Week': return f.recentAt ? (Date.now() - f.recentAt) < 7 * 24 * 3600 * 1000 : true;
    case 'Previous Exit': return (f.metrics?.exits || 0) > 0;
    case 'IIT': return hay.includes('iit');
    case 'IIM': return hay.includes('iim');
    case 'IIT/IIM Alumni': return hay.includes('iit') || hay.includes('iim');
    case 'YC Alumni':
    case 'Ex-YC': return hay.includes('yc') || hay.includes('combinator');
    case 'Ex-FAANG': return /faang|google|meta|facebook|amazon|apple|netflix|microsoft/.test(hay);
    case 'Technical Co-founders': return (f.skills || []).some((s: string) => /engineer|developer|cto|technical|tech|full.?stack/i.test(s));
    case 'Mumbai/Bangalore': return /mumbai|bangalore|bengaluru/.test(loc);
    case 'Based in Mumbai': return loc.includes('mumbai');
    default: return true; // unknown / not-applicable filter → don't exclude
  }
}

export default function DiscoverInvestor({ onViewStartupProfile }: { onViewStartupProfile?: (startupId: string) => void }) {
  const [searchMode, setSearchMode] = useState<SearchMode>('combined');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [aiScoreMin, setAiScoreMin] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [showAIEvaluation, setShowAIEvaluation] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [expandedInsights, setExpandedInsights] = useState<(string | number)[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [savedFounderIds, setSavedFounderIds] = useState<(string | number)[]>(() => {
    const raw = localStorage.getItem('discoverInvestor_savedFounderIds');
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [showChat, setShowChat] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get<{ followingUserIds: string[] }>('/follow/following');
        setFollowingIds(new Set(resp.data?.followingUserIds || []));
      } catch {
        // non-fatal
      }
    })();
  }, []);

  const toggleFollowUser = async (userId?: string) => {
    const id = String(userId || '').trim();
    if (!id) {
      setToast({ message: 'Following is not available for this profile yet', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const wasFollowing = followingIds.has(id);
    // optimistic update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      wasFollowing ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (wasFollowing) await api.delete(`/follow/${id}`);
      else await api.post(`/follow/${id}`);
      setToast({ message: wasFollowing ? 'Unfollowed' : 'Following — you can message once they follow you back', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      // revert on failure
      setFollowingIds((prev) => {
        const next = new Set(prev);
        wasFollowing ? next.add(id) : next.delete(id);
        return next;
      });
      setToast({ message: err?.response?.data?.message || 'Failed to update follow', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const mapQuickFiltersToParams = (filters: string[]) => {
    // Backend `Startup.stage` enum: idea | mvp | beta | growth | scale
    const stageMap: Record<string, string[]> = {
      'Pre-seed': ['idea'],
      'Seed': ['mvp'],
      'Series A+': ['beta', 'growth', 'scale'],
    };

    const industries: string[] = [];
    const stages: string[] = [];
    let hasPitchDeck: boolean | undefined;

    filters.forEach((f) => {
      if (f === 'Has Pitch Deck') {
        hasPitchDeck = true;
        return;
      }
      if (f === 'SaaS') {
        industries.push('SaaS');
        return;
      }
      if (f === 'FinTech') {
        industries.push('FinTech');
        return;
      }
      if (f === 'Pre-seed') {
        stages.push(...stageMap['Pre-seed']);
        return;
      }
      if (f === '10K+ Users') {
        // Not supported by backend schema yet; keep as client-side-only in future
        return;
      }
      if (f === 'Revenue ₹5L+') {
        // Not supported by backend schema yet; keep as client-side-only in future
        return;
      }
    });

    return {
      industries: industries.length > 0 ? industries.join(',') : undefined,
      stages: stages.length > 0 ? Array.from(new Set(stages)).join(',') : undefined,
      hasPitchDeck,
      // future: searchQuery
    };
  };

  const fetchFounders = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const envBase = (import.meta as any).env?.VITE_API_URL as string | undefined;
      const isAndroid = window.location.hostname === '10.0.2.2' || window.location.href.includes('capacitor://');
      const fallback = isAndroid ? 'https://nextignition-l3b5.onrender.com/api' : 'https://nextignition-l3b5.onrender.com/api';
      const base = envBase || fallback;
      const res = await fetch(`${base}/auth/users?role=founder`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Founder[] = (Array.isArray(data) ? data : []).map((u: any) => ({
        id: u.id || u._id,
        name: u.name || 'Unknown',
        username: u.username ? `@${u.username}` : `@${(u.name || 'user').toLowerCase().replace(/\s+/g, '')}`,
        avatar: u.avatar || (u.name || 'U').substring(0, 2).toUpperCase(),
        bio: u.profile?.bio || u.bio || '',
        location: u.profile?.location || u.location || 'Unknown',
        aiScore: u.aiScore || computeFounderAiScore(u),
        isOnline: false,
        isVerified: u.isVerified || false,
        currentStartup: u.startupName ? { name: u.startupName, logo: (u.startupName || 'S').substring(0, 2).toUpperCase(), pitch: '', stage: '' } : undefined,
        skills: Array.isArray(u.profile?.skills) ? u.profile.skills : [],
        metrics: {
          startupsFounded: u.metrics?.startupsFounded || 0,
          fundingRaised: u.metrics?.fundingRaised || '0',
          connections: u.metrics?.connections || 0,
          exits: u.metrics?.exits || 0
        },
        highlights: Array.isArray(u.profile?.highlights) ? u.profile.highlights : [],
        aiInsight: u.aiInsight || '',
        recentAt: new Date(u.updatedAt || u.lastActive || u.createdAt || 0).getTime() || 0
      }));
      setFounders(mapped);
    } catch (err) {
      console.error('Failed to fetch founders:', err);
      setFounders([]);
    }
  };


  const fetchStartups = async (filters: string[] = selectedFilters) => {
    try {
      setLoading(true);
      const params = mapQuickFiltersToParams(filters);
      const data = await getInvestorDiscovery(params);

      const mapped = data.map((s: any) => ({
        id: s.id || s._id,
        name: s.name,
        logo: s.logo || (s.name || 'S').substring(0, 2).toUpperCase(),
        pitch: s.description || '',
        founderId: s.founder?._id?.toString?.() || s.founder?.toString?.() || '',
        industry: typeof s.industry === 'string'
          ? s.industry.split(',').map((x: string) => x.trim()).filter(Boolean)
          : Array.isArray(s.industry) ? s.industry : [],
        stage: s.stage || 'unknown',
        aiScore: s.aiScore || computeStartupAiScore(s),
        fundingNeed: s.funding ? `${s.funding.currency || '₹'}${s.funding.target || 0}` : 'N/A',
        equity: s.equity ? `${s.equity}%` : '—%',
        metrics: {
          users: 'N/A',
          growth: 'N/A',
          mrr: 'N/A'
        },
        traction: (s.milestones || []).map((m: any) => m.title || 'Milestone'),
        founders: [{
          name: s.founder?.name || 'Unknown Founder',
          avatar: s.founder?.avatar || (s.founder?.name || 'U').substring(0, 2).toUpperCase(),
          role: 'Founder'
        }],
        investorActivity: {
          views: 0,
          interested: 0,
          lastUpdated: 'Recently'
        },
        aiInsight: s.summary || 'AI Analysis pending...',
        hasPitchDeck: !!s.pitchDeckUrl,
        hasPitchVideo: false,
        recentAt: new Date(s.updatedAt || s.createdAt || 0).getTime() || 0
      }));

      setStartups(mapped);
    } catch (error) {
      console.error('Failed to fetch startups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageFounder = (startup: Startup) => {
    const founderId = startup.founderId;
    if (!founderId || !founderId.trim()) {
      setToast({ message: 'Founder chat is not available for this startup', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setChatUserId(founderId);
    setShowChat(true);
  };

  // Fetch startups from backend will be handled by the useEffect watching selectedFilters and searchMode below

  useEffect(() => {
    if (searchMode === 'startups' || searchMode === 'combined') {
      fetchStartups(selectedFilters);
    }
    if (searchMode === 'founders' || searchMode === 'combined') {
      fetchFounders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilters, searchMode]);


  const toggleQuickFilter = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter) ? prev.filter((x) => x !== filter) : [...prev, filter]
    );
  };

  const handleAddToPipeline = async (startupId: string) => {
    try {
      await addStartupToPipeline(startupId);
      setToast({ message: 'Added to pipeline successfully!', type: 'success' });

      const added = startups.find((s) => s.id === (startupId as any));
      if (added?.founderId) {
        localStorage.setItem('pendingChatUserId', added.founderId);
      }

      // Refresh list to remove the added startup
      await fetchStartups(selectedFilters);
    } catch (error) {
      setToast({ message: 'Failed to add to pipeline', type: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    localStorage.setItem('discoverInvestor_savedFounderIds', JSON.stringify(savedFounderIds));
  }, [savedFounderIds]);

  useEffect(() => {
    const syncSavedProfiles = async () => {
      try {
        const saved = await getSavedProfiles();
        if (saved && Array.isArray(saved)) {
          const ids = saved.map(p => p.id);
          setSavedFounderIds(ids);
        }
      } catch (err) {
        console.error('Failed to sync saved profiles:', err);
      }
    };
    syncSavedProfiles();
  }, []);

  const handleToggleSaveStartup = async (startupId: string | number) => {
    try {
      await api.post(`/bookmarks/startup/toggle/${startupId}`);
      setToast({ message: 'Bookmark updated', type: 'success' });
    } catch (err) {
      console.error('Failed to toggle startup bookmark:', err);
      setToast({ message: 'Failed to update bookmark', type: 'error' });
    }
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggleSaveFounder = async (founderId: string | number) => {
    // Optimistic UI update
    setSavedFounderIds((prev) => {
      const exists = prev.includes(founderId);
      const next = exists ? prev.filter((x) => x !== founderId) : [...prev, founderId];
      return next;
    });

    try {
      const result = await toggleProfileBookmark(String(founderId), 'founder');
      setToast({ message: result.saved ? 'Profile saved' : 'Removed from saved', type: 'success' });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      setToast({ message: 'Failed to update bookmark', type: 'error' });
      // Revert optimistic update on error
      setSavedFounderIds((prev) => {
        const exists = prev.includes(founderId);
        return exists ? prev.filter((x) => x !== founderId) : [...prev, founderId];
      });
    }
    setTimeout(() => setToast(null), 2500);
  };

  const handleShareFounder = async (founder: Founder) => {
    const link = `${window.location.origin}/profile/${encodeURIComponent(String(founder.username || founder.id))}`;
    try {
      await navigator.clipboard.writeText(link);
      setToast({ message: 'Profile link copied', type: 'success' });
    } catch {
      setToast({ message: 'Unable to copy link', type: 'error' });
    }
    setTimeout(() => setToast(null), 2500);
  };

  const handleMessageFounderProfile = (founder: Founder) => {
    const possibleUserId = String((founder as any)?.userId || '').trim();
    if (!possibleUserId) {
      setToast({ message: 'Messaging is not available for this profile yet', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setChatUserId(possibleUserId);
    setShowChat(true);
  };

  const filteredFounders = founders.filter(f => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(q) ||
      f.bio.toLowerCase().includes(q) ||
      f.location.toLowerCase().includes(q) ||
      f.skills.some(s => s.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if ((f.aiScore || 0) < aiScoreMin) return false;
    return selectedFilters.every(flt => founderMatchesFilter(f, flt));
  });

  const filteredStartups = startups.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(q) ||
      s.pitch.toLowerCase().includes(q) ||
      s.industry.some(i => i.toLowerCase().includes(q));
    // selectedFilters for startups are applied server-side (fetchStartups);
    // the AI-score minimum is applied client-side here.
    return matchesSearch && (s.aiScore || 0) >= aiScoreMin;
  });

  // Extract a number from strings like "₹1,00,000", "$5M", "12K".
  const toNum = (v: any): number => {
    if (typeof v === 'number') return v;
    const s = String(v ?? '').replace(/,/g, '').trim();
    const m = s.match(/([\d.]+)\s*([kmb])?/i);
    if (!m) return 0;
    let n = parseFloat(m[1]) || 0;
    const suf = (m[2] || '').toLowerCase();
    if (suf === 'k') n *= 1e3; else if (suf === 'm') n *= 1e6; else if (suf === 'b') n *= 1e9;
    return n;
  };

  // Apply the "Sort by" dropdown. 'relevance' keeps the server order.
  function applySort<T extends { aiScore: number; location?: string; name?: string }>(
    list: T[],
    tractionOf: (x: T) => number,
    recentOf: (x: T) => number,
  ): T[] {
    const arr = [...list];
    switch (sortBy) {
      case 'ai-score': arr.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)); break;
      case 'traction': arr.sort((a, b) => tractionOf(b) - tractionOf(a)); break;
      case 'recent': arr.sort((a, b) => recentOf(b) - recentOf(a)); break;
      case 'location':
        arr.sort((a, b) => String((a as any).location || a.name || '').localeCompare(String((b as any).location || b.name || '')));
        break;
      default: break;
    }
    return arr;
  }

  const sortedFounders = applySort(
    filteredFounders,
    (f) => (Number(f.metrics?.exits) || 0) * 1000 + toNum(f.metrics?.fundingRaised) + (Number(f.metrics?.connections) || 0) * 10 + (Number(f.metrics?.startupsFounded) || 0) * 100,
    (f) => f.recentAt || 0,
  );
  const sortedStartups = applySort(
    filteredStartups,
    (s) => (Array.isArray(s.traction) ? s.traction.length : 0) * 10 + toNum(s.fundingNeed),
    (s) => s.recentAt || 0,
  );

  const quickFilters = {
    founders: ['Technical Co-founders', 'Ex-YC', 'Based in Mumbai', 'Looking for Funding', 'IIT/IIM Alumni'],
    startups: ['Pre-seed', 'SaaS', 'FinTech', '10K+ Users', 'Revenue ₹5L+', 'Has Pitch Deck'],
    combined: ['High AI Score (80+)', 'Active This Week', 'Mumbai/Bangalore', 'Pre-seed/Seed']
  };

  const getResultsCount = () => {
    if (searchMode === 'founders') return filteredFounders.length;
    if (searchMode === 'startups') return filteredStartups.length;
    return filteredFounders.length + filteredStartups.length;
  };

  const getPlaceholder = () => {
    if (searchMode === 'founders') return 'Search founders by name, skills, location, industry...';
    if (searchMode === 'startups') return 'Search startups by name, industry, stage, traction...';
    return 'Search founders or startups...';
  };

  const toggleInsight = (id: string | number) => {
    setExpandedInsights(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 p-3 lg:p-4 space-y-3">
          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'founders', icon: Briefcase, label: 'Founders', count: loading ? '...' : founders.length.toString() },
              { id: 'startups', icon: Target, label: 'Startups', count: loading ? '...' : startups.length.toString() },
              { id: 'combined', icon: Search, label: 'Combined Search', count: loading ? '...' : (founders.length + startups.length).toString() }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSearchMode(tab.id as SearchMode)}
                className={`flex items-center gap-2 px-3 sm:px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex-shrink-0 snap-start ml-[5px] ${searchMode === tab.id
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
                style={searchMode === tab.id ? {
                  backgroundColor: brandColors.electricBlue,
                  borderBottom: `3px solid ${brandColors.atomicOrange}`
                } : {}}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm sm:text-base">{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${searchMode === tab.id ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                  }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl">
            <div className="relative">
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-full focus-within:border-blue-500 transition-colors">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input name="input-11d2ab"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="flex-1 outline-none text-sm"
                />
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Mic className="w-5 h-5 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setShowAdvancedSearch(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Advanced</span>
                  </button>
                  <button
                    onClick={() => setShowAISearch(true)}
                    className="px-3 sm:px-4 py-2 text-sm font-bold text-white rounded-full transition-all hover:shadow-lg flex items-center gap-2 flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Ask Ignisha</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {quickFilters[searchMode].map(filter => (
                <button
                  key={filter}
                  onClick={() => {
                    if (searchMode === 'startups') toggleQuickFilter(filter);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${searchMode === 'startups' && selectedFilters.includes(filter)
                    ? 'bg-blue-50 border border-blue-500 text-blue-700'
                    : 'bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{getResultsCount()}</span> {searchMode} match your criteria
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select name="select-c75d55"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">Sort by: Relevance</option>
              <option value="ai-score">AI Score</option>
              <option value="traction">Highest Traction</option>
              <option value="recent">Recently Active</option>
              <option value="location">Location</option>
            </select>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Filters</span>
              {selectedFilters.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {selectedFilters.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Discovering opportunities...</p>
            </div>
          ) : (
            <>
              {searchMode === 'founders' && (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                  {filteredFounders.length === 0 && !loading && (
                    <div className="col-span-3 text-center py-16 text-gray-500">No founders found</div>
                  )}
                  {sortedFounders.map(founder => (
                    <FounderCard
                      key={founder.id}
                      founder={founder}
                      viewMode={viewMode}
                      isInsightExpanded={expandedInsights.includes(founder.id)}
                      onToggleInsight={() => toggleInsight(founder.id)}
                      onViewProfile={() => setSelectedProfile(founder)}
                      onShowAIEvaluation={() => {
                        setSelectedProfile(founder);
                        setShowAIEvaluation(true);
                      }}
                      onMessageFounder={() => handleMessageFounderProfile(founder)}
                      onToggleSave={() => handleToggleSaveFounder(founder.id)}
                      onShare={() => void handleShareFounder(founder)}
                      isFollowing={followingIds.has(String((founder as any).userId || ''))}
                      onToggleFollow={() => toggleFollowUser((founder as any).userId)}
                    />
                  ))}
                </div>
              )}

              {searchMode === 'startups' && (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                  {filteredStartups.length === 0 && !loading && (
                    <div className="col-span-3 text-center py-16 text-gray-500">No startups found</div>
                  )}
                  {sortedStartups.map(startup => (
                    <StartupCard
                      key={startup.id}
                      startup={startup}
                      viewMode={viewMode}
                      isInsightExpanded={expandedInsights.includes(startup.id)}
                      onToggleInsight={() => toggleInsight(startup.id)}
                      onViewProfile={() => {
                        window.location.hash = `#startup/${startup.id || (startup as any)._id}`;
                      }}
                      onShowAIEvaluation={() => {
                        setSelectedProfile(startup);
                        setShowAIEvaluation(true);
                      }}
                      onMessageFounder={() => handleMessageFounder(startup)}
                      onAddToPipeline={handleAddToPipeline}
                      onToggleSave={() => handleToggleSaveStartup(startup.id)}
                      isFollowing={followingIds.has(String(startup.founderId || ''))}
                      onToggleFollow={() => toggleFollowUser(startup.founderId)}
                    />
                  ))}
                </div>
              )}

              {searchMode === 'combined' && (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                  {filteredFounders.length === 0 && filteredStartups.length === 0 && !loading && (
                    <div className="col-span-3 text-center py-16 text-gray-500">No results found</div>
                  )}
                  {sortedFounders.map((item: any) => (
                    <FounderCard
                      key={`founder-${item.id}`}
                      founder={item}
                      viewMode={viewMode}
                      isInsightExpanded={expandedInsights.includes(item.id)}
                      onToggleInsight={() => toggleInsight(item.id)}
                      onViewProfile={() => setSelectedProfile(item)}
                      onShowAIEvaluation={() => {
                        setSelectedProfile(item);
                        setShowAIEvaluation(true);
                      }}
                      onMessageFounder={() => handleMessageFounderProfile(item)}
                      onToggleSave={() => handleToggleSaveFounder(item.id)}
                      onShare={() => void handleShareFounder(item)}
                      isFollowing={followingIds.has(String(item.userId || ''))}
                      onToggleFollow={() => toggleFollowUser(item.userId)}
                    />
                  ))}
                  {sortedStartups.map((item: any) => (
                    <StartupCard
                      key={`startup-${item.id}`}
                      startup={item}
                      viewMode={viewMode}
                      isInsightExpanded={expandedInsights.includes(item.id)}
                      onToggleInsight={() => toggleInsight(item.id)}
                      onViewProfile={() => {
                        window.location.hash = `#startup/${item.id || item._id}`;
                      }}
                      onShowAIEvaluation={() => {
                        setSelectedProfile(item);
                        setShowAIEvaluation(true);
                      }}
                      onMessageFounder={() => handleMessageFounder(item)}
                      onAddToPipeline={handleAddToPipeline}
                      onToggleSave={() => handleToggleSaveStartup(item.id)}
                      isFollowing={followingIds.has(String(item.founderId || ''))}
                      onToggleFollow={() => toggleFollowUser(item.founderId)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter Sidebar - Slides from Right */}
        <AnimatePresence>
          {showFilters && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilters(false)}
                className="fixed inset-0 bg-black/50 z-[590] lg:hidden"
              />

              {/* Sidebar */}
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed right-0 top-0 h-full w-[85%] max-w-sm bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 z-[600] shadow-2xl"
              >
                <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">
                      {searchMode === 'founders' ? 'Filter Founders' : searchMode === 'startups' ? 'Filter Startups' : 'Filter Results'}
                    </h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => { setSelectedFilters([]); setAiScoreMin(0); }} className="text-sm text-blue-600 hover:underline">Clear All</button>
                    {selectedFilters.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        {selectedFilters.length} active
                      </span>
                    )}
                  </div>
                </div>

                {/* Filter Sections */}
                <div className="p-4 space-y-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                  {/* Location Filter */}
                  <FilterSection title="Location" icon={<MapPin className="w-4 h-4" />}>
                    <input name="input-fde5cd"
                      type="text"
                      placeholder="City or country"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="input-e9f809" 
                          type="checkbox" 
                          className="rounded text-blue-600 focus:ring-blue-500" 
                          checked={selectedFilters.includes('Remote OK')}
                          onChange={() => toggleQuickFilter('Remote OK')}
                        />
                        <span className="text-sm text-gray-700">Remote OK</span>
                      </label>
                    </div>
                  </FilterSection>

                  {/* Stage Filter (for startups) */}
                  {searchMode !== 'founders' && (
                    <FilterSection title="Stage" icon={<TrendingUp className="w-4 h-4" />}>
                      <div className="space-y-2">
                        {['Idea', 'MVP', 'Growth', 'Scaling'].map(stage => (
                          <label key={stage} className="flex items-center gap-2 cursor-pointer">
                            <input name="input-7964e1" 
                              type="checkbox" 
                              className="rounded text-blue-600 focus:ring-blue-500"
                              checked={selectedFilters.includes(stage)}
                              onChange={() => toggleQuickFilter(stage)}
                            />
                            <span className="text-sm text-gray-700">{stage}</span>
                          </label>
                        ))}
                      </div>
                    </FilterSection>
                  )}

                  {/* Industry Filter */}
                  <FilterSection title="Industry" icon={<Building2 className="w-4 h-4" />}>
                    <div className="space-y-2">
                      {['SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML'].map(industry => (
                        <label key={industry} className="flex items-center gap-2 cursor-pointer">
                          <input name="input-93227c" 
                            type="checkbox" 
                            className="rounded text-blue-600 focus:ring-blue-500" 
                            checked={selectedFilters.includes(industry)}
                            onChange={() => toggleQuickFilter(industry)}
                          />
                          <span className="text-sm text-gray-700">{industry}</span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Funding Filter */}
                  <FilterSection title="Funding" icon={<DollarSign className="w-4 h-4" />}>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Funding Need</label>
                        <div className="flex gap-2">
                          <input name="input-39b368"
                            type="text"
                            placeholder="Min"
                            className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input name="input-687c2a"
                            type="text"
                            placeholder="Max"
                            className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {['Bootstrapped', 'Pre-seed', 'Seed', 'Series A+'].map(stage => (
                          <label key={stage} className="flex items-center gap-2 cursor-pointer">
                            <input name="input-a59153" 
                              type="checkbox" 
                              className="rounded text-blue-600 focus:ring-blue-500" 
                              checked={selectedFilters.includes(stage)}
                              onChange={() => toggleQuickFilter(stage)}
                            />
                            <span className="text-sm text-gray-700">{stage}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </FilterSection>

                  {/* Traction Filter */}
                  <FilterSection title="Traction" icon={<BarChart3 className="w-4 h-4" />}>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Users</label>
                        <select name="select-9b571f" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                          <option>Any</option>
                          <option>1K+</option>
                          <option>10K+</option>
                          <option>50K+</option>
                          <option>100K+</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Growth Rate (MoM)</label>
                        <select name="select-db8d6e" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                          <option>Any</option>
                          <option>10%+</option>
                          <option>20%+</option>
                          <option>50%+</option>
                          <option>100%+</option>
                        </select>
                      </div>
                    </div>
                  </FilterSection>

                  {/* AI Score Filter */}
                  <FilterSection title="AI Match Score" icon={<Sparkles className="w-4 h-4" />}>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-600 block">Minimum Score: {aiScoreMin}%</label>
                      <input name="input-837acc"
                        type="range"
                        min="0"
                        max="100"
                        value={aiScoreMin}
                        onChange={(e) => setAiScoreMin(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0</span>
                        <span>50</span>
                        <span>100</span>
                      </div>
                    </div>
                  </FilterSection>

                  {/* Credentials (for founders) */}
                  {searchMode !== 'startups' && (
                    <FilterSection title="Credentials" icon={<GraduationCap className="w-4 h-4" />}>
                      <div className="space-y-2">
                        {['IIT', 'IIM', 'YC Alumni', 'Ex-FAANG', 'Previous Exit'].map(cred => (
                          <label key={cred} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded text-blue-600 focus:ring-blue-500"
                              checked={selectedFilters.includes(cred)}
                              onChange={() => toggleQuickFilter(cred)}
                            />
                            <span className="text-sm">{cred}</span>
                          </label>
                        ))}
                      </div>
                    </FilterSection>
                  )}

                  {/* Apply Button */}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full py-3 rounded-lg text-white font-bold transition-colors"
                    style={{ backgroundColor: brandColors.electricBlue }}
                  >
                    Apply Filters
                  </button>

                  <button className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2">
                    <Bookmark className="w-4 h-4" />
                    Save Search
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Advanced Search Modal */}
        <AnimatePresence>
          {showAdvancedSearch && (
            <AdvancedSearchModal
              searchMode={searchMode}
              onClose={() => setShowAdvancedSearch(false)}
            />
          )}
        </AnimatePresence>

        {/* AI Search Modal */}
        <AnimatePresence>
          {showAISearch && (
            <AISearchModal onClose={() => setShowAISearch(false)} />
          )}
        </AnimatePresence>

        {/* AI Evaluation Panel */}
        <AnimatePresence>
          {showAIEvaluation && selectedProfile && (
            <AIEvaluationPanel
              profile={selectedProfile}
              type={'username' in selectedProfile ? 'founder' : 'startup'}
              onClose={() => {
                setShowAIEvaluation(false);
                setSelectedProfile(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Founder Profile View Modal */}
        {selectedProfile && !showAIEvaluation && 'username' in selectedProfile && (
          <ProfileViewModal
            profile={{
              id: selectedProfile.id,
              name: selectedProfile.name,
              avatar: selectedProfile.avatar,
              role: selectedProfile.username || 'Founder',
              title: selectedProfile.bio?.split('.')[0] || 'Founder',
              location: selectedProfile.location || 'Unknown',
              skills: selectedProfile.skills,
              bio: selectedProfile.bio,
              experience: `${selectedProfile.metrics?.startupsFounded || 0} startups founded`,
              completedProjects: selectedProfile.metrics?.exits || 0,
              verified: selectedProfile.isVerified,
              type: 'cofounder' as const
            }}
            onClose={() => setSelectedProfile(null)}
            onSendMessage={() => {
              const founder = selectedProfile;
              setSelectedProfile(null);
              handleMessageFounderProfile(founder);
            }}
          />
        )}

        {/* Direct Messaging Modal */}
        <AnimatePresence>
          {showChat && chatUserId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowChat(false);
                setChatUserId(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-xl w-full max-w-5xl h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <DirectMessaging
                  initialUserId={chatUserId}
                  onClose={() => {
                    setShowChat(false);
                    setChatUserId(null);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Filter Section Component
function FilterSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-sm">{title}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="p-3 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

// Founder Card Component
function FounderCard({ founder, viewMode, isInsightExpanded, onToggleInsight, onViewProfile, onShowAIEvaluation, onMessageFounder, onToggleSave, onShare, isFollowing, onToggleFollow }: {
  founder: Founder;
  viewMode: ViewMode;
  isInsightExpanded: boolean;
  onToggleInsight: () => void;
  onViewProfile: () => void;
  onShowAIEvaluation: () => void;
  onMessageFounder: () => void;
  onToggleSave: () => void;
  onShare: () => void;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 hover:shadow-lg transition-all"
      >
        {/* Identity row */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <Avatar
              src={founder.avatar}
              name={founder.name}
              size="lg"
            />
            {founder.isOnline && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">{founder.name}</h3>
              {founder.isVerified && (
                <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">{founder.username}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{founder.location}</span>
            </div>
          </div>

          <button
            onClick={onShowAIEvaluation}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${founder.aiScore >= 80 ? 'bg-green-100 text-green-700' :
              founder.aiScore >= 60 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}
          >
            <Sparkles className="w-3 h-3" />
            AI: {founder.aiScore}%
          </button>
        </div>

        {/* Bio */}
        {founder.bio && (
          <p className="text-sm text-gray-700 mt-3 line-clamp-2">{founder.bio}</p>
        )}

        {/* Skills */}
        {founder.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {founder.skills.slice(0, 4).map(skill => (
              <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                {skill}
              </span>
            ))}
            {founder.skills.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                +{founder.skills.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={onViewProfile}
            className="flex-1 px-4 py-2 rounded-lg text-white font-bold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColors.electricBlue }}
          >
            View Profile
          </button>
          <button onClick={onMessageFounder} title="Message" className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={onToggleSave} title="Save" className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
            <Bookmark className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={onShare} title="Share" className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
            <Share2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
    >
      {/* Header */}
      <div className="p-6 pb-4 relative">
        <button
          onClick={onShowAIEvaluation}
          className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${founder.aiScore >= 80 ? 'bg-green-100 text-green-700' :
            founder.aiScore >= 60 ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-700'
            }`}
        >
          <Sparkles className="w-3 h-3" />
          AI: {founder.aiScore}%
        </button>

        <div className="flex flex-col items-center mb-4">
          <div className="relative mb-3">
            <Avatar 
              src={founder.avatar} 
              name={founder.name} 
              size="2xl" 
            />
            {founder.isOnline && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-3 border-white rounded-full" />
            )}
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h3 className="font-bold text-lg">{founder.name}</h3>
              {founder.isVerified && (
                <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{founder.username}</p>
            <p className="text-sm text-gray-700 line-clamp-2">{founder.bio}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4" />
          <span>{founder.location}</span>
        </div>

        {/* Current Startup */}
        {founder.currentStartup && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: brandColors.atomicOrange }}
              >
                {founder.currentStartup.logo}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm">{founder.currentStartup.name}</h4>
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {founder.currentStartup.stage}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 line-clamp-1 mb-2">{founder.currentStartup.pitch}</p>
            <button
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: brandColors.electricBlue }}
              onClick={onViewProfile}
            >
              View Startup Profile
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {founder.skills.slice(0, 3).map(skill => (
            <span key={skill} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
              {skill}
            </span>
          ))}
          {founder.skills.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
              +{founder.skills.length - 3} more
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Startups</p>
              <p className="font-bold text-sm">{founder.metrics.startupsFounded}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Raised</p>
              <p className="font-bold text-sm">{founder.metrics.fundingRaised}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Network</p>
              <p className="font-bold text-sm">{founder.metrics.connections}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Exits</p>
              <p className="font-bold text-sm">{founder.metrics.exits}</p>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="space-y-1 mb-3">
          {founder.highlights.map((highlight, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">{highlight}</span>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={onToggleInsight}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span className="flex items-center gap-1">
              <Lightbulb className="w-4 h-4" style={{ color: brandColors.atomicOrange }} />
              AI Insights
            </span>
            {isInsightExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isInsightExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg"
            >
              {founder.aiInsight}
            </motion.div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 space-y-2">
        <button
          onClick={onViewProfile}
          className="w-full py-3 rounded-lg text-white font-bold transition-colors"
          style={{ backgroundColor: brandColors.electricBlue }}
        >
          View Full Profile
        </button>
        <button
          onClick={onToggleFollow}
          className={`w-full mb-2 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
            isFollowing ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
        </button>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={onMessageFounder}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="Message"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSave}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="Save"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            onClick={onShowAIEvaluation}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="AI Evaluation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onShare}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Startup Card Component
function StartupCard({ startup, viewMode, isInsightExpanded, onToggleInsight, onViewProfile, onShowAIEvaluation, onMessageFounder, onAddToPipeline, onToggleSave, isFollowing, onToggleFollow }: {
  startup: Startup;
  viewMode: ViewMode;
  isInsightExpanded: boolean;
  onToggleInsight: () => void;
  onViewProfile: () => void;
  onShowAIEvaluation: () => void;
  onMessageFounder: () => void;
  onAddToPipeline: (id: string) => void;
  onToggleSave: () => void;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 hover:shadow-lg transition-all"
      >
        {/* Identity row */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar
            src={startup.logo}
            name={startup.name}
            size="lg"
            variant="square"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">{startup.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {startup.industry.slice(0, 3).map(ind => (
                <span key={ind} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                  {ind}
                </span>
              ))}
              {startup.stage && startup.stage !== 'unknown' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-bold capitalize">
                  {startup.stage}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onShowAIEvaluation}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${startup.aiScore >= 80 ? 'bg-green-100 text-green-700' :
              startup.aiScore >= 60 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}
          >
            <Sparkles className="w-3 h-3" />
            AI: {startup.aiScore}%
          </button>
        </div>

        {/* Pitch */}
        {startup.pitch && (
          <p className="text-sm text-gray-700 mt-3 line-clamp-2">{startup.pitch}</p>
        )}

        {/* Metrics — only when there's real data */}
        {[startup.metrics.users, startup.metrics.growth, startup.metrics.mrr].some(v => v && v !== 'N/A') && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <p className="text-[11px] text-gray-500">Users</p>
              <p className="text-sm font-bold text-gray-900 truncate">{startup.metrics.users}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <p className="text-[11px] text-gray-500">Growth</p>
              <p className="text-sm font-bold text-green-600 truncate">{startup.metrics.growth}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <p className="text-[11px] text-gray-500">MRR</p>
              <p className="text-sm font-bold text-gray-900 truncate">{startup.metrics.mrr}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            onClick={onViewProfile}
            className="flex-1 px-4 py-2 rounded-lg text-white font-bold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColors.electricBlue }}
          >
            View Profile
          </button>
          <div className="flex gap-2 justify-end">
            <button onClick={() => onAddToPipeline(String(startup.id))} title="Add to Pipeline" className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={onMessageFounder} title="Message Founder" className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={onToggleSave} title="Save" className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              <Bookmark className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={onMessageFounder} title="Request Meeting" className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              <Calendar className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
    >
      {/* Header */}
      <div className="p-6 pb-4 relative">
        <button
          onClick={onShowAIEvaluation}
          className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${startup.aiScore >= 80 ? 'bg-green-100 text-green-700' :
            startup.aiScore >= 60 ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-700'
            }`}
        >
          <Sparkles className="w-3 h-3" />
          AI: {startup.aiScore}%
        </button>

        <div className="flex flex-col items-center mb-4">
          <Avatar 
            src={startup.logo} 
            name={startup.name} 
            size="xl" 
            variant="square" 
            className="mb-3"
          />

          <div className="text-center">
            <h3 className="font-bold text-lg mb-1">{startup.name}</h3>
            <div className="flex flex-wrap gap-2 justify-center mb-2">
              {startup.industry.map(ind => (
                <span key={ind} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                  {ind}
                </span>
              ))}
            </div>
            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              {startup.stage}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-700 text-center mb-4">{startup.pitch}</p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Stage</p>
            <p className="font-bold text-sm">{startup.stage}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Need</p>
            <p className="font-bold text-sm">{startup.fundingNeed}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Equity</p>
            <p className="font-bold text-sm">{startup.equity}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Users</p>
            <p className="font-bold text-sm">{startup.metrics.users}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Growth</p>
            <p className="font-bold text-sm text-green-600">{startup.metrics.growth}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">MRR</p>
            <p className="font-bold text-sm">{startup.metrics.mrr}</p>
          </div>
        </div>

        {/* Traction */}
        <div className="space-y-1 mb-4">
          {startup.traction.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">{item}</span>
            </div>
          ))}
        </div>

        {/* Founders */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2">
            {startup.founders?.map((founder: any, index: number) => (
              <Avatar
                key={index}
                src={founder.avatar}
                name={founder.name}
                size="sm"
                className="border-2 border-white"
              />
            ))}
          </div>
          <div className="text-xs text-gray-600">
            {(startup.founders?.length || 0) > 1 && `+${(startup.founders?.length || 0) - 1} more`}
          </div>
        </div>

        {/* Investor Activity */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {startup.investorActivity?.views || 0} views
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {startup.investorActivity?.interested || 0} interested
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Updated {startup.investorActivity?.lastUpdated || 'recently'}</p>
        </div>

        {/* Documents */}
        <div className="flex gap-2 mb-3">
          {startup.hasPitchDeck && (
            <div className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 rounded text-xs font-medium text-blue-700">
              <FileText className="w-3 h-3" />
              Pitch Deck
            </div>
          )}
          {startup.hasPitchVideo && (
            <div className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-50 rounded text-xs font-medium text-purple-700">
              <Video className="w-3 h-3" />
              Video
            </div>
          )}
        </div>

        {/* AI Insight */}
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={onToggleInsight}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span className="flex items-center gap-1">
              <Lightbulb className="w-4 h-4" style={{ color: brandColors.atomicOrange }} />
              AI Insights
            </span>
            {isInsightExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isInsightExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg"
            >
              {startup.aiInsight || 'AI analysis pending...'}
            </motion.div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 space-y-2">
        <button
          onClick={onViewProfile}
          className="w-full py-3 rounded-lg text-white font-bold transition-colors"
          style={{ backgroundColor: brandColors.electricBlue }}
        >
          View Full Profile
        </button>
        <button
          onClick={onToggleFollow}
          className={`w-full mb-2 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
            isFollowing ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow Founder</>}
        </button>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={onMessageFounder}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="Message Founder"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAddToPipeline(String(startup.id))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="Express Interest / Add to Pipeline"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onMessageFounder}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="Request Meeting"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSave}
            className="p-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
            title="Save"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// AI Search Modal
function AISearchModal({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [searching, setSearching] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const examplePrompts = [
    'Find SaaS founders in Mumbai who\'ve raised seed funding and are growing >30% MoM',
    'Show me FinTech startups with >50K users, looking for ₹2-5Cr, with technical founders',
    'Founders from IIT/IIM working on healthcare problems, pre-revenue, team of 2-3'
  ];

  const handleSearch = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setSearching(true);
    setAiResult(null);
    setSearchError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const isAndroid = window.location.hostname === '10.0.2.2' || window.location.href.includes('capacitor://');
      const fallback = isAndroid ? 'https://nextignition-l3b5.onrender.com/api' : 'https://nextignition-l3b5.onrender.com/api';
      const base = (import.meta as any).env?.VITE_API_URL || fallback;
      const res = await fetch(`${base}/ignition/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: `You are Ignisha, an AI assistant for the NextIgnition startup platform helping investors discover startups and founders. 
A user is searching for: "${trimmed}"

Based on this search query, provide:
1. What kind of startups/founders they should look for
2. Key criteria to evaluate matches
3. Suggested filters to narrow results (industry, stage, location)
4. 3-5 qualifying questions to ask potential matches

Keep your response concise and actionable.`,
          conversationHistory: []
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `API error ${res.status}`);
      }
      const data = await res.json();
      setAiResult(data.message || data.reply || data.response || 'AI response received.');
    } catch (e: any) {
      setSearchError(e.message || 'Failed to get AI response');
    } finally {
      setSearching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Find with Ignisha AI</h2>
              <p className="text-sm text-gray-600">Describe what you're looking for in natural language</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <textarea name="textarea-fa3cbe"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSearch(); }}
            placeholder="Example: Find technical founders from Bangalore working on AI/ML startups, looking for seed funding..."
            className="w-full h-28 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Press Ctrl+Enter to search</p>
        </div>

        {!aiResult && !searching && (
          <div className="mb-6">
            <p className="text-sm font-bold text-gray-700 mb-3">Quick Examples:</p>
            <div className="space-y-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(example)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {searching && (
          <div className="mb-6 flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Ignisha is analyzing your query...</p>
          </div>
        )}

        {searchError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {searchError}
          </div>
        )}

        {aiResult && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: brandColors.electricBlue }} />
              <span className="font-bold text-sm">Ignisha's Recommendations</span>
            </div>
            <div
              className="px-4 py-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
            >
              {aiResult}
            </div>
            <button
              onClick={() => { setAiResult(null); setPrompt(''); }}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Start a new search
            </button>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={searching || !prompt.trim()}
          className="w-full py-3 rounded-xl text-white font-bold transition-all hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
        >
          {searching ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Search with AI
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

// Advanced Search Modal
function AdvancedSearchModal({ searchMode, onClose }: { searchMode: SearchMode; onClose: () => void }) {
  const [filters, setFilters] = useState({
    location: '',
    remoteOk: false,
    stages: [] as string[],
    industries: [] as string[],
    fundingMin: '',
    fundingMax: '',
    fundingStages: [] as string[],
    usersMin: '',
    growthRate: '',
    aiScoreMin: 70,
    credentials: [] as string[],
    teamSize: '',
    revenue: '',
    dateRange: 'all'
  });

  const handleApplyFilters = () => {
    // Here you would apply the filters to your search results
    console.log('Applying filters:', filters);
    onClose();
  };

  const handleClearAll = () => {
    setFilters({
      location: '',
      remoteOk: false,
      stages: [],
      industries: [],
      fundingMin: '',
      fundingMax: '',
      fundingStages: [],
      usersMin: '',
      growthRate: '',
      aiScoreMin: 70,
      credentials: [],
      teamSize: '',
      revenue: '',
      dateRange: 'all'
    });
  };

  const toggleArrayFilter = (key: keyof typeof filters, value: string) => {
    const currentArray = filters[key] as string[];
    if (currentArray.includes(value)) {
      setFilters({ ...filters, [key]: currentArray.filter(item => item !== value) });
    } else {
      setFilters({ ...filters, [key]: [...currentArray, value] });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: brandColors.electricBlue }}
              >
                <SlidersHorizontal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Advanced Search</h2>
                <p className="text-sm text-gray-600">
                  {searchMode === 'founders' ? 'Find founders with specific criteria' :
                    searchMode === 'startups' ? 'Find startups with specific criteria' :
                      'Search both founders and startups'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <input name="input-3895da"
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="City or country (e.g., Mumbai, India)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input name="input-44d715"
                  type="checkbox"
                  checked={filters.remoteOk}
                  onChange={(e) => setFilters({ ...filters, remoteOk: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Remote OK</span>
              </label>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Active Within
              </label>
              <select name="select-b8a4b7"
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>

            {/* Stage (for startups) */}
            {searchMode !== 'founders' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Stage
                </label>
                <div className="space-y-2">
                  {['Idea', 'MVP', 'Growth', 'Scaling'].map(stage => (
                    <label key={stage} className="flex items-center gap-2 cursor-pointer">
                      <input name="input-a38c8b"
                        type="checkbox"
                        checked={filters.stages.includes(stage)}
                        onChange={() => toggleArrayFilter('stages', stage)}
                        className="rounded"
                      />
                      <span className="text-sm">{stage}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Industry */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Industry
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {['SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML', 'Enterprise Software', 'Consumer Apps'].map(industry => (
                  <label key={industry} className="flex items-center gap-2 cursor-pointer">
                    <input name="input-a8e295"
                      type="checkbox"
                      checked={filters.industries.includes(industry)}
                      onChange={() => toggleArrayFilter('industries', industry)}
                      className="rounded"
                    />
                    <span className="text-sm">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Funding Range */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Funding Need (₹)
              </label>
              <div className="flex gap-2 mb-3">
                <input name="input-975ac6"
                  type="text"
                  value={filters.fundingMin}
                  onChange={(e) => setFilters({ ...filters, fundingMin: e.target.value })}
                  placeholder="Min (e.g., 50L)"
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input name="input-3d2bad"
                  type="text"
                  value={filters.fundingMax}
                  onChange={(e) => setFilters({ ...filters, fundingMax: e.target.value })}
                  placeholder="Max (e.g., 5Cr)"
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                {['Bootstrapped', 'Pre-seed', 'Seed', 'Series A+'].map(stage => (
                  <label key={stage} className="flex items-center gap-2 cursor-pointer">
                    <input name="input-cbc0f3"
                      type="checkbox"
                      checked={filters.fundingStages.includes(stage)}
                      onChange={() => toggleArrayFilter('fundingStages', stage)}
                      className="rounded"
                    />
                    <span className="text-sm">{stage}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Traction Metrics */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Traction Metrics
              </label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Minimum Users</label>
                  <select name="select-e30298"
                    value={filters.usersMin}
                    onChange={(e) => setFilters({ ...filters, usersMin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any</option>
                    <option value="1000">1K+</option>
                    <option value="10000">10K+</option>
                    <option value="50000">50K+</option>
                    <option value="100000">100K+</option>
                    <option value="500000">500K+</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Growth Rate (MoM)</label>
                  <select name="select-643581"
                    value={filters.growthRate}
                    onChange={(e) => setFilters({ ...filters, growthRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any</option>
                    <option value="10">10%+</option>
                    <option value="20">20%+</option>
                    <option value="30">30%+</option>
                    <option value="50">50%+</option>
                    <option value="100">100%+</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Match Score */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Sparkles className="w-4 h-4 inline mr-2" />
                AI Match Score: {filters.aiScoreMin}%
              </label>
              <input name="input-1b4444"
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.aiScoreMin}
                onChange={(e) => setFilters({ ...filters, aiScoreMin: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            {/* Credentials (for founders) */}
            {searchMode !== 'startups' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <GraduationCap className="w-4 h-4 inline mr-2" />
                  Credentials
                </label>
                <div className="space-y-2">
                  {['IIT', 'IIM', 'YC Alumni', 'Ex-FAANG', 'Previous Exit', 'Serial Entrepreneur'].map(cred => (
                    <label key={cred} className="flex items-center gap-2 cursor-pointer">
                      <input name="input-393574"
                        type="checkbox"
                        checked={filters.credentials.includes(cred)}
                        onChange={() => toggleArrayFilter('credentials', cred)}
                        className="rounded"
                      />
                      <span className="text-sm">{cred}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Team Size (for startups) */}
            {searchMode !== 'founders' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Team Size
                </label>
                <select name="select-bd7c1f"
                  value={filters.teamSize}
                  onChange={(e) => setFilters({ ...filters, teamSize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  <option value="1-5">1-5 people</option>
                  <option value="6-10">6-10 people</option>
                  <option value="11-25">11-25 people</option>
                  <option value="26-50">26-50 people</option>
                  <option value="51+">51+ people</option>
                </select>
              </div>
            )}

            {/* Revenue (for startups) */}
            {searchMode !== 'founders' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Monthly Revenue
                </label>
                <select name="select-743829"
                  value={filters.revenue}
                  onChange={(e) => setFilters({ ...filters, revenue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  <option value="pre">Pre-revenue</option>
                  <option value="1-5">₹1-5L</option>
                  <option value="5-10">₹5-10L</option>
                  <option value="10-25">₹10-25L</option>
                  <option value="25-50">₹25-50L</option>
                  <option value="50+">₹50L+</option>
                </select>
              </div>
            )}
          </div>

          {/* Active Filters Summary */}
          {(filters.location || filters.industries.length > 0 || filters.stages.length > 0 || filters.credentials.length > 0 || filters.fundingStages.length > 0) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-bold text-gray-700 mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {filters.location && (
                  <span className="px-3 py-1 bg-white rounded-full text-xs font-medium flex items-center gap-1">
                    Location: {filters.location}
                    <button onClick={() => setFilters({ ...filters, location: '' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.industries.map(ind => (
                  <span key={ind} className="px-3 py-1 bg-white rounded-full text-xs font-medium flex items-center gap-1">
                    {ind}
                    <button onClick={() => toggleArrayFilter('industries', ind)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {filters.stages.map(stage => (
                  <span key={stage} className="px-3 py-1 bg-white rounded-full text-xs font-medium flex items-center gap-1">
                    {stage}
                    <button onClick={() => toggleArrayFilter('stages', stage)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {filters.credentials.map(cred => (
                  <span key={cred} className="px-3 py-1 bg-white rounded-full text-xs font-medium flex items-center gap-1">
                    {cred}
                    <button onClick={() => toggleArrayFilter('credentials', cred)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {filters.fundingStages.map(stage => (
                  <span key={stage} className="px-3 py-1 bg-white rounded-full text-xs font-medium flex items-center gap-1">
                    {stage}
                    <button onClick={() => toggleArrayFilter('fundingStages', stage)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-6 py-3 rounded-lg text-white font-bold transition-all hover:shadow-lg"
              style={{ backgroundColor: brandColors.electricBlue }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// AI Evaluation Panel
function AIEvaluationPanel({ profile, type, onClose }: { profile: any; type: 'founder' | 'startup'; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ml-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={type === 'founder' ? profile.avatar : profile.logo}
                name={profile.name}
                size="lg"
              />
              <div>
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <p className="text-sm text-gray-600">AI Evaluation Report</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Overall Score */}
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${profile.aiScore >= 80 ? 'bg-green-100 text-green-700' :
                profile.aiScore >= 60 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}
            >
              {profile.aiScore}
            </div>
            <p className="text-sm text-gray-600 mt-2">Overall AI Score</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score Breakdown */}
          <div>
            <h3 className="font-bold text-lg mb-4">Score Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: type === 'founder' ? 'Experience & Background' : 'Team Quality', score: 90 },
                { label: type === 'founder' ? 'Startup Viability' : 'Product-Market Fit', score: 85 },
                { label: type === 'founder' ? 'Execution Capability' : 'Traction & Growth', score: 88 },
                { label: 'Market Opportunity', score: 80 },
                { label: type === 'founder' ? 'Team Strength' : 'Competitive Position', score: 75 }
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm font-bold">{item.score}/100</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.score}%`,
                        backgroundColor: item.score >= 80 ? '#22c55e' : item.score >= 60 ? '#f59e0b' : '#6b7280'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Strengths
            </h3>
            <div className="space-y-2">
              {[
                'Strong technical background with proven execution',
                'Clear value proposition with market validation',
                'Impressive growth metrics and user engagement',
                'Well-positioned in growing market segment'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Areas of Concern */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Areas of Concern
            </h3>
            <div className="space-y-2">
              {[
                'Limited fundraising experience',
                'Customer concentration risk',
                'Competitive landscape intensifying'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
              Opportunities
            </h3>
            <div className="space-y-2">
              {[
                'Market timing excellent with regulatory tailwinds',
                'Potential synergy with existing portfolio companies',
                'Strong network effects as user base grows'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: brandColors.atomicOrange }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-bold text-lg mb-2">AI Recommendation</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold">Suggested Action:</span> Schedule introductory call within 1 week</p>
              <p><span className="font-bold">Investment Fit:</span> High (85% match with your thesis)</p>
              <p><span className="font-bold">Risk Level:</span> Moderate</p>
              <p><span className="font-bold">Timeline:</span> Strong candidate for immediate engagement</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
