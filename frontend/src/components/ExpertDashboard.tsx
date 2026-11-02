import { Capacitor } from '@capacitor/core';
import { brandColors } from '../utils/colors';
import { safeExternalHref } from '../utils/safeUrl';
import logoImage from '../assets/logo.png';
import squareLogo from '../assets/logo-square.png';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { RoleSwitcher, UserRole } from './RoleSwitcher';
import { ProfileCreationModal } from './ProfileCreationModal';
import { ProfileCreationCard } from './ProfileCreationCard';
import { getCurrentUser, logout, getProfilesCreated, fetchMe, setCurrentUser as persistCurrentUser } from '../services/authService';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Headphones,
  Newspaper,
  MessageCircle,
  Sparkles,
  BarChart3,
  User,
  Settings,
  Menu,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  TrendingUp,
  Award,
  Star,
  Plus,
  Edit,
  CheckCircle,
  BadgeCheck,
  Target,
  XCircle,
  Eye,
  ThumbsUp,
  LogOut,
  Bookmark,
  BookOpen,
  Rocket
} from 'lucide-react';
import { DiscoverInvestors } from './DiscoverInvestors';
import { DiscoverStartups } from './DiscoverStartups';
import { EnhancedHomeFeed } from './EnhancedHomeFeed';
import { AccountEngagementCard } from './AccountEngagementCard';
import { DashboardWidgets } from './dashboard/DashboardQuickMenu';
import { useIsBelowLg } from '../hooks/useBreakpoint';
import { SavedProfilesList } from './SavedProfilesList';
import { SavedStartupsList } from './SavedStartupsList';
import { NotificationsDropdown } from './NotificationsDropdown';
import { MyClientsPage } from './MyClientsPage';
import { SchedulePage } from './SchedulePage';
import { EarningsPage } from './EarningsPage';
import { ContentStudioPage } from './ContentStudioPage';
import { EventsPage } from './EventsPage';
import { MessagingPage } from './MessagingPage';
import CommunitiesPage from './CommunitiesPage';
import { PodcastsPage } from './PodcastsPage';
import { StartupResourcesPage } from './StartupResourcesPage';
import { NewsFeedPage } from './NewsFeedPage';
import { IgnishaAIDashboard } from './IgnishaAIDashboard';
import { VerificationBanner } from './VerificationBanner';
import { SettingsPage } from './SettingsPage';
import { AIMatchedStartupsPage } from './AIMatchedStartupsPage';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { ProfilePage } from './ProfilePage';

interface SidebarItem {
  icon: any;
  label: string;
  badge?: number;
}

interface Session {
  id: string;
  startup: string;
  founder: string;
  time: string;
  duration: string;
  type: string;
  status: string;
  meetingLink: string;
}

interface BookingRequest {
  id: string;
  founder: string;
  topic: string;
  time: string;
  bookingData: any;
}

interface Client {
  id: number;
  name: string;
  startup: string;
  industry: string;
  stage: string;
  matchScore: number;
  status: 'pending' | 'active' | 'completed';
}

interface Post {
  id: string;
  title: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate?: string;
  views?: number;
  likes?: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon: any;
}

