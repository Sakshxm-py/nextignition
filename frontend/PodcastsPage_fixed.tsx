import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  List,
  Download,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Search,
  Plus,
  X,
  ThumbsUp,
  MessageSquare,
  Share2,
  MoreVertical,
  ExternalLink,
  CheckCircle,
  Clock,
  Minimize2,
  Maximize2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Crown,
  Award,
  Zap,
  FileText,
  Link as LinkIcon,
  AlignLeft,
  Rocket,
  DollarSign,
  TrendingUp,
  Brain,
  Users,
  GraduationCap,
  Briefcase,
  PieChart,
  Lightbulb,
  BarChart3,
  Globe,
  Headphones,
  Sparkles
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import api from '../services/api';

interface Episode {
  id: string;
  _id?: string;
  title: string;
  episodeNumber: number;
  duration: string;
  durationSeconds: number;
  publishDate: string;
  thumbnail: string;
  host: {
    name: string;
    avatar: string;
  };
  tier: 'free' | 'pro' | 'elite' | 'expert';
  category: string;
  description: string;
  isBookmarked: boolean;
  plays: number;
  isVideo: boolean;
  targetAudience?: ('founder' | 'expert' | 'investor')[];
  tags?: string[];
}

interface PodcastsPageProps {
  userRole?: 'founder' | 'expert' | 'investor';
}

