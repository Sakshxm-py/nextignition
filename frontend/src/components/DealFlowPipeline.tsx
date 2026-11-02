import { useState, useRef, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { getSocket } from '../services/socketService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  Calendar as CalendarIcon,
  Settings,
  Plus,
  MoreVertical,
  MessageCircle,
  ExternalLink,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Check,
  X,
  GripVertical,
  ChevronRight,
  Filter,
  Download,
  Clock,
  AlertCircle,
  Building2,
  Sparkles,
  FileText,
  Video,
  Share2,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  CheckCircle,
  Briefcase,
  MapPin,
  TrendingDown,
  Edit,
  Eye,
  Bell
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { getInvestorPipeline, updateStartupPipelineStage } from '../services/investorService';
import DirectMessaging from './DirectMessaging';
import { Avatar } from './common/Avatar';

interface Startup {
  id: string;
  name: string;
  logo: string;
  pitch: string;
  funding: string;
  equity: string;
  valuation: string;
  revenue: string;
  growth: string;
  stage: string;
  team: number;
  industry: string[];
  aiScore: number;
  addedDate: string;
  founder: {
    id?: string;
    name: string;
    avatar: string;
    verified: boolean;
  };
  progress?: number;
  nextAction?: string;
  lastActivity?: string;
  expectedClose?: string;
  investedAmount?: string;
  investmentDate?: string;
  location?: string;
}

interface Column {
  id: string;
  title: string;
  emoji: string;
  color: string;
  count: number;
}

const ITEM_TYPE = 'STARTUP_CARD';

const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

function StartupCard({ startup, columnId, onMove, onQuickAction, onViewProfile }: {
  startup: Startup;
  columnId: string;
  onMove: (startupId: string, fromColumn: string, toColumn: string) => void;
  onQuickAction: (action: string, startup: Startup) => void;
  onViewProfile?: (startupId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const avatarText = (() => {
    const a = (startup.founder?.avatar || '').toString();
    if (a.startsWith('http') || a.includes('/uploads/')) {
      const n = (startup.founder?.name || '').toString().trim();
      return (n ? n.substring(0, 2) : '👤').toUpperCase();
    }
    return a || '👤';
  })();
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { startupId: startup.id, fromColumn: columnId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [startup.id, columnId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <motion.div
      ref={(node) => {
        drag(node);
        dragPreview(node);
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 0.95 : 1 }}
      whileHover={{ y: -4, scale: 1.01, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5 cursor-grab active:cursor-grabbing relative group transition-all duration-300"
      style={{ touchAction: 'none', zIndex: showMenu ? 40 : undefined }}
    >
      {/* Drag Handle */}
      <div
        className={`absolute top-2 left-2 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity cursor-grab active:cursor-grabbing`}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar 
            src={startup.logo} 
            name={startup.name} 
            size="lg" 
            variant="square" 
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base truncate">{startup.name}</h3>
            </div>
            <p className="text-xs text-gray-500 truncate">{startup.addedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <div className="px-2.5 py-1 rounded-full text-xs font-black text-white shadow-sm flex items-center gap-1" style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.navyBlue})` }}>
            <Sparkles className="w-3 h-3" />
            {startup.aiScore}/10
          </div>
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                {Capacitor.getPlatform() !== 'ios' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        const note = window.prompt(`Add a note about ${startup.name}:`);
                        if (note && note.trim()) {
                          onQuickAction('notes', startup);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span>Add Notes</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        const meetingDate = window.prompt(`Schedule a meeting with ${startup.founder.name} from ${startup.name}.\n\nEnter date (e.g., "Jan 30, 2026 at 2:00 PM"):`);
                        if (meetingDate && meetingDate.trim()) {
                          onQuickAction('meeting', startup);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <CalendarIcon className="w-4 h-4 text-gray-600" />
                      <span>Schedule Meeting</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        if (window.confirm(`Generate AI analysis for ${startup.name}?\n\nThis will analyze:\n• Pitch deck content\n• Market potential\n• Team strength\n• Financial projections\n• Risk assessment`)) {
                          onQuickAction('ai', startup);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="text-purple-700 font-medium">AI Analysis</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        if (window.confirm(`Create a secure deal room for ${startup.name}?\n\nThis will:\n• Set up document sharing\n• Enable team collaboration\n• Track activity and engagement\n• Provide secure access to ${startup.founder.name}`)) {
                          onQuickAction('dealroom', startup);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700 font-medium">Create Deal Room</span>
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onQuickAction('message', startup);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-gray-600" />
                  <span>Message Founder</span>
                </button>
                {Capacitor.getPlatform() !== 'ios' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      const email = window.prompt(`Share ${startup.name} deal with team member.\n\nEnter their email address:`);
                      if (email && email.trim() && email.includes('@')) {
                        onQuickAction('share', startup);
                      } else if (email && email.trim()) {
                        alert('Please enter a valid email address');
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-gray-600" />
                    <span>Share Deal</span>
                  </button>
                )}
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (window.confirm(`Are you sure you want to pass on ${startup.name}?\n\nThis will remove them from your active pipeline.`)) {
                      onMove(startup.id, columnId, 'passed');
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">Pass</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (window.confirm(`Are you sure you want to remove ${startup.name}?\n\nThis action cannot be undone.`)) {
                      onMove(startup.id, columnId, 'removed');
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium">Remove</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Pitch */}
      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{startup.pitch}</p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Funding</span>
            <span className="text-xs font-bold text-gray-700">{startup.funding}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Equity</span>
            <span className="text-xs font-bold text-gray-700">{startup.equity}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 rounded-lg">
            <Target className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stage</span>
            <span className="text-xs font-bold text-gray-700">{startup.stage}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-50 rounded-lg">
            <Users className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Team</span>
            <span className="text-xs font-bold text-gray-700">{Array.isArray(startup.team) ? startup.team.length : (startup.team || 0)}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(Array.isArray(startup.industry) ? startup.industry : []).slice(0, 3).map((tag, idx) => (
          <span key={idx} className="px-2.5 py-1 text-[10px] font-bold rounded-lg border bg-white shadow-sm" style={{ borderColor: `${brandColors.electricBlue}30`, color: brandColors.electricBlue }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Column-specific content */}
      {columnId === 'underReview' && typeof startup.progress === 'number' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Due diligence</span>
            <span>{startup.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${startup.progress}%` }}></div>
          </div>
          {startup.nextAction && (
            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {startup.nextAction}
            </p>
          )}
        </div>
      )}

      {columnId === 'negotiating' && startup.lastActivity && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-700 mb-1">{startup.lastActivity}</p>
          {startup.expectedClose && (
            <p className="text-xs font-medium" style={{ color: brandColors.navyBlue }}>
              Expected close: {startup.expectedClose}
            </p>
          )}
        </div>
      )}

      {columnId === 'invested' && startup.investedAmount && (
        <div className="mb-3 p-2 bg-green-50 rounded-lg">
          <p className="text-sm font-bold text-green-700">{startup.investedAmount} invested</p>
          <p className="text-xs text-gray-600">
            {startup.investmentDate} · {startup.equity} equity
          </p>
        </div>
      )}

      {/* Founder */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
        <Avatar 
          src={startup.founder.avatar} 
          name={startup.founder.name} 
          size="xs" 
        />
        <span className="text-xs text-gray-700">{startup.founder.name}</span>
        {startup.founder.verified && (
          <CheckCircle className="w-3 h-3 text-blue-500" />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile ? onViewProfile(startup.id) : onQuickAction('view', startup);
          }}
          className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
          style={{ 
            borderColor: brandColors.electricBlue, 
            color: 'white',
            background: brandColors.electricBlue
          }}
        >
          <Eye className="w-4 h-4" />
          View Profile
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAction('message', startup);
          }}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all hover:shadow-md active:scale-95 text-gray-600"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function DroppableColumn({
  column,
  startups,
  onMove,
  onQuickAction,
  onViewProfile,
  onBrowse
}: {
  column: Column;
  startups: Startup[];
  onMove: (startupId: string, fromColumn: string, toColumn: string) => void;
  onQuickAction: (action: string, startup: Startup) => void;
  onViewProfile?: (startupId: string) => void;
  onBrowse?: () => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { startupId: string; fromColumn: string }) => {
      if (item.fromColumn !== column.id) {
        onMove(item.startupId, item.fromColumn, column.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [column.id, onMove]);

  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[350px] px-2 sm:px-3 md:px-4"
      style={{ minHeight: 'calc(100vh - 280px)' }}
    >
      <div
        className={`rounded-2xl transition-all duration-300 h-full p-2 ${isOver && canDrop ? 'bg-indigo-50/50 shadow-inner' : 'bg-gray-50/30'
          }`}
        style={{
          borderTop: `4px solid ${column.color}`,
          borderColor: isOver && canDrop ? brandColors.electricBlue : 'transparent',
        }}
      >
        {/* Column Header */}
        <div className="mb-6 sticky top-0 py-3 z-10 px-2 flex items-center justify-between bg-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg border border-gray-100">
              {column.emoji}
            </div>
            <h2 className="font-black text-sm uppercase tracking-widest text-gray-700">
              {column.title}
            </h2>
          </div>
          <span className="px-2.5 py-1 bg-white border border-gray-100 text-gray-500 rounded-lg text-[10px] font-black shadow-sm">
            {startups.length}
          </span>
        </div>

        {/* Cards */}
        <div className="space-y-0">
          {startups.length === 0 ? (
            <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-gray-50">
                <Building2 className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-400 mb-4 max-w-[160px]">Ready for fresh opportunities?</p>
              <button
                onClick={onBrowse}
                className="px-4 py-2 bg-white border border-gray-100 shadow-sm rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:shadow-md active:scale-95"
                style={{ color: brandColors.electricBlue }}
              >
                Find Startups
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {startups.map((startup) => (
                <StartupCard
                  key={startup.id}
                  startup={startup}
                  columnId={column.id}
                  onMove={onMove}
                  onQuickAction={onQuickAction}
                  onViewProfile={onViewProfile}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

export function DealFlowPipeline({ onNavigateToDiscover, onViewProfile }: { onNavigateToDiscover?: () => void; onViewProfile?: (startupId: string) => void }) {
  const [view, setView] = useState<'kanban' | 'table' | 'calendar'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());

  const [showChat, setShowChat] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeStage, setActiveStage] = useState('interested'); // For mobile tabs
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [loading, setLoading] = useState(true);
  const [startupsByColumn, setStartupsByColumn] = useState<Record<string, Startup[]>>({
    interested: [],
    underReview: [],
    negotiating: [],
    invested: [],
    closed: []
  });

  const calendarCells = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ day: number | null; date: Date | null; isToday: boolean }> = [];

    // padding cells
    for (let i = 0; i < startDay; i++) {
      cells.push({ day: null, date: null, isToday: false });
    }

    const now = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
      cells.push({ day: d, date, isToday });
    }

    // fill to full weeks (6 rows)
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, date: null, isToday: false });
    }
    while (cells.length < 42) {
      cells.push({ day: null, date: null, isToday: false });
    }

    return cells;
  }, [currentCalendarDate]);

  // Load pipeline data from backend
  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        setLoading(true);
        console.log('Fetching investor pipeline...');
        const data = await getInvestorPipeline();
        console.log('Pipeline data received:', data);
        setStartupsByColumn(data);
      } catch (error: any) {
        console.error('Failed to fetch pipeline:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        setToastMessage(`Failed to load pipeline: ${errorMessage}`);
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPipeline();
  }, []);

  // Socket listener for real-time deal room stage updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleDealRoomStageUpdate = (data: any) => {
      console.log('Deal room stage updated:', data);
      // Refresh pipeline to get latest data
      const refreshPipeline = async () => {
        try {
          const freshData = await getInvestorPipeline();
          setStartupsByColumn(freshData);
          setToastMessage(`Pipeline updated from deal room`);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        } catch (error) {
          console.error('Failed to refresh pipeline:', error);
        }
      };
      refreshPipeline();
    };

    socket.on('dealroom_stage_updated', handleDealRoomStageUpdate);
    return () => {
      socket.off('dealroom_stage_updated', handleDealRoomStageUpdate);
    };
  }, []);

  useEffect(() => {
    const pending = localStorage.getItem('pendingChatUserId');
    if (pending && pending.trim()) {
      localStorage.removeItem('pendingChatUserId');
      setChatUserId(pending);
      setShowChat(true);
    }
  }, []);

  // Check scroll position
  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };
  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Apply the search box to the pipeline (name / founder / industry).
  const searchNeedle = searchQuery.trim().toLowerCase();
  const matchesSearch = (s: Startup) => {
    if (!searchNeedle) return true;
    const hay = [s.name, s.founder?.name, ...(s.industry || [])].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(searchNeedle);
  };
  const filteredByColumn: Record<string, Startup[]> = Object.fromEntries(
    Object.entries(startupsByColumn).map(([k, v]) => [k, (v || []).filter(matchesSearch)])
  );

  const columns: Column[] = [
    { id: 'interested', title: 'Interested', emoji: '💡', color: brandColors.electricBlue, count: filteredByColumn.interested?.length || 0 },
    { id: 'underReview', title: 'Under Review', emoji: '🔍', color: brandColors.atomicOrange, count: filteredByColumn.underReview?.length || 0 },
    { id: 'negotiating', title: 'Negotiating', emoji: '💬', color: brandColors.navyBlue, count: filteredByColumn.negotiating?.length || 0 },
    { id: 'invested', title: 'Invested', emoji: '✅', color: '#10B981', count: filteredByColumn.invested?.length || 0 },
    { id: 'closed', title: 'Closed', emoji: '⏭️', color: '#9CA3AF', count: filteredByColumn.closed?.length || 0 },
  ];

  const handleMove = async (startupId: string, fromColumn: string, toColumn: string) => {
    // Find the startup
    const startup = startupsByColumn[fromColumn].find(s => s.id === startupId);
    if (!startup) return;

    // Optimistic UI update
    setStartupsByColumn(prev => ({
      ...prev,
      [fromColumn]: prev[fromColumn].filter(s => s.id !== startupId),
      [toColumn]: [...(prev[toColumn] || []), startup],
    }));

    try {
      await updateStartupPipelineStage(startupId, toColumn);

      // Show toast
      const columnName = columns.find(c => c.id === toColumn)?.title || toColumn;
      setToastMessage(`Moved to ${columnName}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Failed to update stage:', error);
      // Revert UI on error
      const data = await getInvestorPipeline();
      setStartupsByColumn(data);
      setToastMessage('Failed to save change');
      setShowToast(true);
    }
  };

  const handleQuickAction = (action: string, startup: Startup) => {
    if (action === 'message') {
      const founderId = startup.founder?.id;
      if (!founderId) {
        setToastMessage('Founder chat is not available for this startup');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      // No longer using dummy pipeline items

      setChatUserId(founderId);
      setShowChat(true);
      return;
    }

    if (action === 'view') {
      onViewProfile?.(startup.id);
      return;
    }

    // notes / meeting / ai / dealroom / share have no backend yet. Don't fake a
    // "completed" result — tell the user it's coming so nothing is silently lost.
    const labels: Record<string, string> = {
      notes: 'Notes', meeting: 'Schedule Meeting', ai: 'AI Analysis',
      dealroom: 'Deal Room', share: 'Share Deal',
    };
    setToastMessage(`${labels[action] || action} isn't available yet — coming soon.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleExportCSV = () => {
    // File download is unsupported in the iOS WebView — bail (and never show a
    // fake "exported" toast) so we don't present a non-functional action (2.1).
    if (Capacitor.getPlatform() === 'ios') return;
    const allStartups = Object.values(startupsByColumn).flat();
    if (allStartups.length === 0) {
      setToastMessage('No data to export');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const headers = [
      'Name',
      'Stage',
      'Industry',
      'Funding',
      'Equity',
      'Valuation',
      'Revenue',
      'Growth',
      'AI Score',
      'Added Date',
    ];

    const rows = allStartups.map((s) => [
      `"${s.name}"`,
      `"${s.stage}"`,
      `"${(s.industry || []).join(', ')}"`,
      `"${s.funding}"`,
      `"${s.equity}"`,
      `"${s.valuation}"`,
      `"${s.revenue}"`,
      `"${s.growth}"`,
      String(s.aiScore ?? ''),
      `"${s.addedDate}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `deal-flow-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage('CSV exported');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleExportPDF = () => {
    if (Capacitor.getPlatform() === 'ios') return;
    const allStartups = Object.values(startupsByColumn).flat();
    if (allStartups.length === 0) {
      setToastMessage('No data to export');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Deal Flow Pipeline Report', 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);

    const tableBody = allStartups.map((s) => [
      s.name,
      s.stage,
      (s.industry || []).join(', '),
      s.funding,
      s.equity,
      s.valuation,
      String(s.aiScore ?? ''),
      s.addedDate,
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Startup', 'Stage', 'Industry', 'Funding', 'Equity', 'Valuation', 'AI Score', 'Added']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9, cellPadding: 6 },
    });

    doc.save(`deal-flow-report-${new Date().toISOString().split('T')[0]}.pdf`);

    setToastMessage('PDF exported');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const useTouch = isTouchDevice();
  const Backend = useTouch ? TouchBackend : HTML5Backend;
  const backendOptions = useTouch ? { enableMouseEvents: true } : undefined;

  return (
    <DndProvider backend={Backend} options={backendOptions as any}>
      <div className="min-h-screen bg-gray-50">
        {/* Top Control Bar */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="px-6 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-4">
                  <div className="p-2.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  Pipeline Management
                </h1>
                <p className="text-sm text-gray-400 mt-2 font-bold uppercase tracking-widest leading-none flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {Object.values(filteredByColumn).flat().length} active opportunities
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative group min-w-[320px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                  <input name="input-e0ee73"
                    type="text"
                    placeholder="Search startups, founders, industries..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none placeholder:text-gray-400 font-bold"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* View Switcher */}
                <div className="bg-gray-100/80 p-1.5 rounded-2xl flex items-center gap-1.5 border border-gray-200/50 backdrop-blur-sm shadow-inner">
                  <button
                    onClick={() => setView('kanban')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${view === 'kanban' ? 'bg-white text-blue-600 shadow-md ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Board
                  </button>
                  <button
                    onClick={() => setView('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${view === 'table' ? 'bg-white text-blue-600 shadow-md ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <TableIcon className="w-4 h-4" />
                    Table
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${view === 'calendar' ? 'bg-white text-blue-600 shadow-md ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Calendar
                  </button>
                </div>

                {/* Settings */}
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>

                {/* Add Startup */}
                <button
                  onClick={onNavigateToDiscover}
                  className="px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all hover:shadow-lg shadow-blue-500/20 active:scale-95 flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${brandColors.atomicOrange}, #ff9a44)` }}
                >
                  <Plus className="w-4 h-4" />
                  Find Deals
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your pipeline...</p>
          </div>
        ) : (
          <>
            {view === 'kanban' && (
              <div className="relative">
                {/* Scroll Navigation Buttons */}
                <div className="flex items-center justify-end gap-2 px-6 pt-4 pb-2">
                  <button
                    onClick={scrollLeft}
                    disabled={!canScrollLeft}
                    className={`p-2 rounded-lg border transition-all ${canScrollLeft
                      ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                      }`}
                    title="Scroll Left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={scrollRight}
                    disabled={!canScrollRight}
                    className={`p-2 rounded-lg border transition-all ${canScrollRight
                      ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                      }`}
                    title="Scroll Right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div
                  ref={scrollContainerRef}
                  onScroll={checkScrollButtons}
                  className="overflow-x-auto pb-8"
                >
                  <div className="flex gap-0 px-2 sm:px-2 pt-2 -mx-2 sm:mx-0" style={{ minWidth: 'max-content', paddingLeft: '8px', paddingRight: '8px' }}>
                    {columns.map((column) => (
                      <DroppableColumn onViewProfile={onViewProfile}
                        key={column.id}
                        column={column}
                        startups={filteredByColumn[column.id] || []}
                        onMove={handleMove}
                        onQuickAction={handleQuickAction}
                        onBrowse={onNavigateToDiscover}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Modal */}
            <AnimatePresence>
              {showChat && chatUserId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                  onClick={() => setShowChat(false)}
                >
                  <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white rounded-xl w-full max-w-5xl h-[85vh] max-h-[85vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DirectMessaging
                      initialUserId={chatUserId}
                      onClose={() => setShowChat(false)}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table View */}
            {view === 'table' && (
              <div className="p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Actions Bar */}
                  <div className="border-b border-gray-200 p-4 flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm" onClick={handleExportCSV}>
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="w-12 px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10">
                              <input name="input-ee5a10" type="checkbox" className="rounded" />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-60 sticky left-12 bg-gray-50 z-10">
                              Startup
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-36">
                              Stage
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-24">
                              AI Score
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-28">
                              Funding Ask
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-20">
                              Equity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-40">
                              Industry
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-28">
                              Added Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-24">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {Object.entries(filteredByColumn).flatMap(([columnId, startups]) =>
                            startups.map((startup) => (
                              <tr key={startup.id} className="hover:bg-gray-50">
                                <td className="w-12 px-3 py-3 sticky left-0 bg-white z-10">
                                  <input name="input-bfa2ce" type="checkbox" className="rounded" />
                                </td>
                                <td className="px-4 py-3 sticky left-12 bg-white z-10">
                                  <div className="flex items-center gap-3">
                                    <Avatar 
                                      src={startup.logo} 
                                      name={startup.name} 
                                      size="md" 
                                      variant="square" 
                                    />
                                    <div className="min-w-[120px]">
                                      <div className="font-medium text-sm whitespace-nowrap">{startup.name}</div>
                                      <div className="text-xs text-gray-500 whitespace-nowrap">{startup.founder?.name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <select name="select-89efd4"
                                    className="text-sm border border-gray-300 rounded-lg px-2 py-1 min-w-[140px]"
                                    value={columnId}
                                    onChange={(e) => {
                                      const nextStage = e.target.value;
                                      if (nextStage === columnId) return;
                                      handleMove(startup.id, columnId, nextStage);
                                    }}
                                  >
                                    <option value="interested">💡 Interested</option>
                                    <option value="underReview">🔍 Under Review</option>
                                    <option value="negotiating">💬 Negotiating</option>
                                    <option value="invested">✅ Invested</option>
                                    <option value="closed">⏭️ Closed</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded-lg text-xs font-bold text-white whitespace-nowrap" style={{ backgroundColor: brandColors.electricBlue }}>
                                    {startup.aiScore}/10
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{startup.funding}</td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">{startup.equity}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1 min-w-[150px]">
                                    {startup.industry.slice(0, 2).map((tag, idx) => (
                                      <span key={idx} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{startup.addedDate}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="View profile"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onViewProfile ? onViewProfile(startup.id) : handleQuickAction('view', startup);
                                      }}
                                    >
                                      <Eye className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Message founder"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickAction('message', startup);
                                      }}
                                    >
                                      <MessageCircle className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Result count */}
                  <div className="border-t border-gray-200 px-4 py-3">
                    <p className="text-sm text-gray-600">
                      Showing {Object.values(filteredByColumn).flat().length} results
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar View */}
            {view === 'calendar' && (
              <div className="p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">
                      {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() =>
                          setCurrentCalendarDate(
                            (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
                          )
                        }
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                        onClick={() => setCurrentCalendarDate(new Date())}
                      >
                        Today
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() =>
                          setCurrentCalendarDate(
                            (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
                          )
                        }
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-sm font-bold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                    {calendarCells.map((cell, i) => (
                      <div
                        key={i}
                        className={`border border-gray-200 rounded-lg p-2 min-h-24 ${cell.day ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'}`}
                      >
                        {cell.day && (
                          <div
                            className={`text-sm font-medium mb-2 ${
                              cell.isToday
                                ? 'text-white bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center'
                                : ''
                            }`}
                          >
                            {cell.day}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Modal */}
        {showActionModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8" style={{ color: brandColors.electricBlue }} />
                </div>
                <h3 className="text-xl font-bold mb-2">Processing Action</h3>
                <p className="text-gray-600 mb-4">
                  {actionType} for {selectedStartup?.name}
                </p>
                <div className="flex justify-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: brandColors.electricBlue + '20' }}>
                      <Settings className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Pipeline Settings</h2>
                      <p className="text-sm text-gray-600">Customize your deal flow experience</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {/* Display Settings */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Eye className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                        Display Settings
                      </h3>
                      <div className="space-y-3 ml-7">
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-sm font-medium">Show AI Scores</span>
                          <input name="input-4e35b9" type="checkbox" defaultChecked className="rounded" style={{ accentColor: brandColors.electricBlue }} />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-sm font-medium">Show Founder Avatars</span>
                          <input name="input-bd2ee5" type="checkbox" defaultChecked className="rounded" style={{ accentColor: brandColors.electricBlue }} />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-sm font-medium">Compact Card View</span>
                          <input name="input-dffed3" type="checkbox" className="rounded" style={{ accentColor: brandColors.electricBlue }} />
                        </label>
                      </div>
                    </div>

                    {/* Column Customization */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                        Column Customization
                      </h3>
                      <div className="space-y-2 ml-7">
                        {columns.map((column) => (
                          <label key={column.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span>{column.emoji}</span>
                              <span className="text-sm font-medium">{column.title}</span>
                            </div>
                            <input name="input-7a877c" type="checkbox" defaultChecked className="rounded" style={{ accentColor: brandColors.electricBlue }} />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Notifications */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Bell className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                        Notifications
                      </h3>
                      <div className="space-y-3 ml-7">
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-sm font-medium">New startup added</span>
                          <input name="input-bebbe1" type="checkbox" defaultChecked className="rounded" style={{ accentColor: brandColors.electricBlue }} />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-sm font-medium">Stage changes</span>
                          <input name="input-e23d2d" type="checkbox" defaultChecked className="rounded" style={{ accentColor: brandColors.electricBlue }} />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-sm font-medium">Task reminders</span>
                          <input name="input-fac4f6" type="checkbox" defaultChecked className="rounded" style={{ accentColor: brandColors.electricBlue }} />
                        </label>
                      </div>
                    </div>

                    {/* Sorting & Filtering */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Filter className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                        Default Sorting
                      </h3>
                      <div className="ml-7">
                        <select name="select-b4c273" className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Most Recent First</option>
                          <option>Highest AI Score</option>
                          <option>Funding Amount (High to Low)</option>
                          <option>Funding Amount (Low to High)</option>
                          <option>Alphabetical (A-Z)</option>
                        </select>
                      </div>
                    </div>

                    {/* Data Export */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Download className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                        Export Options
                      </h3>
                      <div className="space-y-2 ml-7">
                        <button 
                          onClick={handleExportCSV}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <span>Export as CSV</span>
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                        <button 
                          onClick={handleExportPDF}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <span>Export as PDF Report</span>
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setToastMessage('Settings saved successfully!');
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                    }}
                    className="px-6 py-2 rounded-lg text-white text-sm font-bold hover:scale-105 transition-transform"
                    style={{ backgroundColor: brandColors.electricBlue }}
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}
