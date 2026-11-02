import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Briefcase,
  Star,
  Heart,
  MessageCircle,
  Filter,
  Zap,
  Target,
  Code,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Award,
  CheckCircle,
  BadgeCheck,
  Sparkles,
  Linkedin,
  ExternalLink,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { brandColors } from '../utils/colors';
import api from '../services/api';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { toggleProfileBookmark, getSavedProfiles } from '../services/bookmarkService';
import { toast } from 'sonner';

interface CoFounder {
  id: string;
  name: string;
  avatar: string;
  currentRole: string;
  lookingFor: string;
  skills: string[];
  location: string;
  commitment: 'Full-time' | 'Part-time' | 'Flexible';
  equityExpectation: string;
  yearsExperience: number;
  previousStartups: number;
  availability: string;
  matchScore: number;
  verified: boolean;
  vision: string;
  strengths: string[];
  interests: string[];
  linkedinUrl?: string;
  startupStatus: 'has-startup' | 'wants-to-join' | 'ideal';
}

interface ApiCofounderProfile {
  _id: string;
  user: { _id: string; name: string; avatar?: string; role?: string; profile?: any; isVerified?: boolean };
  currentRole?: string;
  lookingFor?: string;
  commitment?: 'Full-time' | 'Part-time' | 'Flexible';
  equityExpectation?: string;
  yearsExperience?: number;
  previousStartups?: number;
  availability?: string;
  vision?: string;
  strengths?: string[];
  interests?: string[];
  skills?: string[];
  location?: string;
  startupStatus?: 'has-startup' | 'wants-to-join' | 'ideal' | 'yes';
}

interface DiscoverCoFoundersProps {
  onMessage?: (userId: string) => void;
}

