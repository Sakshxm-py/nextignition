import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Star,
  Calendar,
  DollarSign,
  Award,
  CheckCircle,
  BadgeCheck,
  Clock,
  Video,
  MessageCircle,
  Filter,
  Zap,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  Briefcase,
  Bookmark,
  X
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { ProfileViewModal } from './ProfileViewModal';
import { BookingModal } from './BookingModal';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { toggleProfileBookmark, getSavedProfiles } from '../services/bookmarkService';
import { toast } from 'sonner';

interface Expert {
  id: string;
  name: string;
  avatar: string;
  title: string;
  specialization: string[];
  rating: number;
  totalReviews: number;
  hourlyRate: string;
  yearsExperience: number;
  sessionsCompleted: number;
  responseTime: string;
  availability: 'Available' | 'Limited' | 'Booked';
  featured: boolean;
  verified: boolean;
  expertise: string;
  topSkills: string[];
}

import { useEffect, useState } from 'react';
import api from '../services/api';

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function getInitials(name?: string) {
  const n = String(name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) || '';
  return `${first}${second}`.toUpperCase();
}

interface DiscoverExpertsProps {
  onMessage?: (userId: string) => void;
}

export function DiscoverExperts({ onMessage }: DiscoverExpertsProps) {
  const PAGE_SIZE = 6;
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<any>(null);
  const { hasFeature, userPlan } = useFeatureAccess();

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const response = await api.get('/auth/users?role=expert');
        // Map backend users to Expert interface
        const realExperts = response.data.map((u: any, idx: number) => ({
          id: String(u._id || u.id || u.email || `${u.name || 'expert'}-${idx}`),
          name: u.name,
          avatar: u.avatar || u.name?.charAt(0) || 'E',
          title: u.profile?.title || 'Expert Mentor',
          specialization: u.profile?.expertise ? [u.profile.expertise] : [],
          rating: 4.8, // Default
          totalReviews: 0,
          hourlyRate: u.profile?.hourlyRate ? `₹${u.profile.hourlyRate}` : 'Free',
          // experience may come back as a string ("10+ years") or a number; coerce
          // to a number so it renders ("10 years") and sorts correctly.
          yearsExperience: typeof u.profile?.experience === 'number'
            ? u.profile.experience
            : parseInt(String(u.profile?.experience ?? ''), 10) || 0,
          sessionsCompleted: 0,
          responseTime: '<24 hrs',
          availability: 'Available',
          featured: false,
          verified: !!u.isVerified,
          expertise: u.profile?.bio || 'Professional expert on NextIgnition',
          topSkills: u.profile?.skills || [],
        }));

        setExperts(realExperts);
        setVisibleCount(PAGE_SIZE);
      } catch (error) {
        console.error('Failed to fetch experts', error);
        setExperts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();

    const fetchSaved = async () => {
      try {
        const saved = await getSavedProfiles();
        setSavedIds(saved.map(p => p.id));
      } catch (err) {
        console.error('Failed to fetch saved experts:', err);
      }
    };
    fetchSaved();
  }, []);

  const handleToggleSave = async (id: string) => {
    // Optimistic update
    setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    
    try {
      const result = await toggleProfileBookmark(id, 'expert');
      toast.success(result.saved ? 'Expert saved' : 'Removed from saved');
    } catch (err) {
      console.error('Failed to toggle save:', err);
      toast.error('Failed to update bookmark');
      // Revert
      setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const [filters, setFilters] = useState({
    expertise: [] as string[],
    experience: [] as string[],
    rating: 0,
    priceRange: { min: 0, max: 0 }, // 0 = unbounded
    availability: [] as string[],
  });

  // Reset pagination whenever the result set changes so "Load More" stays sane.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, sortBy, filters]);

  const expertiseAreas = [
    'Product Strategy',
    'Fundraising',
    'Growth Marketing',
    'Team Building',
    'Sales Strategy',
    'Technical Architecture',
    'UI/UX Design',
    'Legal & Compliance',
  ];

  const experienceLevels = [
    '0-5 years',
    '5-10 years',
    '10-15 years',
    '15+ years',
  ];

  const availabilityOptions = ['Available', 'Limited', 'Booked'];

  const sortOptions = [
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'experience', label: 'Most Experienced' },
    { value: 'sessions', label: 'Most Sessions' },
  ];

  const toggleFilter = (category: keyof typeof filters, value: string) => {
    if (category === 'expertise' || category === 'experience' || category === 'availability') {
      const current = filters[category];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      setFilters({ ...filters, [category]: updated });
    }
  };

  const clearAllFilters = () => {
    setFilters({
      expertise: [],
      experience: [],
      rating: 0,
      priceRange: { min: 0, max: 0 },
      availability: [],
    });
  };

  const priceActive = filters.priceRange.min > 0 || filters.priceRange.max > 0;
  const activeFilterCount =
    filters.expertise.length +
    filters.experience.length +
    filters.availability.length +
    (filters.rating > 0 ? 1 : 0) +
    (priceActive ? 1 : 0);

  const parseRate = (s: string) => {
    const n = Number(String(s || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  // Map a numeric years value to whether it falls in any of the selected buckets.
  const matchesExperience = (years: number, levels: string[]) => {
    if (levels.length === 0) return true;
    return levels.some((level) => {
      switch (level) {
        case '0-5 years': return years < 5;
        case '5-10 years': return years >= 5 && years < 10;
        case '10-15 years': return years >= 10 && years < 15;
        case '15+ years': return years >= 15;
        default: return false;
      }
    });
  };

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredExperts = experts.filter((e) => {
    // Text search
    if (normalizedQuery) {
      const haystack = [e.name, e.title, ...(e.specialization || []), ...(e.topSkills || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    // Expertise area
    if (filters.expertise.length > 0) {
      const hay = [...(e.specialization || []), e.expertise, e.title]
        .filter(Boolean).join(' ').toLowerCase();
      if (!filters.expertise.some((s) => hay.includes(s.toLowerCase()))) return false;
    }
    // Years of experience
    if (!matchesExperience(e.yearsExperience || 0, filters.experience)) return false;
    // Minimum rating
    if (filters.rating > 0 && (e.rating || 0) < filters.rating) return false;
    // Hourly rate range (only when a bound is set)
    if (priceActive) {
      const rate = parseRate(e.hourlyRate);
      const min = filters.priceRange.min || 0;
      const max = filters.priceRange.max || Infinity;
      if (rate < min || rate > max) return false;
    }
    // Availability
    if (filters.availability.length > 0 && !filters.availability.includes(e.availability)) return false;
    return true;
  });

  const sortedExperts = [...filteredExperts].sort((a, b) => {
    switch (sortBy) {
      case 'experience':
        return (b.yearsExperience || 0) - (a.yearsExperience || 0);
      case 'sessions':
        return (b.sessionsCompleted || 0) - (a.sessionsCompleted || 0);
      case 'price-low':
      case 'price-high': {
        const diff = parseRate(a.hourlyRate) - parseRate(b.hourlyRate);
        return sortBy === 'price-low' ? diff : -diff;
      }
      case 'rating':
      default:
        return (b.rating || 0) - (a.rating || 0);
    }
  });

  const visibleExperts = sortedExperts.slice(0, visibleCount);
  const hasMoreExperts = visibleCount < sortedExperts.length;

  const handleLoadMoreExperts = () => {
    if (loadingMore || !hasMoreExperts) return;
    setLoadingMore(true);
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedExperts.length));
    setTimeout(() => setLoadingMore(false), 0);
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Discover Experts</h1>
              <p className="text-gray-600 mt-1">Connect with mentors who can accelerate your growth</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input name="input-903fc4"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search experts by name, expertise, or skill..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sorting and Results Count */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 self-center">
              <span className="font-bold">{sortedExperts.length}</span> experts found
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:inline">Sort by:</span>
              <select name="select-144d13"
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
            {/* Featured Experts Banner */}
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5" />
                <h3 className="font-bold">Featured Experts</h3>
              </div>
              <p className="text-sm text-blue-100">
                Top-rated mentors with proven track records of helping founders succeed
              </p>
            </div>

            <div className="grid gap-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                visibleExperts.map((expert, index) => (
                  <motion.div
                    key={expert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${expert.featured ? 'ring-2 ring-yellow-400' : ''
                      }`}
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Left: Avatar and Basic Info */}
                        <div className="flex flex-col items-center md:items-start gap-4 md:w-48 flex-shrink-0">
                          <div className="relative">
                            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full relative overflow-hidden flex items-center justify-center text-white text-3xl font-bold">
                              {isHttpUrl(expert.avatar) ? (
                                <>
                                  <img
                                    src={expert.avatar}
                                    alt={expert.name}
                                    className="absolute inset-0 w-full h-full object-cover z-10"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                  <span className="hidden relative z-0">{String(expert.avatar || getInitials(expert.name))}</span>
                                </>
                              ) : (
                                <span>{String(expert.avatar || getInitials(expert.name))}</span>
                              )}
                            </div>
                          </div>

                          {/* Availability Badge */}
                          <div
                            className={`px-4 py-2 rounded-lg text-sm font-bold text-center w-full ${expert.availability === 'Available'
                              ? 'bg-green-100 text-green-700'
                              : expert.availability === 'Limited'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                              }`}
                          >
                            {expert.availability}
                          </div>

                          {/* Price — hidden on iOS (no prices in the free iOS app) */}
                          <div className="text-center md:text-left w-full">
                            {Capacitor.getPlatform() === 'ios' ? (
                              <div className="text-sm text-gray-500">Rate shared on request</div>
                            ) : (
                              <>
                                <div className="text-2xl font-bold text-gray-900">{expert.hourlyRate}</div>
                                <div className="text-sm text-gray-500">per hour</div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: Details */}
                        <div className="flex-1 text-center md:text-left">
                          {/* Header */}
                          <div className="mb-4">
                            <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-2">
                              <div className="w-full">
                                <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                                  {expert.name}
                                  {expert.verified && (
                                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.66.26-.55.43-1.16.43-1.84 0-2.21-1.79-4-4-4-.68 0-1.29.17-1.84.43C14.2 2.13 12.83 1.25 11.25 1.25s-2.95.88-3.66 2.18c-.55-.26-1.16-.43-1.84-.43-2.21 0-4 1.79-4 4 0 .68.17 1.29.43 1.84C.88 9.55 0 10.92 0 12.5s.88 2.95 2.18 3.66c-.26.55-.43 1.16-.43 1.84 0 2.21 1.79 4 4 4 .68 0 1.29-.17 1.84-.43 1.01 1.81 2.5 3.18 4.41 3.18s3.4-1.37 4.41-3.18c.55.26 1.16.43 1.84.43 2.21 0 4-1.79 4-4 0-.68-.17-1.29-.43-1.84 1.3-1.01 2.18-2.38 2.18-3.66zm-12.25 4.5l-4.5-4.5 1.41-1.41 3.09 3.09 7.09-7.09 1.41 1.41-8.5 8.5z" />
                                    </svg>
                                  )}
                                </h3>
                                <p className="text-gray-600">{expert.title}</p>
                              </div>
                              {expert.featured && (
                                <div className="mt-2 md:mt-0 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto md:mx-0">
                                  <Star className="w-3 h-3" fill="currentColor" />
                                  Featured
                                </div>
                              )}
                            </div>

                            {/* Rating */}
                            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-3 mt-3 md:mt-2">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400" />
                                <span className="font-bold text-gray-900">{expert.rating}</span>
                                <span className="text-sm text-gray-500">({expert.totalReviews} reviews)</span>
                              </div>
                              <div className="hidden md:block h-4 w-px bg-gray-300" />
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Users className="w-4 h-4" />
                                {expert.sessionsCompleted} sessions
                              </div>
                            </div>
                          </div>

                          {/* Expertise Statement */}
                          <p className="text-gray-700 mb-4 flex flex-col md:flex-row items-center md:items-start gap-2">
                            <Zap className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 md:mt-0" />
                            <span>{expert.expertise}</span>
                          </p>

                          {/* Specialization Tags */}
                          <div className="mb-4">
                            <div className="text-[10px] md:text-xs text-gray-500 mb-2 font-bold tracking-wider">SPECIALIZES IN</div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                              {expert.specialization.map((spec, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Top Skills */}
                          <div className="mb-4">
                            <div className="text-[10px] md:text-xs text-gray-500 mb-2 font-bold tracking-wider">TOP SKILLS</div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                              {expert.topSkills.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 mb-4 pb-4 border-t border-gray-200 pt-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Experience</div>
                              <div className="font-bold text-gray-900">{expert.yearsExperience} years</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Response Time</div>
                              <div className="font-bold text-gray-900">{expert.responseTime}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Sessions</div>
                              <div className="font-bold text-gray-900">{expert.sessionsCompleted}</div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => {
                                setSelectedExpert(expert);
                                setShowBookingModal(true);
                              }}
                              className="flex-1 px-6 py-3 bg-gradient-to-r text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                              style={{
                                background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                              }}
                            >
                              <Calendar className="w-5 h-5" />
                              Book Session
                            </button>
                             <button 
                              onClick={() => {
                                if (!hasFeature('canDirectMessage')) {
                                  toast.error(Capacitor.getPlatform() === 'ios' ? 'Direct messaging is available with NextIgnition Premium.' : `Your current ${userPlan} plan does not allow initiating direct messages. Please upgrade to Pro.`, {
                                    action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
                                  });
                                  return;
                                }
                                onMessage?.(String(expert.id));
                              }}
                              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-5 h-5" />
                              Message
                            </button>
                            <button
                              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                              onClick={() => setSelectedProfile(expert)}
                            >
                              View Profile
                            </button>
                            <button 
                              onClick={() => handleToggleSave(expert.id)}
                              className={`p-3 border rounded-lg transition-all active:scale-95 ${
                                savedIds.includes(expert.id) 
                                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                              }`}
                              title={savedIds.includes(expert.id) ? "Unsave" : "Save"}
                            >
                              <Bookmark className={`w-5 h-5 ${savedIds.includes(expert.id) ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Load More */}
            {(!loading && hasMoreExperts) && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMoreExperts}
                  disabled={loadingMore}
                  className={`px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors ${loadingMore ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {loadingMore ? 'Loading...' : 'Load More Experts'}
                </button>
              </div>
            )}
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

                {/* Expertise Area Filter */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Expertise Area</h4>
                  <div className="space-y-2">
                    {expertiseAreas.map((area) => (
                      <label key={area} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-fb10af"
                          type="checkbox"
                          checked={filters.expertise.includes(area)}
                          onChange={() => toggleFilter('expertise', area)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Experience Filter */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Years of Experience</h4>
                  <div className="space-y-2">
                    {experienceLevels.map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-6f899f"
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

                {/* Rating Filter */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Minimum Rating</h4>
                  <div className="space-y-2">
                    {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rating"
                          checked={filters.rating === rating}
                          onChange={() => setFilters({ ...filters, rating })}
                          className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm text-gray-700">{rating}+ stars</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Hourly Rate</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600">Min</label>
                      <input name="input-e3b624"
                        type="number"
                        min={0}
                        value={filters.priceRange.min || ''}
                        onChange={(e) => setFilters({ ...filters, priceRange: { ...filters.priceRange, min: Number(e.target.value) || 0 } })}
                        placeholder="0"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Max</label>
                      <input name="input-52937e"
                        type="number"
                        min={0}
                        value={filters.priceRange.max || ''}
                        onChange={(e) => setFilters({ ...filters, priceRange: { ...filters.priceRange, max: Number(e.target.value) || 0 } })}
                        placeholder="1000+"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Availability Filter */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-3">Availability</h4>
                  <div className="space-y-2">
                    {availabilityOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-12b1ae"
                          type="checkbox"
                          checked={filters.availability.includes(option)}
                          onChange={() => toggleFilter('availability', option)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Profile View Modal */}
      {selectedProfile && (
        <ProfileViewModal
          profile={{
            id: selectedProfile.id,
            name: selectedProfile.name,
            avatar: selectedProfile.avatar,
            role: selectedProfile.title,
            title: selectedProfile.title,
            rating: selectedProfile.rating,
            reviews: selectedProfile.totalReviews,
            hourlyRate: selectedProfile.hourlyRate,
            experience: selectedProfile.yearsExperience ? `${selectedProfile.yearsExperience} years` : undefined,
            skills: selectedProfile.topSkills,
            expertise: selectedProfile.specialization,
            bio: selectedProfile.expertise,
            availability: selectedProfile.availability,
            responseTime: selectedProfile.responseTime,
            completedProjects: selectedProfile.sessionsCompleted,
            verified: selectedProfile.verified,
            type: 'expert' as const
          }}
          onClose={() => setSelectedProfile(null)}
          onSendMessage={() => {
            const expert = selectedProfile;
            setSelectedProfile(null);
            if (expert?.id != null) onMessage?.(String(expert.id));
          }}
        />
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedExpert && (
        <BookingModal
          expert={selectedExpert}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedExpert(null);
          }}
        />
      )}
    </div>
  );
}

