import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Grid3x3,
  List,
  TrendingUp,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Video,
  Plus,
  Eye,
  CheckCircle,
  Star,
  Building,
  Zap,
  Target,
  MessageSquare
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import api from '../services/api';

interface Startup {
  id: string;
  founderId?: string;
  name: string;
  logo: string;
  tagline: string;
  industry: string[];
  stage: string;
  fundingAsk: string;
  equity: string;
  location: string;
  teamSize: string;
  traction: string;
  founded: string;
  verified: boolean;
  fundingTargetNum?: number;
  raisedNum?: number;
}

interface ApiStartup {
  _id: string;
  id?: string;
  founder?: { _id: string; id?: string; name?: string; avatar?: string; role?: string; isVerified?: boolean };
  name: string;
  description: string;
  industry: string;
  stage: string;
  location?: string;
  equity?: number;
  funding?: { target?: number; raised?: number; currency?: string };
  createdAt: string;
}

interface FilterGroup {
  title: string;
  key: string;
  expanded: boolean;
}

export function FundingPortalInvestor() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({
    industries: [],
    stages: [],
    locations: [],
    fundingRange: [500000, 10000000],
    equityRange: [5, 30],
  });
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);

  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
    { title: 'Industry', key: 'industry', expanded: true },
    { title: 'Stage', key: 'stage', expanded: true },
    { title: 'Location', key: 'location', expanded: false },
    { title: 'Funding Range', key: 'funding', expanded: false },
    { title: 'Equity Offered', key: 'equity', expanded: false },
    { title: 'Traction', key: 'traction', expanded: false },
  ]);

  const industries = ['SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML', 'Blockchain', 'CleanTech'];
  const stages = ['Idea', 'MVP', 'Growth', 'Scaling'];
  const locations = ['India', 'US', 'UK', 'Singapore', 'Global'];

  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeDealRoomStartupIds, setActiveDealRoomStartupIds] = useState<Set<string>>(new Set());

  const formatMoney = (value?: number, currency = 'USD') => {
    if (typeof value !== 'number') return '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
    } catch {
      return `${currency} ${Math.round(value)}`;
    }
  };

  const mapApiStartup = (s: ApiStartup): Startup => {
    const currency = s.funding?.currency || 'USD';
    const ask = typeof s.funding?.target === 'number' ? formatMoney(s.funding?.target, currency) : '';
    const equity = typeof s.equity === 'number' ? `${s.equity}%` : '';
    return {
      id: s._id,
      founderId: s.founder?._id,
      name: s.name,
      logo: '',
      tagline: s.description,
      industry: s.industry ? [s.industry] : [],
      stage: s.stage,
      fundingAsk: ask,
      equity,
      location: s.location || '',
      teamSize: '',
      traction: typeof s.funding?.raised === 'number' ? `Raised ${formatMoney(s.funding?.raised, currency)}` : '',
      founded: new Date(s.createdAt).getFullYear().toString(),
      verified: !!s.founder?.isVerified,
      fundingTargetNum: typeof s.funding?.target === 'number' ? s.funding.target : undefined,
      raisedNum: typeof s.funding?.raised === 'number' ? s.funding.raised : undefined,
    };
  };

  const fetchStartups = async () => {
    setLoading(true);
    setError('');
    try {
      const [startupsResp, bookmarksResp] = await Promise.all([
        api.get('/funding/startups'),
        api.get('/funding/bookmarks').catch(() => ({ data: [] })),
      ]);
      const mapped = (startupsResp.data as ApiStartup[]).map(mapApiStartup);
      setStartups(mapped);
      const ids = new Set<string>((bookmarksResp.data as string[]) || []);
      setBookmarkedIds(ids);
      // deal-room list not available — start with empty set
      setActiveDealRoomStartupIds(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load startups');
      setStartups([]);
      setBookmarkedIds(new Set());
      setActiveDealRoomStartupIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBookmark = async (startupId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(startupId)) next.delete(startupId);
      else next.add(startupId);
      return next;
    });
    try {
      const resp = await api.post(`/funding/startups/${startupId}/bookmark`);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (resp.data?.bookmarked) next.add(startupId);
        else next.delete(startupId);
        return next;
      });
    } catch {
      // best-effort
    }
  };

  const sendInterest = async (startup: any) => {
    try {
      if (startup.id) {
        await api.post(`/funding/startups/${startup.id}/interest`, {});
        setActiveDealRoomStartupIds(prev => new Set(prev).add(startup.id));
      }
      handleViewProfile(startup);
    } catch {
      // best-effort
    }
  };

  const handleViewDealRoom = (startupId: string) => {
    window.location.hash = `#deal-room?startup=${startupId}`;
  };

  const handleViewProfile = (startup: any) => {
    // Use founderId if available, otherwise fall back to the startup's own id
    const targetId = startup.founderId || startup.founder?._id || startup.founder?.id || startup.founder || startup.id;
    window.location.hash = `#profile/founder/${targetId}`;
  };

  const toggleFilterGroup = (key: string) => {
    setFilterGroups(prev =>
      prev.map(group =>
        group.key === key ? { ...group, expanded: !group.expanded } : group
      )
    );
  };

  const toggleIndustry = (industry: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter((i: string) => i !== industry)
        : [...prev.industries, industry],
    }));
  };

  const toggleStage = (stage: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      stages: prev.stages.includes(stage)
        ? prev.stages.filter((s: string) => s !== stage)
        : [...prev.stages, stage],
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      industries: [],
      stages: [],
      locations: [],
      fundingRange: [500000, 10000000],
      equityRange: [5, 30],
    });
  };

  const activeFilterCount =
    selectedFilters.industries.length +
    selectedFilters.stages.length +
    selectedFilters.locations.length;

  // Apply the search box, the industry/stage/location filters, and the sort —
  // previously all of these were collected but never used.
  const searchNeedle = searchTerm.trim().toLowerCase();
  const visibleStartups = startups
    .filter((s) => {
      if (searchNeedle) {
        const hay = [s.name, s.tagline, s.location, ...(s.industry || [])].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(searchNeedle)) return false;
      }
      if (selectedFilters.industries.length && !selectedFilters.industries.some((i: string) => s.industry.includes(i))) return false;
      if (selectedFilters.stages.length && !selectedFilters.stages.includes(s.stage)) return false;
      if (selectedFilters.locations.length && !selectedFilters.locations.includes(s.location)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return Number(b.founded) - Number(a.founded);
        case 'funding': return (b.fundingTargetNum ?? 0) - (a.fundingTargetNum ?? 0);
        case 'traction': return (b.raisedNum ?? 0) - (a.raisedNum ?? 0);
        default: return 0; // relevance — keep API order
      }
    });

  // Swipe gesture for mobile
  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
    const current = visibleStartups[currentSwipeIndex];
    if (!current) return;
    if (direction === 'right') {
      // Interested
      void sendInterest(current);
    }
    if (currentSwipeIndex < visibleStartups.length - 1) {
      setCurrentSwipeIndex(currentSwipeIndex + 1);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Filter Sidebar */}
      <aside className="hidden lg:block w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Filters</h2>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm font-medium hover:underline"
                style={{ color: brandColors.navyBlue }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {selectedFilters.industries.map((industry: string) => (
                  <span
                    key={industry}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                  >
                    {industry}
                    <button onClick={() => toggleIndustry(industry)} className="hover:bg-blue-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedFilters.stages.map((stage: string) => (
                  <span
                    key={stage}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"
                  >
                    {stage}
                    <button onClick={() => toggleStage(stage)} className="hover:bg-green-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search within results */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input name="input-c3f78b"
                type="text"
                placeholder="Search startups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Groups */}
          <div className="space-y-4">
            {/* Industry Filter */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFilterGroup('industry')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold">Industry</span>
                {filterGroups.find(g => g.key === 'industry')?.expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {filterGroups.find(g => g.key === 'industry')?.expanded && (
                <div className="p-4 pt-0 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {industries.map(industry => (
                      <button
                        key={industry}
                        onClick={() => toggleIndustry(industry)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedFilters.industries.includes(industry)
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        style={
                          selectedFilters.industries.includes(industry)
                            ? { backgroundColor: brandColors.electricBlue }
                            : {}
                        }
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stage Filter */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFilterGroup('stage')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold">Stage</span>
                {filterGroups.find(g => g.key === 'stage')?.expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {filterGroups.find(g => g.key === 'stage')?.expanded && (
                <div className="p-4 pt-0 space-y-2">
                  {stages.map(stage => (
                    <label key={stage} className="flex items-center gap-3 cursor-pointer group">
                      <input name="input-ff671a"
                        type="checkbox"
                        checked={selectedFilters.stages.includes(stage)}
                        onChange={() => toggleStage(stage)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {stage}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Location Filter */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFilterGroup('location')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold">Location</span>
                {filterGroups.find(g => g.key === 'location')?.expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {filterGroups.find(g => g.key === 'location')?.expanded && (
                <div className="p-4 pt-0">
                  <select name="select-d194a0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Locations</option>
                    {locations.map(location => (
                      <option key={location}>{location}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Funding Range */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFilterGroup('funding')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold">Funding Range</span>
                {filterGroups.find(g => g.key === 'funding')?.expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {filterGroups.find(g => g.key === 'funding')?.expanded && (
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>₹5L</span>
                    <span>₹10Cr</span>
                  </div>
                  <input name="input-e213e1"
                    type="range"
                    min="500000"
                    max="100000000"
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Equity Offered */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFilterGroup('equity')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold">Equity Offered</span>
                {filterGroups.find(g => g.key === 'equity')?.expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {filterGroups.find(g => g.key === 'equity')?.expanded && (
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>5%</span>
                    <span>30%</span>
                  </div>
                  <input name="input-82cc4c"
                    type="range"
                    min="5"
                    max="30"
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4">
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
          </div>
        )}
        {loading && (
          <div className="p-4">
            <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-sm">Loading startups...</div>
          </div>
        )}
        {/* Top Bar - Desktop */}
        <div className="hidden lg:block sticky top-0 bg-white border-b border-gray-200 z-20">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Discover Startups</h1>
              <div className="flex items-center gap-3">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select name="select-2d63be"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="funding">Funding Amount</option>
                    <option value="traction">Traction</option>
                  </select>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                      }`}
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                      }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{visibleStartups.length} startups</span>
              <span>match your criteria</span>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 bg-white border-b border-gray-200 z-20 px-4 py-3">
          <h1 className="text-xl font-bold mb-2">Discover Startups</h1>
          <div className="text-sm text-gray-600">
            {visibleStartups.length} startups available
          </div>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden lg:block p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleStartups.map((startup, index) => (
              <motion.div
                key={startup.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                className="group bg-white rounded-2xl p-6 border border-gray-200 cursor-pointer relative"
              >
                {/* Card Content */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                  >
                    {startup.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold truncate">{startup.name}</h3>
                      {startup.verified && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {startup.tagline}
                    </p>
                  </div>
                </div>

                {/* Industry Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {startup.industry.slice(0, 3).map((ind, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs font-medium rounded"
                      style={{ backgroundColor: brandColors.electricBlue + '20', color: brandColors.electricBlue }}
                    >
                      {ind}
                    </span>
                  ))}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Stage</div>
                    <div className="text-sm font-bold">{startup.stage}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Seeking</div>
                    <div className="text-sm font-bold text-green-600">{startup.fundingAsk || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Equity</div>
                    <div className="text-sm font-bold">{startup.equity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Traction</div>
                    <div className="text-sm font-bold">{startup.traction || '—'}</div>
                  </div>
                </div>

                {/* Team & Location */}
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{startup.teamSize ? `${startup.teamSize} members` : 'Team N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{startup.location}</span>
                  </div>
                </div>

                {/* View/Action Button */}
                {activeDealRoomStartupIds.has(startup.id) ? (
                  <button
                    onClick={() => handleViewDealRoom(startup.id)}
                    className="w-full py-2.5 rounded-lg font-bold text-white transition-all bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Enter Deal Room
                  </button>
                ) : null}

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleViewProfile(startup); }}
                    className="flex-1 py-2.5 rounded-lg font-bold text-white text-sm transition-all active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void toggleBookmark(startup.id); }}
                    title={bookmarkedIds.has(startup.id) ? 'Bookmarked' : 'Bookmark'}
                    className={`p-2.5 rounded-lg border-2 transition-all active:scale-95 ${bookmarkedIds.has(startup.id)
                        ? 'border-orange-400 bg-orange-50 text-orange-500'
                        : 'border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-400'
                      }`}
                  >
                    <Bookmark className="w-4 h-4" fill={bookmarkedIds.has(startup.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* Mobile Tinder-Style Swipe */}
        <div className="lg:hidden relative h-[calc(100vh-200px)] overflow-hidden">
          <AnimatePresence>
            {currentSwipeIndex < visibleStartups.length && (
              <SwipeCard
                key={visibleStartups[currentSwipeIndex].id}
                startup={visibleStartups[currentSwipeIndex]}
                onSwipe={handleSwipe}
              />
            )}
          </AnimatePresence>

          {currentSwipeIndex >= visibleStartups.length && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">All Caught Up!</h3>
                <p className="text-gray-600 mb-6">
                  You've reviewed all available startups.
                </p>
                <button
                  onClick={() => setCurrentSwipeIndex(0)}
                  className="px-6 py-3 rounded-lg font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  Review Again
                </button>
              </div>
            </div>
          )}

          {/* Mobile Action Buttons */}
          {currentSwipeIndex < startups.length && (
            <div className="absolute bottom-4 left-0 right-0 px-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <ThumbsDown className="w-8 h-8 text-red-500" />
                </button>
                <button
                  onClick={() => handleSwipe('up')}
                  className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-white transition-colors"
                  style={{ backgroundColor: brandColors.electricBlue }}
                >
                  <Eye className="w-8 h-8" />
                </button>
                <button
                  onClick={() => handleSwipe('right')}
                  className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-green-50 transition-colors"
                >
                  <ThumbsUp className="w-8 h-8 text-green-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Filter Button */}
      <button
        onClick={() => setShowFilters(true)}
        className="lg:hidden fixed bottom-44 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white z-40"
        style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
      >
        <Filter className="w-6 h-6" />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="font-bold text-lg">Filters</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                {/* Same filter content as desktop sidebar */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold mb-3">Industry</h4>
                    <div className="flex flex-wrap gap-2">
                      {industries.map(industry => (
                        <button
                          key={industry}
                          onClick={() => toggleIndustry(industry)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedFilters.industries.includes(industry)
                              ? 'text-white'
                              : 'bg-gray-100 text-gray-700'
                            }`}
                          style={
                            selectedFilters.industries.includes(industry)
                              ? { backgroundColor: brandColors.electricBlue }
                              : {}
                          }
                        >
                          {industry}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-3">Stage</h4>
                    <div className="space-y-2">
                      {stages.map(stage => (
                        <label key={stage} className="flex items-center gap-3">
                          <input name="input-262059"
                            type="checkbox"
                            checked={selectedFilters.stages.includes(stage)}
                            onChange={() => toggleStage(stage)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{stage}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={clearFilters}
                    className="flex-1 py-3 border border-gray-300 rounded-lg font-medium"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 py-3 rounded-lg font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Swipe Card Component for Mobile
function SwipeCard({ startup, onSwipe }: { startup: Startup; onSwipe: (direction: 'left' | 'right' | 'up') => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      style={{ x, y, rotate, opacity }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) {
          onSwipe(info.offset.x > 0 ? 'right' : 'left');
        } else if (info.offset.y < -100) {
          onSwipe('up');
        }
      }}
      className="absolute inset-4 bg-white rounded-3xl shadow-2xl p-8 cursor-grab active:cursor-grabbing"
    >
      <div className="flex flex-col h-full">
        {/* Logo & Name */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
          >
            {startup.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">{startup.name}</h2>
              {startup.verified && <CheckCircle className="w-5 h-5 text-blue-500" />}
            </div>
            <p className="text-gray-600">{startup.tagline}</p>
          </div>
        </div>

        {/* Industry Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {startup.industry.map((ind, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 text-sm font-medium rounded-lg"
              style={{ backgroundColor: brandColors.electricBlue + '20', color: brandColors.electricBlue }}
            >
              {ind}
            </span>
          ))}
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 mb-1">Stage</div>
            <div className="font-bold">{startup.stage}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 mb-1">Seeking</div>
            <div className="font-bold text-green-600">{startup.fundingAsk || '—'}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 mb-1">Equity</div>
            <div className="font-bold">{startup.equity}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 mb-1">Traction</div>
            <div className="font-bold">{startup.traction || '—'}</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{startup.teamSize ? `${startup.teamSize} members` : 'Team N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{startup.location}</span>
          </div>
        </div>

        {/* Swipe Indicators */}
        <motion.div
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
          className="absolute top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-xl rotate-12"
        >
          INTERESTED
        </motion.div>
        <motion.div
          style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
          className="absolute top-8 left-8 bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-xl -rotate-12"
        >
          PASS
        </motion.div>
      </div>
    </motion.div>
  );
}