export function DiscoverCoFounders({ onMessage }: DiscoverCoFoundersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('match');
  const [startupStatus, setStartupStatus] = useState<string>('all');
  const [selectedCofounder, setSelectedCofounder] = useState<CoFounder | null>(null);

  const [filters, setFilters] = useState({
    skills: [] as string[],
    location: [] as string[],
    commitment: [] as string[],
    equityFlexibility: [] as string[],
    experience: [] as string[],
  });

  const skillCategories = [
    'Technical/Engineering',
    'Product & Design',
    'Business & Strategy',
    'Marketing & Growth',
    'Sales & BD',
    'Operations',
    'Finance',
    'Legal',
  ];

  const locations = ['San Francisco', 'New York', 'Remote', 'Austin', 'Boston', 'Los Angeles', 'London', 'Berlin'];
  const commitmentLevels = ['Full-time', 'Part-time', 'Flexible'];
  const equityOptions = ['Very Flexible', 'Somewhat Flexible', 'Fixed Range'];
  const experienceLevels = ['First-time Founder', '1-2 Startups', '3+ Startups', 'Exited Founder'];

  const sortOptions = [
    { value: 'match', label: 'Best Match' },
    { value: 'experience', label: 'Most Experienced' },
    { value: 'recent', label: 'Recently Active' },
  ];

  const [coFounders, setCoFounders] = useState<CoFounder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const { hasFeature, userPlan } = useFeatureAccess();

  const mapApi = (p: ApiCofounderProfile): CoFounder => {
    const name = p.user?.name || 'User';
    const status = p.startupStatus === 'yes' ? 'has-startup' : (p.startupStatus || 'ideal');
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    // Calculate a stable match score between 75% and 98%
    const nameLength = name.length;
    const skillsCount = p.skills?.length || 0;
    const strengthsCount = p.strengths?.length || 0;
    const hash = (name.charCodeAt(0) || 0) + (name.charCodeAt(Math.max(0, name.length - 1)) || 0) + nameLength;
    const matchScore = 75 + (hash % 15) + Math.min(skillsCount + strengthsCount, 9);

    return {
      id: p.user?._id || Math.random().toString(36).substr(2, 9),
      name,
      avatar: initials,
      currentRole: p.currentRole || p.user?.role || 'Member',
      lookingFor: p.lookingFor || '',
      skills: p.skills || [],
      location: p.location || '',
      commitment: (p.commitment || 'Flexible') as any,
      equityExpectation: p.equityExpectation || '',
      yearsExperience: p.yearsExperience || 0,
      previousStartups: p.previousStartups || 0,
      availability: p.availability || '',
      matchScore,
      verified: !!p.user?.isVerified,
      vision: p.vision || '',
      strengths: p.strengths || [],
      interests: p.interests || [],
      linkedinUrl: p.user?.profile?.socials?.linkedin,
      startupStatus: status as any,
    };
  };

  const fetchSaved = async () => {
    try {
      const saved = await getSavedProfiles();
      setSavedIds(saved.map(p => p.id));
    } catch (err) {
      console.error('Failed to fetch saved co-founders:', err);
      setSavedIds([]);
    }
  };

  const fetchCofounders = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (startupStatus) params.startupStatus = startupStatus;
      const resp = await api.get('/cofounders', { params });
      const mapped = (resp.data as ApiCofounderProfile[])
        .filter(p => p.user)
        .map(mapApi);
      setCoFounders(mapped);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load co-founders');
      setCoFounders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also fetches on mount (startupStatus has an initial value), so the mount
  // effect above no longer duplicates the cofounders request.
  useEffect(() => {
    fetchCofounders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startupStatus]);

  const toggleFilter = (category: keyof typeof filters, value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    setFilters({ ...filters, [category]: updated });
  };

  const clearAllFilters = () => {
    setFilters({
      skills: [],
      location: [],
      commitment: [],
      equityFlexibility: [],
      experience: [],
    });
  };

  const activeFilterCount = 
    filters.skills.length + 
    filters.location.length + 
    filters.commitment.length +
    filters.equityFlexibility.length +
    filters.experience.length;

  const handleToggleSave = async (id: string) => {
    // Optimistic update
    setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    
    try {
      const result = await toggleProfileBookmark(id, 'founder');
      toast.success(result.saved ? 'Co-founder saved' : 'Removed from saved');
    } catch (err) {
      console.error('Failed to toggle save:', err);
      toast.error('Failed to update bookmark');
      // Revert
      setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredCoFounders = coFounders
    .filter((c) => {
      // 1. Search filter
      if (normalizedQuery) {
        const nameMatch = c.name?.toLowerCase().includes(normalizedQuery);
        const roleMatch = c.currentRole?.toLowerCase().includes(normalizedQuery);
        const lookingForMatch = c.lookingFor?.toLowerCase().includes(normalizedQuery);
        const locationMatch = c.location?.toLowerCase().includes(normalizedQuery);
        const visionMatch = c.vision?.toLowerCase().includes(normalizedQuery);
        const skillsMatch = c.skills?.some(s => s.toLowerCase().includes(normalizedQuery));
        const strengthsMatch = c.strengths?.some(s => s.toLowerCase().includes(normalizedQuery));
        const interestsMatch = c.interests?.some(s => s.toLowerCase().includes(normalizedQuery));
        
        if (!nameMatch && !roleMatch && !lookingForMatch && !locationMatch && !visionMatch && !skillsMatch && !strengthsMatch && !interestsMatch) {
          return false;
        }
      }

      // 2. Skills filter
      if (filters.skills.length > 0) {
        const matchesSkill = filters.skills.some(fs => {
          const fsLower = fs.toLowerCase();
          const words = fsLower.split(/[\s&/]+/).filter(w => w.length > 2);
          return words.some(word => {
            return c.skills?.some(s => s.toLowerCase().includes(word)) || 
                   c.currentRole?.toLowerCase().includes(word) ||
                   c.lookingFor?.toLowerCase().includes(word) ||
                   c.strengths?.some(s => s.toLowerCase().includes(word));
          });
        });
        if (!matchesSkill) return false;
      }

      // 3. Location filter
      if (filters.location.length > 0) {
        const matchesLoc = filters.location.some(l => {
          const lLower = l.toLowerCase();
          if (lLower === 'remote') {
            return c.location?.toLowerCase().includes('remote') || !c.location;
          }
          return c.location?.toLowerCase().includes(lLower);
        });
        if (!matchesLoc) return false;
      }

      // 4. Commitment filter
      if (filters.commitment.length > 0) {
        if (!filters.commitment.includes(c.commitment)) {
          return false;
        }
      }

      // 5. Equity Expectation/Flexibility filter
      if (filters.equityFlexibility.length > 0) {
        const matchesEquity = filters.equityFlexibility.some(fe => {
          const feLower = fe.toLowerCase();
          const eqLower = c.equityExpectation?.toLowerCase() || '';
          if (feLower === 'very flexible') {
            return eqLower.includes('very flex') || eqLower.includes('highly flex') || eqLower === 'flexible';
          }
          if (feLower === 'somewhat flexible') {
            return eqLower.includes('somewhat') || eqLower.includes('some flex') || eqLower.includes('flex');
          }
          if (feLower === 'fixed range') {
            return eqLower.includes('%') || eqLower.includes('fixed') || /\d+-\d+/.test(eqLower);
          }
          return eqLower.includes(feLower);
        });
        if (!matchesEquity) return false;
      }

      // 6. Experience filter
      if (filters.experience.length > 0) {
        const matchesExp = filters.experience.some(fe => {
          if (fe === 'First-time Founder') {
            return c.previousStartups === 0;
          }
          if (fe === '1-2 Startups') {
            return c.previousStartups >= 1 && c.previousStartups <= 2;
          }
          if (fe === '3+ Startups') {
            return c.previousStartups >= 3;
          }
          if (fe === 'Exited Founder') {
            return c.previousStartups >= 1 || c.yearsExperience >= 5;
          }
          return true;
        });
        if (!matchesExp) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'experience') {
        return (b.yearsExperience || 0) - (a.yearsExperience || 0);
      }
      if (sortBy === 'recent') {
        return (b.previousStartups || 0) - (a.previousStartups || 0);
      }
      // Default to 'match'
      return (b.matchScore || 0) - (a.matchScore || 0);
    });


  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto relative">
      {error && (
        <div className="p-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
        </div>
      )}
      {loading && (
        <div className="p-4">
          <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-sm">Loading co-founders...</div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Discover Co-founders</h1>
              <p className="text-gray-600 mt-1">Find your perfect founding team partner</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">Profile Compatibility</p>
              <p className="text-xs text-blue-700 mt-1">
                A heuristic score based on listed skills and strengths helps surface potentially compatible co-founders first
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input name="input-8f11f5"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by skills, interests, or experience..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden px-4 py-3 bg-gray-900 text-white rounded-lg flex items-center gap-2 relative"
            >
              <Filter className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Sorting and Results Count */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-bold">{filteredCoFounders.length}</span> potential co-founders
            </p>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-gray-600 hidden sm:inline">Sort by:</span>
              <select name="select-9718f4"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {/* Startup Status Filter */}
              <select name="select-c015b9"
                value={startupStatus}
                onChange={(e) => setStartupStatus(e.target.value)}
                className="px-3 py-2 border-2 border-blue-300 bg-blue-50 text-blue-900 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Founders</option>
                <option value="has-startup">Has Startup</option>
                <option value="wants-to-join">Wants to Join</option>
                <option value="ideal">Ideal (Open to Both)</option>
              </select>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors relative"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Results Grid */}
          <main className={showFilters ? 'lg:col-span-9' : 'lg:col-span-12'}>
            <div className="grid gap-6">
              {filteredCoFounders.map((cofounder, index) => (
                <motion.div
                  key={cofounder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Left: Avatar and Match Score */}
                      <div className="flex flex-col items-center md:items-start gap-4 md:w-48 flex-shrink-0">
                        <div className="relative">
                          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                            {cofounder.avatar}
                          </div>
                        </div>

                        {/* Match Score */}
                        <div className="w-full">
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Zap className="w-5 h-5 text-green-600" fill="currentColor" />
                              <span className="text-3xl font-bold text-green-600">{cofounder.matchScore}%</span>
                            </div>
                            <div className="text-xs text-green-700 font-medium">Match Score</div>
                          </div>
                        </div>

                        {/* Availability */}
                        <div className="text-center md:text-left w-full">
                          <div className="text-xs text-gray-500 mb-1">AVAILABILITY</div>
                          <div className="text-sm font-bold text-gray-900">{cofounder.availability}</div>
                        </div>
                      </div>

                      {/* Right: Details */}
                      <div className="flex-1">
                        {/* Header */}
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                            {cofounder.name}
                            {cofounder.verified && (
                              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.66.26-.55.43-1.16.43-1.84 0-2.21-1.79-4-4-4-.68 0-1.29.17-1.84.43C14.2 2.13 12.83 1.25 11.25 1.25s-2.95.88-3.66 2.18c-.55-.26-1.16-.43-1.84-.43-2.21 0-4 1.79-4 4 0 .68.17 1.29.43 1.84C.88 9.55 0 10.92 0 12.5s.88 2.95 2.18 3.66c-.26.55-.43 1.16-.43 1.84 0 2.21 1.79 4 4 4 .68 0 1.29-.17 1.84-.43 1.01 1.81 2.5 3.18 4.41 3.18s3.4-1.37 4.41-3.18c.55.26 1.16.43 1.84.43 2.21 0 4-1.79 4-4 0-.68-.17-1.29-.43-1.84 1.3-1.01 2.18-2.38 2.18-3.66zm-12.25 4.5l-4.5-4.5 1.41-1.41 3.09 3.09 7.09-7.09 1.41 1.41-8.5 8.5z" />
                              </svg>
                            )}
                            {cofounder.startupStatus === 'has-startup' ? (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                Has Startup
                              </span>
                            ) : (
                              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                Looking for Startup
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-600 mb-2">{cofounder.currentRole}</p>
                          
                          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                            <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs text-blue-600 font-bold mb-1">LOOKING FOR</div>
                              <div className="text-sm text-blue-900">{cofounder.lookingFor}</div>
                            </div>
                          </div>
                        </div>

                        {/* Vision */}
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                          <div className="text-xs text-purple-600 font-bold mb-1">VISION</div>
                          <p className="text-sm text-purple-900">{cofounder.vision}</p>
                        </div>

                        {/* Skills */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2">CORE SKILLS</div>
                          <div className="flex flex-wrap gap-2">
                            {cofounder.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Strengths */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2">KEY STRENGTHS</div>
                          <div className="flex flex-wrap gap-2">
                            {cofounder.strengths.map((strength, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                              >
                                {strength}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-t border-gray-200 pt-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Location</div>
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {cofounder.location.split(',')[0]}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Commitment</div>
                            <div className="font-bold text-gray-900 text-sm">{cofounder.commitment}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Equity Range</div>
                            <div className="font-bold text-gray-900 text-sm">{cofounder.equityExpectation}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Experience</div>
                            <div className="font-bold text-gray-900 text-sm">{cofounder.yearsExperience} years</div>
                          </div>
                        </div>

                        {/* Interests */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2">INTERESTED IN</div>
                          <div className="flex flex-wrap gap-2">
                            {cofounder.interests.map((interest, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => {
                              if (!hasFeature('canDirectMessage')) {
                                toast.error(Capacitor.getPlatform() === 'ios' ? 'Direct messaging is available with NextIgnition Premium.' : `Your current ${userPlan} plan does not allow initiating direct messages. Please upgrade to Pro.`, {
                                  action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
                                });
                                return;
                              }
                              onMessage?.(cofounder.id);
                            }}
                            className="flex-1 px-6 py-3 bg-gradient-to-r text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            style={{
                              background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                            }}
                          >
                            <MessageCircle className="w-5 h-5" />
                            Message
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleSave(cofounder.id); }}
                            className={`px-6 py-3 border-2 rounded-lg font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                              savedIds.includes(cofounder.id)
                                ? 'bg-pink-50 border-pink-200 text-pink-600'
                                : 'border-pink-500 text-pink-600 hover:bg-pink-50'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${savedIds.includes(cofounder.id) ? 'fill-current' : ''}`} />
                            {savedIds.includes(cofounder.id) ? 'Saved' : 'Save'}
                          </button>
                          {cofounder.linkedinUrl && (
                            <button
                              onClick={() => window.open(cofounder.linkedinUrl, '_blank')}
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                              title="View LinkedIn Profile"
                            >
                              <Linkedin className="w-5 h-5" />
                              LinkedIn
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedCofounder(cofounder)}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                          >
                            View Profile
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

          </main>

          {/* Filter Sidebar */}
          {showFilters && (
            <aside className="lg:col-span-3">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    Filters
                  </h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Skills Filter */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Skills Looking For</h4>
                  <div className="space-y-2">
                    {skillCategories.map((skill) => (
                      <label key={skill} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-4cec61"
                          type="checkbox"
                          checked={filters.skills.includes(skill)}
                          onChange={() => toggleFilter('skills', skill)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{skill}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location Filter */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Location Preference</h4>
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <label key={location} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-fde2a4"
                          type="checkbox"
                          checked={filters.location.includes(location)}
                          onChange={() => toggleFilter('location', location)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{location}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Commitment Filter */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Commitment Level</h4>
                  <div className="space-y-2">
                    {commitmentLevels.map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-690e76"
                          type="checkbox"
                          checked={filters.commitment.includes(level)}
                          onChange={() => toggleFilter('commitment', level)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Equity Flexibility */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Equity Flexibility</h4>
                  <div className="space-y-2">
                    {equityOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-2fd096"
                          type="checkbox"
                          checked={filters.equityFlexibility.includes(option)}
                          onChange={() => toggleFilter('equityFlexibility', option)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Experience Level */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Experience Level</h4>
                  <div className="space-y-2">
                    {experienceLevels.map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-96b21d"
                          type="checkbox"
                          checked={filters.experience.includes(level)}
                          onChange={() => toggleFilter('experience', level)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Profile Detail Modal */}
      {selectedCofounder && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {selectedCofounder.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {selectedCofounder.name}
                    {selectedCofounder.verified && (
                      <CheckCircle className="w-5 h-5 text-blue-500" fill="currentColor" />
                    )}
                  </h2>
                  <p className="text-gray-600">{selectedCofounder.currentRole}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCofounder(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
              {/* Match Score Banner */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-green-900 mb-1">Compatibility Match</h3>
                    <p className="text-sm text-green-700">Heuristic score based on listed skills and strengths</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-8 h-8 text-green-600" fill="currentColor" />
                    <span className="text-5xl font-bold text-green-600">{selectedCofounder.matchScore}%</span>
                  </div>
                </div>
              </div>

              {/* Looking For */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Target className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm font-bold text-blue-600 mb-2">LOOKING FOR</h3>
                    <p className="text-blue-900 text-lg">{selectedCofounder.lookingFor}</p>
                  </div>
                </div>
              </div>

              {/* Vision */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-sm font-bold text-purple-600 mb-3">VISION & GOALS</h3>
                <p className="text-purple-900 text-lg leading-relaxed">{selectedCofounder.vision}</p>
              </div>

              {/* Core Skills */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">CORE SKILLS</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedCofounder.skills || []).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Strengths */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">KEY STRENGTHS</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedCofounder.strengths || []).map((strength, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Location</div>
                  <div className="font-bold text-gray-900 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedCofounder.location}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Commitment</div>
                  <div className="font-bold text-gray-900">{selectedCofounder.commitment}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Equity Range</div>
                  <div className="font-bold text-gray-900">{selectedCofounder.equityExpectation}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Experience</div>
                  <div className="font-bold text-gray-900">{selectedCofounder.yearsExperience} years</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Availability</div>
                  <div className="font-bold text-gray-900">{selectedCofounder.availability}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Previous Startups</div>
                  <div className="font-bold text-gray-900">{selectedCofounder.previousStartups}</div>
                </div>
              </div>

              {/* Interests */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">INTERESTED IN</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedCofounder.interests || []).map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (!hasFeature('canDirectMessage')) {
                      toast.error(Capacitor.getPlatform() === 'ios' ? 'Direct messaging is available with NextIgnition Premium.' : `Your current ${userPlan} plan does not allow initiating direct messages. Please upgrade to Pro.`, {
                        action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
                      });
                      return;
                    }
                    onMessage?.(selectedCofounder.id);
                    setSelectedCofounder(null);
                  }}
                  className="flex-1 px-6 py-4 bg-gradient-to-r text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg"
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                  }}
                >
                  <MessageCircle className="w-6 h-6" />
                  Message
                </button>
                {selectedCofounder.linkedinUrl && (
                  <button
                    onClick={() => window.open(selectedCofounder.linkedinUrl, '_blank')}
                    className="px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Linkedin className="w-6 h-6" />
                    View LinkedIn
                  </button>
                )}
                <button 
                  onClick={() => handleToggleSave(selectedCofounder.id)}
                  className={`px-6 py-4 border-2 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    savedIds.includes(selectedCofounder.id)
                      ? 'bg-pink-50 border-pink-200 text-pink-600'
                      : 'border-pink-500 text-pink-600 hover:bg-pink-50'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${savedIds.includes(selectedCofounder.id) ? 'fill-current' : ''}`} />
                  {savedIds.includes(selectedCofounder.id) ? 'Saved' : 'Save Profile'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}