export function PodcastsPage({ userRole = 'founder' }: PodcastsPageProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [activeTierFilter, setActiveTierFilter] = useState<string>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [heroIndex, setHeroIndex] = useState(0);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<'tier' | 'category' | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [featuredEpisodes, setFeaturedEpisodes] = useState<Episode[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Episode[]>([]);
  const [recommended, setRecommended] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch episodes from API
  useEffect(() => {
    fetchEpisodes();
    fetchFeaturedEpisodes();
    fetchRecentlyPlayed();
    fetchRecommended();
  }, [activeTierFilter, activeCategoryFilter]);

  const fetchEpisodes = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (activeTierFilter !== 'all') params.tier = activeTierFilter;
      if (activeCategoryFilter !== 'all') params.category = activeCategoryFilter;
      
      const resp = await api.get('/podcasts', { params });
      const mapped = (resp.data as any[]).map((ep: any) => ({
        ...ep,
        id: ep._id || String(ep.id),
        publishDate: ep.publishDate 
          ? new Date(ep.publishDate).toLocaleDateString()
          : ep.publishDate,
        host: {
          name: ep.host?.name || 'Host',
          avatar: ep.host?.avatar || 'H'
        }
      }));
      setAllEpisodes(mapped);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load podcasts');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedEpisodes = async () => {
    try {
      const resp = await api.get('/podcasts/featured');
      const mapped = (resp.data as any[]).map((ep: any) => ({
        ...ep,
        id: ep._id || String(ep.id),
        publishDate: ep.publishDate 
          ? new Date(ep.publishDate).toLocaleDateString()
          : ep.publishDate,
        host: {
          name: ep.host?.name || 'Host',
          avatar: ep.host?.avatar || 'H'
        }
      }));
      setFeaturedEpisodes(mapped);
    } catch {
      // Silent fail
    }
  };

  const fetchRecentlyPlayed = async () => {
    try {
      const resp = await api.get('/podcasts/recently-played');
      const mapped = (resp.data as any[]).map((ep: any) => ({
        ...ep,
        id: ep._id || String(ep.id),
        publishDate: ep.publishDate 
          ? new Date(ep.publishDate).toLocaleDateString()
          : ep.publishDate,
        host: {
          name: ep.host?.name || 'Host',
          avatar: ep.host?.avatar || 'H'
        }
      }));
      setRecentlyPlayed(mapped);
    } catch {
      // Silent fail
    }
  };

  const fetchRecommended = async () => {
    try {
      const resp = await api.get('/podcasts/recommended');
      const mapped = (resp.data as any[]).map((ep: any) => ({
        ...ep,
        id: ep._id || String(ep.id),
        publishDate: ep.publishDate 
          ? new Date(ep.publishDate).toLocaleDateString()
          : ep.publishDate,
        host: {
          name: ep.host?.name || 'Host',
          avatar: ep.host?.avatar || 'H'
        }
      }));
      setRecommended(mapped);
    } catch {
      // Silent fail
    }
  };

  const tierFilters = [
    { value: 'all', label: 'All' },
    { value: 'free', label: 'Free', color: '#10B981' },
    { value: 'pro', label: 'Premium (Pro)', color: brandColors.electricBlue },
    { value: 'elite', label: 'Premium (Elite)', color: brandColors.atomicOrange },
    { value: 'expert', label: 'Premium (Expert)', color: '#8B5CF6' },
  ];

  const categoryFilters = [
    { value: 'all', label: 'All' },
    { value: 'saas', label: 'SaaS' },
    { value: 'fintech', label: 'FinTech' },
    { value: 'healthtech', label: 'HealthTech' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'tech', label: 'Tech' },
  ];

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      free: '#10B981',
      pro: brandColors.electricBlue,
      elite: brandColors.atomicOrange,
      expert: '#8B5CF6',
    };
    return colors[tier] || '#6B7280';
  };

  const getTierIcon = (tier: string) => {
    if (tier === 'free') return null;
    if (tier === 'pro') return <CheckCircle className="w-3 h-3" />;
    if (tier === 'elite') return <Crown className="w-3 h-3" />;
    if (tier === 'expert') return <Zap className="w-3 h-3" />;
    return null;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = (episode?: Episode) => {
    if (episode && episode.id !== currentlyPlaying?.id) {
      setCurrentlyPlaying(episode);
      setIsPlaying(true);
      setCurrentTime(0);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Hero carousel auto-advance
  useEffect(() => {
    if (featuredEpisodes.length === 0) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredEpisodes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredEpisodes]);

  // Simulate playback progress
  useEffect(() => {
    if (isPlaying && currentlyPlaying) {
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + playbackSpeed;
          return next >= currentlyPlaying.durationSeconds ? 0 : next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentlyPlaying, playbackSpeed]);

  // Guard: don't render hero until data is loaded
  if (featuredEpisodes.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden pb-24">
        <main className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="text-gray-600">Loading podcasts...</div>
        </main>
      </div>
    );
  }

  const heroEpisode = featuredEpisodes[heroIndex];

  if (selectedEpisode) {
    return <EpisodeDetailPage episode={selectedEpisode} onBack={() => setSelectedEpisode(null)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden pb-24 relative">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero Carousel */}
        <div className="relative h-[500px] bg-black overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={heroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {/* Background with gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                  }} />
                </div>
              </div>

              {/* Content */}
              <div className="relative h-full max-w-7xl mx-auto px-4 lg:px-8 flex items-center">
                <div className="max-w-2xl p-[0px]">
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="px-3 py-1 rounded-full text-white text-xs font-bold uppercase flex items-center gap-1"
                      style={{ backgroundColor: getTierColor(heroEpisode?.tier) }}
                    >
                      {getTierIcon(heroEpisode?.tier)}
                      {heroEpisode?.tier}
                    </span>
                    <span className="text-white/80 text-sm">Episode {heroEpisode?.episodeNumber}</span>
                  </div>

                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-[96px] mt-[0px] mr-[0px] ml-[0px]">
                    {heroEpisode?.title}
                  </h1>

                  <div className="flex items-center gap-4 mb-[24px] text-white/80 mt-[0px] mr-[0px] ml-[0px]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: brandColors.atomicOrange }}
                      >
                        {heroEpisode?.host?.avatar}
                      </div>
                      <span>{heroEpisode?.host?.name}</span>
                    </div>
                    <span>•</span>
                    <span>{heroEpisode?.duration}</span>
                    <span>•</span>
                    <span>{heroEpisode?.publishDate}</span>
                  </div>

                  <button
                    onClick={() => handlePlayPause(heroEpisode!)}
                    className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-white text-lg hover:shadow-lg transition-all group"
                    style={{ backgroundColor: brandColors.atomicOrange }}
                  >
                    <Play className="w-6 h-6 group-hover:scale-110 transition-transform" fill="white" />
                    Play Now
                  </button>
                </div>
              </div>

              {/* Play Overlay Icon */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" fill="white" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {featuredEpisodes.map((_, index) => (
              <button
                key={index}
                onClick={() => setHeroIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === heroIndex ? 'bg-white w-8' : 'bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => setHeroIndex((heroIndex - 1 + featuredEpisodes.length) % featuredEpisodes.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setHeroIndex((heroIndex + 1) % featuredEpisodes.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
            {/* Main Filter Buttons Side by Side */}
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setExpandedFilter(expandedFilter === 'tier' ? null : 'tier')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                style={expandedFilter === 'tier' ? { backgroundColor: brandColors.electricBlue, color: 'white', borderColor: brandColors.electricBlue } : {}}
              >
                <Filter className="w-4 h-4" />
                <span>Access Tier</span>
                {expandedFilter === 'tier' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => setExpandedFilter(expandedFilter === 'category' ? null : 'category')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                style={expandedFilter === 'category' ? { backgroundColor: brandColors.electricBlue, color: 'white', borderColor: brandColors.electricBlue } : {}}
              >
                <Filter className="w-4 h-4" />
                <span>Category</span>
                {expandedFilter === 'category' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Tier Filters - Expandable */}
            <AnimatePresence>
              {expandedFilter === 'tier' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {tierFilters.map(filter => (
                      <button
                        key={filter.value}
                        onClick={() => setActiveTierFilter(filter.value)}
                        className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          activeTierFilter === filter.value
                            ? 'text-white'
                            : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                        style={activeTierFilter === filter.value ? { backgroundColor: filter.color || brandColors.electricBlue } : {}}
                      >
                        {filter.value !== 'all' && getTierIcon(filter.value)}
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Filters - Expandable */}
            <AnimatePresence>
              {expandedFilter === 'category' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {categoryFilters.map(filter => (
                      <button
                        key={filter.value}
                        onClick={() => setActiveCategoryFilter(filter.value)}
                        className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${
                          activeCategoryFilter === filter.value
                            ? 'text-white'
                            : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                        style={activeCategoryFilter === filter.value ? { backgroundColor: brandColors.electricBlue } : {}}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Podcast Grid */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700">
              {error}
            </div>
          )}
          {loading && (
            <div className="mb-4 p-4 rounded-lg bg-gray-100 border border-gray-200 text-gray-700">
              Loading podcasts...
            </div>
          )}
          <div className="flex gap-8">
            {/* Main Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {allEpisodes.map((episode, index) => (
                  <motion.div
                    key={episode.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all group cursor-pointer"
                    onClick={() => setSelectedEpisode(episode)}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-44 bg-gradient-to-br from-purple-500 to-blue-600 overflow-hidden">
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0" style={{
                          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                          backgroundSize: '20px 20px'
                        }} />
                      </div>

                      {/* Tier Badge */}
                      <div
                        className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-white text-xs font-bold uppercase flex items-center gap-1"
                        style={{ backgroundColor: getTierColor(episode.tier) }}
                      >
                        {getTierIcon(episode.tier)}
                        {episode.tier}
                      </div>

                      {/* Play Overlay - Appears on Hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause(episode);
                          }}
                          className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
                        >
                          <Play className="w-8 h-8" style={{ color: brandColors.atomicOrange }} fill={brandColors.atomicOrange} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-1">Episode {episode.episodeNumber}</p>
                      <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {episode.title}
                      </h3>

                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: brandColors.electricBlue }}
                        >
                          {episode.host.avatar}
                        </div>
                        <p className="text-sm text-gray-600">{episode.host.name}</p>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {episode.duration}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {episode.isBookmarked ? (
                            <BookmarkCheck className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
                          ) : (
                            <Bookmark className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 mt-2">{episode.publishDate}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Sidebar - Desktop Only */}
            <aside className="hidden xl:block w-80 space-y-6">
              {/* Playlists */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Playlists</h3>
                  <button
                    onClick={() => setShowPlaylistModal(true)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {['Favorites', 'Watch Later', 'Growth Tips'].map((playlist, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                          <List className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{playlist}</p>
                          <p className="text-xs text-gray-500">{Math.floor(Math.random() * 20) + 5} episodes</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Recently Played */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-bold mb-4">Recently Played</h3>
                <div className="space-y-3">
                  {recentlyPlayed.map(episode => (
                    <div
                      key={episode.id}
                      onClick={() => setSelectedEpisode(episode)}
                      className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1 mb-1">{episode.title}</p>
                        <p className="text-xs text-gray-600">Ep. {episode.episodeNumber}</p>
                        <p className="text-xs text-gray-500">{episode.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
                  <h3 className="font-bold">Recommended for You</h3>
                </div>
                <div className="space-y-3">
                  {recommended.map(episode => (
                    <div
                      key={episode.id}
                      onClick={() => setSelectedEpisode(episode)}
                      className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1 mb-1">{episode.title}</p>
                        <p className="text-xs text-gray-600">Ep. {episode.episodeNumber}</p>
                        <p className="text-xs text-gray-500">{episode.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Persistent Audio Player - Bottom Bar */}
      {currentlyPlaying && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-700"
          style={{ backgroundColor: brandColors.navyBlue }}
        >
          {!isPlayerMinimized ? (
            <div className="max-w-full px-4 py-3">
              <div className="flex items-center gap-4">
                {/* Left Section - Episode Info */}
                <div className="flex items-center gap-3 min-w-0 w-64">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{currentlyPlaying.title}</p>
                    <p className="text-white/60 text-xs truncate">{currentlyPlaying.host.name}</p>
                  </div>
                </div>

                {/* Center Section - Controls */}
                <div className="flex-1 max-w-2xl">
                  {/* Control Buttons */}
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <SkipBack className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => handlePlayPause()}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white" fill="white" />
                      )}
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <SkipForward className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/60 w-10 text-right">{formatTime(currentTime)}</span>
                    <div className="flex-1 relative group">
                      <input
                        type="range"
                        min="0"
                        max={currentlyPlaying.durationSeconds}
                        value={currentTime}
                        onChange={(e) => setCurrentTime(Number(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer group-hover:h-1.5 transition-all"
                        style={{
                          background: `linear-gradient(to right, white ${(currentTime / currentlyPlaying.durationSeconds) * 100}%, rgba(255,255,255,0.2) ${(currentTime / currentlyPlaying.durationSeconds) * 100}%)`
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/60 w-10">{formatTime(currentlyPlaying.durationSeconds)}</span>
                  </div>
                </div>

                {/* Right Section - Additional Controls */}
                <div className="flex items-center gap-3">
                  {/* Volume */}
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(Number(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Speed Control */}
                  <button
                    onClick={() => setPlaybackSpeed(playbackSpeed === 2 ? 1 : playbackSpeed + 0.5)}
                    className="hidden lg:block px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    {playbackSpeed}x
                  </button>

                  {/* Playlist */}
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <List className="w-5 h-5 text-white" />
                  </button>

                  {/* Download (Premium) */}
                  {currentlyPlaying.tier !== 'free' && (
                    <button className="hidden lg:block p-2 hover:bg-white/10 rounded-full transition-colors">
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  )}

                  {/* Minimize */}
                  <button
                    onClick={() => setIsPlayerMinimized(true)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-xs truncate">{currentlyPlaying.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlayPause()}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="white" />}
                </button>
                <button
                  onClick={() => setIsPlayerMinimized(false)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Coming Soon Overlay for Experts */}
    {userRole === 'expert' && (
      <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl border border-gray-200"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Headphones className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Expert Podcasts Coming Soon!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            We're building powerful tools for experts to host, manage, and distribute their own startup-focused podcasts directly to our community.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            In Development
          </div>
        </motion.div>
      </div>
    )}
  </div>
);
}

// Episode Detail Page Component
function EpisodeDetailPage({ episode, onBack }: { episode: Episode; onBack: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const timestamps = [
    { time: '0:00', label: 'Introduction' },
    { time: '2:30', label: 'Understanding the Problem' },
    { time: '8:15', label: 'Solution Overview' },
    { time: '15:45', label: 'Case Studies' },
    { time: '28:30', label: 'Implementation Steps' },
    { time: '35:00', label: 'Q&A Session' },
  ];

  const resources = [
    { title: 'Pitch Deck Template', url: '#', type: 'PDF' },
    { title: 'Financial Model Spreadsheet', url: '#', type: 'XLSX' },
    { title: 'Recommended Reading List', url: '#', type: 'Link' },
  ];

  const relatedEpisodes = [
    { id: 1, title: 'Follow-up: Advanced Strategies', episodeNumber: 45, duration: '38 min' },
    { id: 2, title: 'Case Study: Real-world Example', episodeNumber: 46, duration: '42 min' },
    { id: 3, title: 'Expert Panel Discussion', episodeNumber: 47, duration: '55 min' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-24">
        {/* Back Button */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back to Episodes</span>
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Video/Audio Player */}
              <div className="bg-black rounded-xl overflow-hidden">
                <div className="aspect-video relative bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
                  {/* Placeholder waveform for audio-only */}
                  {!episode.isVideo ? (
                    <div className="absolute inset-0 flex items-center justify-center px-8">
                      <div className="w-full flex items-center gap-1 h-32">
                        {Array.from({ length: 100 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-white/30 rounded-full"
                            style={{ height: `${Math.random() * 100}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)',
                        backgroundSize: '40px 40px'
                      }} />
                    </div>
                  )}

                  {/* Play Button */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="relative z-10 w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center hover:scale-110 transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10" style={{ color: brandColors.atomicOrange }} />
                    ) : (
                      <Play className="w-10 h-10" style={{ color: brandColors.atomicOrange }} fill={brandColors.atomicOrange} />
                    )}
                  </button>

                  {/* Captions Toggle */}
                  {episode.isVideo && (
                    <button className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-black/70 transition-colors">
                      CC
                    </button>
                  )}
                </div>
              </div>

              {/* Episode Info */}
              <div className="bg-white rounded-xl p-6 lg:p-8 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-3 py-1 rounded-full text-white text-xs font-bold uppercase flex items-center gap-1"
                        style={{ backgroundColor: brandColors.electricBlue }}
                      >
                        {episode.tier === 'pro' && <CheckCircle className="w-3 h-3" />}
                        {episode.tier}
                      </span>
                      <span className="text-sm text-gray-600">Episode {episode.episodeNumber}</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-4">{episode.title}</h1>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm md:text-base text-gray-600">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: brandColors.atomicOrange }}
                        >
                          {episode.host.avatar}
                        </div>
                        <span className="font-medium">{episode.host.name}</span>
                      </div>
                      <span className="hidden md:inline">•</span>
                      <span>{episode.publishDate}</span>
                      <span className="hidden md:inline">•</span>
                      <span>{episode.duration}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <BookmarkCheck className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Show Notes */}
              <div className="bg-white rounded-xl p-6 lg:p-8 border border-gray-200">
                <h2 className="text-2xl font-bold mb-4">Show Notes</h2>
                <p className="text-gray-700 mb-6">{episode.description}</p>

                {/* Timestamps */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-3">Timestamps</h3>
                  <div className="space-y-2">
                    {timestamps.map((ts, i) => (
                      <button
                        key={i}
                        className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <span
                          className="font-mono text-sm font-bold flex-shrink-0 px-2 py-1 rounded"
                          style={{ backgroundColor: brandColors.electricBlue, color: 'white' }}
                        >
                          {ts.time}
                        </span>
                        <span className="text-sm">{ts.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resources */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Resources</h3>
                  <div className="space-y-2">
                    {resources.map((resource, i) => (
                      <a
                        key={i}
                        href={resource.url}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <LinkIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{resource.title}</p>
                            <p className="text-xs text-gray-500">{resource.type}</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Full Transcript</h3>
                  </div>
                  {showTranscript ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {showTranscript && (
                  <div className="px-6 pb-6">
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search transcript..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-3">
                          <span className="text-sm text-gray-500 font-mono w-16 flex-shrink-0">{i * 2}:30</span>
                          <p className="text-sm text-gray-700">
                            This is a sample transcript text. In a real implementation, this would contain the actual transcribed content from the episode.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="bg-white rounded-xl p-6 lg:p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Comments</h2>
                  <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                    <option>Newest</option>
                    <option>Top</option>
                    <option>Oldest</option>
                  </select>
                </div>

                {/* Comment Input */}
                <div className="mb-6">
                  <textarea
                    placeholder="Share your thoughts..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <button
                    className="mt-2 px-6 py-2 rounded-lg font-bold text-white hover:shadow-md transition-all"
                    style={{ backgroundColor: brandColors.electricBlue }}
                  >
                    Post Comment
                  </button>
                </div>

                {/* Comment List */}
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: brandColors.electricBlue }}
                      >
                        U{i}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">User {i}</span>
                          <span className="text-xs text-gray-500">2 days ago</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          Great episode! Really insightful content. Looking forward to implementing these strategies.
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{Math.floor(Math.random() * 50)}</span>
                          </button>
                          <button className="hover:text-blue-600 transition-colors">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <aside className="hidden lg:block w-96 space-y-6">
              {/* Related Episodes */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Related Episodes</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoPlayNext}
                      onChange={(e) => setAutoPlayNext(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: brandColors.electricBlue }}
                    />
                    <span className="text-gray-600">Auto-play</span>
                  </label>
                </div>
                <div className="space-y-3">
                  {relatedEpisodes.map(ep => (
                    <div
                      key={ep.id}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Episode {ep.episodeNumber}</p>
                        <p className="font-medium text-sm line-clamp-2 mb-1">{ep.title}</p>
                        <p className="text-xs text-gray-600">{ep.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* You Might Also Like */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
                  <h3 className="font-bold">You Might Also Like</h3>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2 mb-1">
                          Building a Successful SaaS Product
                        </p>
                        <p className="text-xs text-gray-600">45 min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
