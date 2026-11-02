import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Users,
  Calendar,
  MessageCircle,
  Video,
  ChevronLeft,
  ChevronRight,
  Target,
  Award,
  Star,
  XCircle,
  Search,
  MoreVertical,
  Trash2,
  User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { brandColors } from '../utils/colors';
import { ScheduleMeetingModal } from './ScheduleMeetingModal';
import { getUsersByRole } from '../services/userService';
import { getCurrentUser } from '../services/authService';
import { formatLocalDate } from '../utils/formatters';
import api from '../services/api';

interface Client {
  id: number;
  userId: string;
  name: string;
  startup: string;
  industry: string;
  stage: string;
  matchScore: number;
  status: 'active' | 'pending' | 'completed';
  sessionsCompleted: number;
  nextSession?: string;
  avatar: string;
  email?: string;
}

interface AIMatchedStartup {
  id: number;
  startup: string;
  founder: string;
  industry: string;
  stage: string;
  matchScore: number;
  matchReason: string;
  avatar: string;
  needsHelp: string;
}

interface MyClientsPageProps {
  onMessageUser?: (userId: string) => void;
}

export function MyClientsPage({ onMessageUser }: MyClientsPageProps) {
  const [aiCarouselIndex, setAiCarouselIndex] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'completed'>('all');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [myClients, setMyClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [viewingClientProfile, setViewingClientProfile] = useState<Client | null>(null);

  const aiMatchedStartups: AIMatchedStartup[] = [
    {
      id: 1,
      startup: 'ApexHealth',
      founder: 'Sarah Jenkins',
      industry: 'MedTech',
      stage: 'Seed',
      matchScore: 96,
      matchReason: 'Matches your deep expertise in healthcare SaaS and scaling early B2B sales pipelines.',
      avatar: 'AH',
      needsHelp: 'Looking for guidance on regulatory compliance pathways and setting up their initial medical advisory board.',
    },
    {
      id: 2,
      startup: 'CarbonZero',
      founder: 'Michael Chen',
      industry: 'CleanTech',
      stage: 'Pre-Seed',
      matchScore: 92,
      matchReason: 'Aligned with your focus on climate tech scaling strategies and carbon credit market experience.',
      avatar: 'CZ',
      needsHelp: 'Needs strategic direction for enterprise pilot acquisitions and finalizing their hardware unit economics.',
    },
    {
      id: 3,
      startup: 'Lumina AI',
      founder: 'Elena Rostova',
      industry: 'AI & ML',
      stage: 'Series A',
      matchScore: 89,
      matchReason: 'Perfect match for your expertise in LLM fine-tuning strategies and scaling cloud infrastructure cost-efficiently.',
      avatar: 'LA',
      needsHelp: 'Seeking mentorship on international expansion and building out a decentralized developer advocacy team.',
    },
  ];

  useEffect(() => {
    let mounted = true;
    const loadClients = async () => {
      setLoadingClients(true);
      setClientsError('');
      try {
        const me = getCurrentUser();
        const excludeUserId = me?._id ? String(me._id) : undefined;
        // Fetch founders + this expert's bookings together so we can derive a
        // real per-client status instead of hardcoding "active".
        const [users, bookingsRes] = await Promise.all([
          getUsersByRole('founder', excludeUserId),
          api.get('/bookings').catch(() => ({ data: [] })),
        ]);
        const list = Array.isArray(users) ? users : [];
        const bookings: any[] = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

        // Group bookings by founder id.
        const byFounder = new Map<string, any[]>();
        bookings.forEach((b) => {
          const fid = String(b.founder?._id || b.founder || '');
          if (!fid) return;
          if (!byFounder.has(fid)) byFounder.set(fid, []);
          byFounder.get(fid)!.push(b);
        });

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const deriveStatus = (bs: any[]): 'active' | 'pending' | 'completed' => {
          if (bs.some((b) => b.status === 'pending')) return 'pending';
          if (bs.some((b) => b.status === 'confirmed')) return 'active';
          if (bs.length > 0 && bs.every((b) => b.status === 'completed' || b.status === 'cancelled')) return 'completed';
          return 'active';
        };

        const mapped: Client[] = list
          .filter((u: any) => u?._id)
          .map((u: any, idx: number) => {
            const name = String(u.name || u.username || 'User');
            const initials = name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((p: string) => p[0])
              .join('')
              .toUpperCase();
            const bs = byFounder.get(String(u._id)) || [];
            const upcoming = bs
              .filter((b) => b.status === 'confirmed' && new Date(b.date) >= startOfToday)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            return {
              id: idx + 1,
              userId: String(u._id),
              name,
              startup: u.startup?.name || u.company || 'Startup',
              industry: u.startup?.industry || u.industry || 'General',
              stage: u.startup?.stage || u.stage || 'Seed',
              matchScore: 0,
              status: deriveStatus(bs),
              sessionsCompleted: bs.filter((b) => b.status === 'completed').length,
              nextSession: upcoming ? `${formatLocalDate(upcoming.date)} at ${upcoming.startTime}` : undefined,
              avatar: initials || 'U',
              email: u.email,
            };
          });
        if (!mounted) return;
        setMyClients(mapped);
      } catch (err: any) {
        if (!mounted) return;
        setMyClients([]);
        setClientsError(err.response?.data?.message || 'Failed to load users');
      } finally {
        if (!mounted) return;
        setLoadingClients(false);
      }
    };
    loadClients();
    return () => { mounted = false; };
  }, []);

  const filteredClients = myClients.filter((c) => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.startup.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const nextStartup = () => setAiCarouselIndex((prev) => (prev + 1) % aiMatchedStartups.length);
  const prevStartup = () => setAiCarouselIndex((prev) => (prev - 1 + aiMatchedStartups.length) % aiMatchedStartups.length);

  const handleReachOut = (startup: AIMatchedStartup) => {
    const template = `Hi ${startup.founder.split(' ')[0]},\n\nI came across ${startup.startup} on NextIgnition and was impressed by your work in ${startup.industry}. With my experience in growth marketing and startup scaling, I believe I could provide valuable guidance as you navigate the ${startup.stage} stage.\n\nI'd love to schedule a quick call to discuss how I can support your journey. Let me know if you're interested!\n\nBest regards`;
    alert(`Pre-written message template:\n\n${template}`);
  };

  const handleScheduleMeeting = (client: Client) => {
    setSelectedClient(client);
    setIsScheduleModalOpen(true);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.dropdown-container')) return;
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleViewProfile = (client: Client) => {
    setViewingClientProfile(client);
    setActiveDropdownId(null);
  };

  const handleUpdateStatus = (clientId: number, newStatus: 'active' | 'pending' | 'completed') => {
    setMyClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c)));
    setActiveDropdownId(null);
  };

  const handleRemoveClient = (clientId: number, clientName: string) => {
    if (confirm(`Are you sure you want to remove ${clientName} from your client list?`)) {
      setMyClients((prev) => prev.filter((c) => c.id !== clientId));
      setActiveDropdownId(null);
    }
  };

  const currentStartup = aiMatchedStartups[aiCarouselIndex];

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* ── Featured AI Match Widget ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#6666FF]/10 via-purple-50 to-[#F78405]/10 border-2 border-[#6666FF]/30 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#6666FF]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-[#F78405]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">Featured AI Match</h2>
                <p className="text-xs sm:text-sm text-gray-600">Highly compatible startups seeking your expertise</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-medium">{aiCarouselIndex + 1} of {aiMatchedStartups.length} Matches</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevStartup}
                  className="w-8 h-8 rounded-full bg-white shadow border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95 text-gray-600 hover:text-gray-900"
                  title="Previous match"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextStartup}
                  className="w-8 h-8 rounded-full bg-white shadow border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95 text-gray-600 hover:text-gray-900"
                  title="Next match"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Match Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStartup.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white/95 backdrop-blur-md border border-[#6666FF]/20 rounded-2xl p-6 md:p-8 shadow-xl"
            >
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Profile + match reason */}
                <div className="flex-1 min-w-0 space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6666FF] to-purple-600 flex items-center justify-center text-white font-extrabold text-xl flex-shrink-0 shadow-md">
                      {currentStartup.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-extrabold text-xl text-gray-900">{currentStartup.startup}</h3>
                        <span className="inline-flex items-center gap-1 px-3 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black rounded-full shadow-sm whitespace-nowrap">
                          <Star className="w-3 h-3 fill-current" />
                          {currentStartup.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#6666FF]">{currentStartup.founder} · Founder</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100">{currentStartup.industry}</span>
                        <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 text-xs font-bold rounded-md border border-orange-100">{currentStartup.stage} Stage</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700 mt-0.5 flex-shrink-0">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wider mb-1">Why you are a perfect match</p>
                        <p className="text-sm text-purple-800 font-medium leading-relaxed">{currentStartup.matchReason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px bg-gray-200 self-stretch flex-shrink-0" />

                {/* Right: Support request + CTA */}
                <div className="lg:w-72 flex-shrink-0 flex flex-col gap-5 justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-amber-100 rounded text-amber-700 flex-shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Current Support Request</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
                      "{currentStartup.needsHelp}"
                    </p>
                  </div>

                  <button
                    onClick={() => handleReachOut(currentStartup)}
                    className="w-full px-5 py-3.5 bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white rounded-xl font-bold hover:shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Send Intro Proposal</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── My Clients Section ── */}
      <div className="bg-white rounded-2xl shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-blue-600" />
                My Clients
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filterStatus === 'all' && !searchQuery
                  ? `${myClients.length} total clients`
                  : `${filteredClients.length} of ${myClients.length} clients`}
              </p>
            </div>

            {/* Filters + Search */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
              {showSearch ? (
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1.5 flex-1 md:w-64 border border-gray-200">
                  <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-sm text-gray-800 outline-none w-full"
                    autoFocus
                  />
                  <button
                    onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                    {(['all', 'active', 'pending', 'completed'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap capitalize ${
                          filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 border border-gray-200 ml-1"
                  >
                    <Search className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientsError && (
            <div className="md:col-span-2 lg:col-span-3 text-sm text-red-600">{clientsError}</div>
          )}
          {loadingClients && (
            <div className="md:col-span-2 lg:col-span-3 text-sm text-gray-600">Loading clients...</div>
          )}
          {!loadingClients && filteredClients.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 text-sm text-gray-500 p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No clients found matching the selected filters.
            </div>
          )}

          {filteredClients.map((client, idx) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative overflow-hidden border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col justify-between min-h-[360px]"
            >
              <AnimatePresence>
                {viewingClientProfile?.id === client.id && (
                  <motion.div
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute inset-0 bg-white z-30 p-5 flex flex-col justify-between"
                  >
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                      {/* Gradient top indicator line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6666FF] to-[#F78405]" />
                      
                      {/* Header with Close */}
                      <div className="flex items-start justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {client.avatar}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm truncate">{client.name}</h4>
                            <p className="text-xs text-[#6666FF] font-semibold truncate">{client.startup}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setViewingClientProfile(null)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                          title="Close profile"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-sm font-bold text-gray-900">{client.sessionsCompleted}</div>
                          <div className="text-[10px] text-gray-500">Sessions</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-sm font-bold text-gray-900">{client.matchScore > 0 ? `${client.matchScore}%` : 'New'}</div>
                          <div className="text-[10px] text-gray-500">Match</div>
                        </div>
                      </div>

                      {/* About / Status */}
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Collaboration</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${
                              client.status === 'active' ? 'bg-green-500 animate-pulse' :
                              client.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`} />
                            <span className="text-xs font-semibold text-gray-800 capitalize">{client.status}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">About</p>
                          <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/30">
                            {client.startup} is dedicated to building innovative solutions in {client.industry} at the {client.stage} stage, led by {client.name}.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons inside overlay footer */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => { onMessageUser?.(client.userId); setViewingClientProfile(null); }}
                        className="flex-1 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Message
                      </button>
                      <button
                        onClick={() => { handleScheduleMeeting(client); setViewingClientProfile(null); }}
                        className="flex-1 py-2 text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-1"
                        style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                      >
                        <Video className="w-3.5 h-3.5" />
                        Schedule
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                {/* Client Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                      {client.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 truncate" title={client.name}>{client.name}</h3>
                      <p className="text-sm text-gray-500 truncate" title={client.startup}>{client.startup}</p>
                    </div>
                  </div>

                  {/* Three-dot dropdown */}
                  <div className="relative dropdown-container flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(activeDropdownId === client.id ? null : client.id);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>

                    {activeDropdownId === client.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewProfile(client); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <User className="w-4 h-4 text-blue-500" />
                          View Profile
                        </button>

                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Change Status</div>

                        {(['active', 'pending', 'completed'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(client.id, s); }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 capitalize ${
                              client.status === s
                                ? s === 'active' ? 'text-green-600 font-bold bg-green-50/50'
                                  : s === 'pending' ? 'text-yellow-600 font-bold bg-yellow-50/50'
                                  : 'text-gray-700 font-bold bg-gray-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${
                              s === 'active' ? 'bg-green-500' : s === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`} />
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}

                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveClient(client.id, client.name); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          Remove Client
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100">{client.industry}</span>
                  <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-md border border-orange-100">{client.stage}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">{client.sessionsCompleted}</div>
                    <div className="text-xs text-gray-500">Sessions</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">{client.matchScore > 0 ? `${client.matchScore}%` : 'New'}</div>
                    <div className="text-xs text-gray-500">Match</div>
                  </div>
                </div>

                {/* Next Session */}
                {client.nextSession && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{client.nextSession}</span>
                  </div>
                )}
              </div>

              {/* Bottom Row */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
                  client.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  client.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-gray-50 text-gray-700 border border-gray-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    client.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                    client.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'
                  }`} />
                  <span className="capitalize">{client.status}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onMessageUser?.(client.userId)}
                    className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    title="Send Message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 flex items-center gap-1.5 shadow-sm active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                    onClick={() => handleScheduleMeeting(client)}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Schedule</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Schedule Meeting Modal ── */}
      {isScheduleModalOpen && selectedClient && (
        <ScheduleMeetingModal
          client={selectedClient}
          onClose={() => setIsScheduleModalOpen(false)}
        />
      )}

      {/* ── View Profile Modal ── */}
    </div>
  );
}