export function ExpertDashboard() {
  const isCompact = useIsBelowLg();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'Home';
    return localStorage.getItem('dashboard:expert:activeTab') || 'Home';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('expert');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  // iOS ships fully functional with no admin-gated verification wall (Apple
  // Guideline 2.1/4.2): an unverified reviewer account must still reach the app.
  const [isVerified, setIsVerified] = useState(Capacitor.getPlatform() === 'ios');
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [profilesCreated, setProfilesCreated] = useState({ founder: false, expert: false, investor: false });
  const [profileCreationModal, setProfileCreationModal] = useState<'expert' | 'investor' | null>(null);
  const [savedTab, setSavedTab] = useState<'Posts' | 'Profiles' | 'Startups'>('Posts');
  const [pendingClients, setPendingClients] = useState<any[]>([]);

  const [contentPosts, setContentPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [earningsStats, setEarningsStats] = useState<any>(null);
  const [messagingTargetUserId, setMessagingTargetUserId] = useState<string | undefined>(undefined);

  const { hasFeature, userPlan } = useFeatureAccess();

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const { tab, messageUserId } = e.detail;
      if (messageUserId) setMessagingTargetUserId(String(messageUserId));
      if (tab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('navigateDashboard', handleNavigate);
    return () => window.removeEventListener('navigateDashboard', handleNavigate);
  }, []);

  const completeVerification = () => {
    sessionStorage.setItem('profileCompletionRole', 'expert');
    window.location.hash = '#complete-profile';
  };

  const dismissVerificationBanner = (hours: number) => {
    const until = new Date();
    until.setHours(until.getHours() + hours);
    
    // In a real app, save this to the backend
    if (currentUser) {
      const updatedUser = { ...currentUser, verificationBannerDismissedUntil: until.toISOString() };
      setCurrentUser(updatedUser);
      // Optional: persist to authService/localStorage
    }
    setShowVerificationBanner(false);
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setIsVerified(Capacitor.getPlatform() === 'ios' || !!user?.isVerified);

    if (user?.verificationBannerDismissedUntil) {
      const dismissedUntil = new Date(user.verificationBannerDismissedUntil);
      const now = new Date();
      if (dismissedUntil.getTime() > now.getTime()) {
        setShowVerificationBanner(false);
      }
    }

    // Sync with backend to get latest verification status
    (async () => {
      try {
        const me = await fetchMe();
        if (me) {
          persistCurrentUser(me);
          setCurrentUser(me);
          setIsVerified(Capacitor.getPlatform() === 'ios' || !!me.isVerified);
        }
      } catch (err) {
        console.error('Failed to sync user state:', err);
      }
    })();
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard:expert:activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchProfilesCreatedData();
  }, []);

  const fetchProfilesCreatedData = async () => {
    try {
      const data = await getProfilesCreated();
      setProfilesCreated(data);
    } catch (error) {
      console.error('Failed to fetch profiles created:', error);
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoadingPosts(true);
      try {
        const response = await api.get('/knowledge');
        setContentPosts(response.data.map((item: any) => ({
          id: item._id,
          title: item.title,
          status: item.status,
          views: item.views || 0,
          likes: item.likes?.length || 0,
        })));
      } catch (error) {
        console.error('Failed to fetch posts', error);
        setContentPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    if (currentUser) {
      fetchPosts();
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        const response = await api.get('/bookings');

        // Pending bookings for requests
        const pending = response.data.filter((booking: any) => booking.status === 'pending');
        setBookingRequests(pending.map((booking: any) => ({
          id: booking._id,
          founder: booking.founder?.name || 'Unknown Founder',
          topic: booking.topic,
          time: new Date(booking.date).toLocaleDateString() + ' ' + booking.startTime,
          bookingData: booking
        })));

        // Confirmed bookings for schedule
        const confirmed = response.data.filter((booking: any) => booking.status === 'confirmed');
        setUpcomingSessions(confirmed.map((booking: any) => ({
          id: booking._id,
          startup: (booking.founder?.name || 'Founder') + "'s Startup",
          founder: booking.founder?.name || 'Unknown Founder',
          time: new Date(booking.date).toLocaleDateString() + ', ' + booking.startTime,
          duration: `${booking.duration} min`,
          type: 'video',
          status: 'upcoming',
          meetingLink: booking.meetingLink || 'https://meet.google.com/new'
        })));
      } catch (error) {
        console.error('Failed to fetch bookings', error);
        setBookingRequests([]);
        setUpcomingSessions([]);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookings();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data.map((notif: any) => ({
          id: notif._id,
          type: notif.type || 'general',
          title: notif.title,
          message: notif.message,
          time: new Date(notif.createdAt).toLocaleDateString(),
          unread: !notif.read,
          icon: Calendar, // Default icon, could be mapped by type
        })));
      } catch (error) {
        console.error('Failed to fetch notifications', error);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const fetchEarningsStats = async () => {
      try {
        const response = await api.get('/earnings/expert');
        setEarningsStats(response.data.stats);
      } catch (error) {
        console.error('Failed to fetch expert earnings stats:', error);
      }
    };

    fetchEarningsStats();
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    // Reset view to prevent unauthorized data fetching from previous role's components
    setActiveTab('Home');
    console.log(`Switching to ${newRole} dashboard`);
  };

  const handleMessageUser = (userId: string) => {
    if (!userId) return;
    setMessagingTargetUserId(userId);
    setActiveTab('Messages');
  };

  const sidebarItems: SidebarItem[] = [
    { icon: Home, label: 'Home' },
    { icon: Users, label: 'My Clients' },
    // "Explore Startups" is a Coming-Soon placeholder — hidden on iOS (Apple Guideline 2.1)
    ...(Capacitor.getPlatform() !== 'ios' ? [{ icon: Rocket, label: 'Explore Startups' }] : []),
    { icon: Calendar, label: 'Schedule' },
    { icon: DollarSign, label: 'Earnings' },
    { icon: FileText, label: 'Content Studio' },
    { icon: Calendar, label: 'Events' },
    { icon: Headphones, label: 'Podcasts' },
    { icon: BookOpen, label: 'Startup Resources' },
    { icon: Newspaper, label: 'News' },
    { icon: MessageCircle, label: 'Messages' },
    { icon: Users, label: 'Communities' },
    { icon: Sparkles, label: 'Ignisha AI' },
    { icon: Bookmark, label: 'Saved Items' },
    { icon: User, label: 'Profile' },
    { icon: Settings, label: 'Settings' },
  ];

  const unreadNotifications = notifications.filter((n: any) => n.unread).length;

  const revenueStats = {
    thisMonth: earningsStats?.thisMonth || 0,
    lastMonth: earningsStats?.lastMonth || 0,
    pendingConsultations: bookingRequests.length, // pending = awaiting-accept requests
    totalMentees: 0,
    avgRating: 0,
    totalSessions: upcomingSessions.length,
    successes: earningsStats?.successes ?? 0,
  };

  // Safe month-over-month growth: avoid the "+49900%" artifact when last month
  // was 0, and don't force a leading "+" on negative growth.
  const growthPct = revenueStats.lastMonth > 0
    ? Math.round(((revenueStats.thisMonth - revenueStats.lastMonth) / revenueStats.lastMonth) * 100)
    : (revenueStats.thisMonth > 0 ? 100 : 0);
  const growthLabel = `${growthPct >= 0 ? '+' : ''}${growthPct}% from last month`;

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isSidebarCollapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden xl:block fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-40 flex flex-col overflow-hidden"
      >
        <div className="p-6 flex items-center justify-center flex-shrink-0">
          {isSidebarCollapsed ? (
            <img
              src={squareLogo}
              alt="NextIgnition"
              className="w-10 h-10 cursor-pointer"
              onClick={() => window.location.hash = ''}
            />
          ) : (
            <img
              src={logoImage}
              alt="NextIgnition"
              className="h-8 cursor-pointer mr-auto"
              onClick={() => window.location.hash = ''}
            />
          )}
        </div>

        <nav className="px-3 flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 160px)' }}>
          {sidebarItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveTab(item.label);
              }}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-1 transition-all relative group ${activeTab === item.label
                ? 'bg-gradient-to-r text-white'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
              style={activeTab === item.label ? {
                background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
              } : {}}
              title={isSidebarCollapsed ? item.label : ''}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isSidebarCollapsed && item.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {/* Tooltip on hover when collapsed */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                  {item.badge && ` (${item.badge})`}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Toggle button at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      {typeof document !== 'undefined' && isSidebarOpen ? createPortal(
        <div className="xl:hidden fixed inset-0 bg-black/50" style={{ zIndex: 99999 }} onClick={() => setIsSidebarOpen(false)}>
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-white flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 100000, WebkitOverflowScrolling: 'touch' }}
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-6 flex items-center justify-between border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <img src={logoImage} alt="NextIgnition" className="h-8 w-8 object-contain shrink-0" />
                <span className="text-lg font-bold text-gray-900 tracking-tight truncate">NextIgnition</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Mobile Role Switcher */}
              <div className="px-3 pt-4 pb-3 border-b border-gray-200 bg-white">
                <RoleSwitcher
                  currentRole={currentRole}
                  onRoleChange={(role) => {
                    handleRoleChange(role);
                    setIsSidebarOpen(false);
                  }}
                  isMobile={true}
                />
              </div>

              <nav className="px-3 pt-4 pb-8">
                {sidebarItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveTab(item.label);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${activeTab === item.label
                      ? 'bg-gradient-to-r text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    style={activeTab === item.label ? {
                      background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                    } : {}}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Logout button in Mobile Sidebar */}
              <div className="px-3 pb-8 border-t border-gray-100 pt-4 mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all font-bold"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="flex-1 text-left font-medium text-sm">Logout</span>
                </button>
              </div>
            </div>
          </motion.aside>
        </div>,
        document.body
      ) : null}

      {/* Main Content */}
      <main className={`flex-1 min-h-0 overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'xl:ml-20' : 'xl:ml-64'} ${['Ignisha AI'].includes(activeTab) ? 'pt-[env(safe-area-inset-top)]' : ''} flex flex-col`}>
        {/* Verification removed — hard lock is inside the content area below */}

        {/* Top Header */}
        {!['Ignisha AI'].includes(activeTab) && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] pt-[env(safe-area-inset-top)]">
            <div className="px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <button
                  className="xl:hidden p-2 -ml-2 hover:bg-gray-50 rounded-xl flex-shrink-0 transition-colors"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base sm:text-lg font-bold truncate flex items-center gap-2">
                    {activeTab === 'Home' ? `Welcome back, ${currentUser?.name || 'Expert'}!` : activeTab}
                    {activeTab === 'Home' && isVerified && (
                      <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 ml-1" />
                    )}
                  </h1>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block truncate">You have {upcomingSessions.length} upcoming session{upcomingSessions.length === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                {/* Desktop Role Switcher */}
                <div className="hidden xl:block">
                  <RoleSwitcher
                    currentRole={currentRole}
                    onRoleChange={handleRoleChange}
                  />
                </div>
                {/* Requests & Stats Button */}
                <button
                  onClick={() => setIsStatsModalOpen(!isStatsModalOpen)}
                  className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  {bookingRequests.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-xl transition-all border border-red-100/50 active:scale-95 shadow-sm"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Logout</span>
                </button>
                <button 
                  onClick={() => setActiveTab('Profile')} 
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0 active:scale-95 transition-transform relative"
                >
                  {currentUser?.avatar ? (
                    <>
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
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
                      <div className="hidden items-center justify-center w-full h-full text-white text-xs sm:text-sm">
                        {currentUser?.name ? Array.from(currentUser.name.split(' ').map((n: string) => Array.from(n)[0]).join('')).slice(0, 2).join('').toUpperCase() : 'DJ'}
                      </div>
                    </>
                  ) : (
                    currentUser?.name ? Array.from(currentUser.name.split(' ').map((n: string) => Array.from(n)[0]).join('')).slice(0, 2).join('').toUpperCase() : 'DJ'
                  )}
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Notifications Dropdown */}
        <NotificationsDropdown
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          userRole="expert"
        />

        <div className={`flex-1 min-h-0 relative ${['Communities', 'Ignisha AI', 'Messages', 'Events'].includes(activeTab) ? 'overflow-hidden flex flex-col' : (!isVerified && !['Profile', 'Settings'].includes(activeTab) ? 'overflow-hidden' : 'overflow-y-auto')}`}>
          {/* Hard lock overlay for unverified experts */}
          {!isVerified && !['Profile', 'Settings'].includes(activeTab) && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-50/95 backdrop-blur-md p-4">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                  <XCircle className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-3">Expert Approval Required</h2>
                {currentUser?.verificationStatus === 'pending' ? (
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    Your expert application is <strong>under review</strong>. Our team will verify your background and notify you within 24 hours once approved.
                  </p>
                ) : (
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    To protect our community, all expert accounts are reviewed before getting full access. An admin will approve your account shortly.
                  </p>
                )}

                {currentUser?.linkedInUrl ? (
                  <div className="w-full mb-6">
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-semibold text-green-700">LinkedIn URL submitted</span>
                    </div>
                    <a href={safeExternalHref(currentUser.linkedInUrl)} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sm text-blue-600 hover:underline truncate">{currentUser.linkedInUrl}</a>
                    <p className="text-xs text-gray-500 mt-2">Your LinkedIn is being reviewed by our team.</p>
                  </div>
                ) : (
                  <div className="w-full mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Submit your LinkedIn profile URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/your-profile"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        id="expert-linkedin-url-input"
                      />
                      <button
                        onClick={async () => {
                          const input = document.getElementById('expert-linkedin-url-input') as HTMLInputElement;
                          const url = input?.value?.trim();
                          if (!url) { toast.error('Please enter your LinkedIn URL'); return; }
                          if (!url.includes('linkedin.com/in/') && !url.includes('linkedin.com/company/')) {
                            toast.error('Invalid LinkedIn URL. Must contain linkedin.com/in/ or linkedin.com/company/');
                            return;
                          }
                          try {
                            const api = (await import('../services/api')).default;
                            const res = await api.post('/verification/linkedin-url', { linkedInUrl: url });
                            if (res.data.success) {
                              toast.success('LinkedIn URL submitted! We will verify you shortly.');
                              const me = await fetchMe();
                              if (me) { persistCurrentUser(me); setCurrentUser(me); }
                            }
                          } catch (err: any) {
                            toast.error(err?.response?.data?.error || 'Failed to submit LinkedIn URL');
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        Submit
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-left">One-time submission. Your LinkedIn will be reviewed by our admin team.</p>
                  </div>
                )}

                <div className="w-full bg-orange-50 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-sm font-bold text-orange-700 mb-2">While you wait, you can:</p>
                  <ul className="text-sm text-orange-600 space-y-1">
                    <li>✓ Complete your <button onClick={() => setActiveTab('Profile')} className="underline font-semibold">Profile</button></li>
                    <li>✓ Update your <button onClick={() => setActiveTab('Settings')} className="underline font-semibold">Settings</button></li>
                  </ul>
                </div>
                <p className="text-xs text-gray-400">Need help? <a href="#help-support" className="text-orange-500 font-bold hover:underline">Contact Support</a></p>
                <p className="text-xs text-gray-400 mt-2">Already a Founder? Use the <strong>role switcher</strong> in the top bar ↑ to switch roles.</p>
              </div>
            </div>
          )}
          {/* Conditional Tab Content */}
          {activeTab === 'Home' && (
            <div className="space-y-6">
              <DashboardWidgets compact={isCompact} label="Dashboard">
              {/* Profile Creation Section */}
              {/* Note: only the investor profile can be created inline from here
                  (ProfileCreationModal supports expert/investor). Founder profiles
                  go through the role-application onboarding, so no founder card is
                  shown here to avoid a dead "Create" button. */}
              {!profilesCreated.investor ? (
                <div className="px-4 mb-8 mt-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 sm:mb-6">Expand Your Profile</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileCreationCard
                      type="investor"
                      isCreated={profilesCreated.investor}
                      onCreateClick={() => setProfileCreationModal('investor')}
                    />
                  </div>
                </div>
              ) : null}

              {/* Expert Dashboard Widgets */}
              <div className="px-4 md:px-6">
                {/* Revenue Dashboard Widget */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white col-span-2 shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-white/80 text-sm mb-1">Earnings This Month</p>
                        <h2 className="text-3xl font-bold">${revenueStats.thisMonth.toLocaleString()}</h2>
                      </div>
                      <DollarSign className="w-12 h-12 text-white/40" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      <span>{growthLabel}</span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                  >
                    <Clock className="w-8 h-8 text-blue-500 mb-3" />
                    <div className="text-2xl font-bold mb-1">{revenueStats.pendingConsultations}</div>
                    <div className="text-sm text-gray-600">Pending Bookings</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                  >
                    <Users className="w-8 h-8 text-orange-500 mb-3" />
                    <div className="text-2xl font-bold mb-1">{revenueStats.totalMentees}</div>
                    <div className="text-sm text-gray-600">Active Mentees</div>
                  </motion.div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm"
                  >
                    <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                    <div className="text-xl md:text-2xl font-bold">{revenueStats.avgRating}</div>
                    <div className="text-[10px] md:text-xs text-gray-500 uppercase font-semibold">Avg Rating</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm"
                  >
                    <Video className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-xl md:text-2xl font-bold">{revenueStats.totalSessions}</div>
                    <div className="text-[10px] md:text-xs text-gray-500 uppercase font-semibold">Sessions</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm"
                  >
                    <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <div className="text-xl md:text-2xl font-bold">{revenueStats.successes}</div>
                    <div className="text-[10px] md:text-xs text-gray-500 uppercase font-semibold">Successes</div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Today's Schedule */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Today's Schedule</h3>
                      <button 
                        onClick={() => setActiveTab('Schedule')}
                        className="text-sm text-blue-600 font-bold hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-4">
                      {upcomingSessions.length > 0 ? upcomingSessions.map((session, index) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                              {(session.founder || '?').charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">{session.startup}</h4>
                              <p className="text-xs text-gray-500">{session.time} · {session.duration}</p>
                            </div>
                          </div>
                          <a
                            href={safeExternalHref(session.meetingLink)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
                          >
                            Join
                          </a>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 text-center py-4 italic">No sessions scheduled for today</p>
                      )}
                    </div>
                  </motion.div>

                </div>
              </div>

              {/* Account Engagement (LinkedIn-style) */}
              <AccountEngagementCard className="px-4 mb-4" />
              </DashboardWidgets>

              <EnhancedHomeFeed userType="expert" />
            </div>
          )}

          {/* Saved Items Tab */}
          {activeTab === 'Saved Items' && (
            <div className="p-4 md:p-6 h-full flex flex-col">
              <div className="mx-4 lg:mx-[24px] mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Bookmark className="w-6 h-6 text-blue-600" />
                  Saved Items
                </h2>
                <p className="text-gray-600 text-sm">View all the profiles and posts you've bookmarked across the platform.</p>
              </div>

              {/* Sub-tabs for Saved Items */}
              <div className="flex gap-4 mx-4 lg:mx-[24px] mb-6 border-b border-gray-200">
                {['Posts', 'Profiles', 'Startups'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSavedTab(tab as any)}
                    className={`pb-3 text-sm font-bold transition-all relative ${
                      savedTab === tab ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                    {savedTab === tab && (
                      <motion.div
                        layoutId="savedTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-4 lg:px-[24px]">
                {savedTab === 'Posts' ? (
                  <EnhancedHomeFeed
                    userType="expert"
                    initialFilter="Saved"
                  />
                ) : savedTab === 'Profiles' ? (
                  <SavedProfilesList onMessage={handleMessageUser} />
                ) : (
                  <SavedStartupsList />
                )}
              </div>
            </div>
          )}

          {activeTab === 'My Clients' && <MyClientsPage onMessageUser={handleMessageUser} />}

          {activeTab === 'Schedule' && <SchedulePage />}

          {activeTab === 'Earnings' && <EarningsPage />}

          {activeTab === 'Content Studio' && <ContentStudioPage />}

          {activeTab === 'Events' && <EventsPage userRole="expert" onBack={() => setActiveTab('Home')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader />}

          {activeTab === 'Messages' && (
            <MessagingPage initialUserId={messagingTargetUserId} onBack={() => setActiveTab('Home')} />
          )}

          {activeTab === 'Communities' && <CommunitiesPage userRole="expert" userId={currentUser?.id || 1} onBack={() => setActiveTab('Home')} onMenuClick={() => setIsSidebarOpen(true)} />}

          {activeTab === 'Podcasts' && <PodcastsPage userRole="expert" onBack={() => setActiveTab('Home')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} />}

          {/* Startup Resources Tab */}
          {activeTab === 'Startup Resources' && (
            <StartupResourcesPage userRole="expert" onBack={() => setActiveTab('Home')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} />
          )}

          {/* News Tab */}
          {activeTab === 'News' && <NewsFeedPage userRole="expert" onBack={() => setActiveTab('Home')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader />}

          {/* Ignisha AI Tab */}
          {activeTab === 'Ignisha AI' && <IgnishaAIDashboard userRole="expert" onBack={() => setActiveTab('Home')} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} onMessageUser={handleMessageUser} />}

          {/* Profile View */}
          {activeTab === 'Profile' && (
            <ProfilePage 
              userRole="expert" 
              onNavigateToSettings={() => setActiveTab('Settings')} 
              onBack={() => setActiveTab('Home')}
            />
          )}

          {/* Settings View */}
          {activeTab === 'Settings' && <SettingsPage userRole="expert" onBack={() => setActiveTab('Home')} hideMobileHeader={true} />}

          {/* AI Matched Startups View */}
          {activeTab === 'AI Matched Startups' && <AIMatchedStartupsPage onBack={() => setActiveTab('Home')} />}


          {/* Explore Startups View */}
          {activeTab === 'Explore Startups' && <DiscoverStartups />}
        </div>

      </main>

      {/* Stats & Requests Modal Popup */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={() => setIsStatsModalOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold">Stats & Requests</h2>
              <button
                onClick={() => setIsStatsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Booking Requests */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Booking Requests</h3>
                  <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {bookingRequests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {bookingRequests.map((request) => (
                    <div key={request.id} className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-bold text-sm mb-1">{request.founder}</h4>
                      <p className="text-xs text-gray-600 mb-2">{request.topic}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <Clock className="w-3 h-3" />
                        {request.time}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/bookings/${request.bookingData._id}/status`, { status: 'cancelled' });
                              setBookingRequests(prev => prev.filter(r => r.id !== request.id));
                            } catch (error) {
                              console.error('Failed to decline booking', error);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-white transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/bookings/${request.bookingData._id}/status`, { status: 'confirmed' });
                              setBookingRequests(prev => prev.filter(r => r.id !== request.id));
                            } catch (error) {
                              console.error('Failed to approve booking', error);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                          style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Insights */}
              <div className="mb-6">
                <h3 className="font-bold mb-4">This Week's Performance</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Session Completion</span>
                      <span className="text-sm font-bold text-blue-600">{(revenueStats.totalSessions > 0) ? '100' : '0'}%</span>
                    </div>
                    <div className="bg-white/60 rounded-full h-2">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: (revenueStats.totalSessions > 0) ? '100%' : '0%' }} />
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Total Mentees</span>
                      <span className="text-sm font-bold text-orange-600">{revenueStats.totalMentees}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span>{growthLabel.replace(' from last month', ' growth this month')}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Expert Rating</span>
                      <span className="text-sm font-bold text-green-600">{revenueStats.avgRating} / 5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-4 h-4 ${star <= Math.round(revenueStats.avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievement Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 text-white text-center"
              >
                <Award className="w-12 h-12 mx-auto mb-3" />
                <h4 className="font-bold mb-1">Your Expert Profile</h4>
                <p className="text-sm text-white/80 mb-3">Keep mentoring founders to grow your reputation.</p>
                <button
                  onClick={() => { setActiveTab('Profile'); setIsStatsModalOpen(false); }}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors"
                >
                  View Profile
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {(
        <nav
          className="xl:hidden flex-shrink-0 bg-white border-t border-gray-200 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
          style={{ zIndex: 500 }}
        >
          <div className="relative">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {/* Home */}
            <button
              onClick={() => setActiveTab('Home')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${activeTab === 'Home' ? 'text-blue-500' : 'text-gray-600'
                }`}
            >
              <Home className="w-6 h-6" fill={activeTab === 'Home' ? 'currentColor' : 'none'} />
              <span className="text-xs font-medium">Home</span>
            </button>

            {/* My Clients */}
            <button
              onClick={() => setActiveTab('My Clients')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${activeTab === 'My Clients' ? 'text-blue-500' : 'text-gray-600'
                }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs font-medium">Clients</span>
            </button>

            {/* Ignisha AI - Center Elevated Button */}
            <button
              onClick={() => setActiveTab('Ignisha AI')}
              className="flex flex-col items-center justify-center relative"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`absolute -top-7 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all ${activeTab === 'Ignisha AI'
                  ? 'bg-gradient-to-br from-purple-600 via-blue-600 to-orange-500'
                  : 'bg-gradient-to-br from-purple-500 via-blue-500 to-orange-400'
                  }`}
              >
                <Sparkles className="w-6 h-6 text-white" />
                {activeTab === 'Ignisha AI' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -inset-1 bg-gradient-to-br from-purple-600 via-blue-600 to-orange-500 rounded-2xl blur-md opacity-50 -z-10"
                  />
                )}
              </motion.div>
              <span className={`text-[10px] font-bold mt-9 transition-colors ${activeTab === 'Ignisha AI'
                ? 'bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent'
                : 'text-gray-600'
                }`}>
                Ignisha
              </span>
            </button>

            {/* Messages */}
            <button
              onClick={() => setActiveTab('Messages')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg relative transition-colors ${activeTab === 'Messages' ? 'text-blue-500' : 'text-gray-600'
                }`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-medium">Messages</span>
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveTab('Profile')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${activeTab === 'Profile' ? 'text-blue-500' : 'text-gray-600'
                }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </div>
      </nav>
      )}

      {/* Profile Creation Modal */}
      {profileCreationModal && (
        <ProfileCreationModal
          isOpen={profileCreationModal !== null}
          profileType={profileCreationModal}
          onClose={() => setProfileCreationModal(null)}
          onSuccess={() => {
            fetchProfilesCreatedData();
            setProfileCreationModal(null);
          }}
        />
      )}
    </div>
  );
}