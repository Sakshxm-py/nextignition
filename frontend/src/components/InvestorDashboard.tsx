import { Capacitor } from '@capacitor/core';
import { AIPortfolioInsights } from './AIPortfolioInsights';
import { EnhancedHomeFeed } from './EnhancedHomeFeed';
import { AccountEngagementCard } from './AccountEngagementCard';
import { DashboardWidgets } from './dashboard/DashboardQuickMenu';
import { useIsBelowLg } from '../hooks/useBreakpoint';
import { ProfilePage } from './ProfilePage';
import { SavedProfilesList } from './SavedProfilesList';
import { SettingsPage } from './SettingsPage';
import CommunitiesPage from './CommunitiesPage';
import { MessagingPage } from './MessagingPage';
import { FundingPortalInvestor } from './FundingPortalInvestor';
import { DealRoomPage } from './DealRoomPage';
import { EventsPage } from './EventsPage';
import { PodcastsPage } from './PodcastsPage';
import { StartupResourcesPage } from './StartupResourcesPage';
import { NewsFeedPage } from './NewsFeedPage';
import { NotificationsDropdown } from './NotificationsDropdown';
import { IgnishaAI } from './IgnishaAI';
import { EnhancedIgnishaAI } from './EnhancedIgnishaAI';
import { IgnishaAIDashboard } from './IgnishaAIDashboard';
import { VerificationBanner } from './VerificationBanner';
import { DealFlowPipeline } from './DealFlowPipeline';
import { InvestorAnalytics } from './InvestorAnalytics';
import { ProfileCreationModal } from './ProfileCreationModal';
import { ProfileCreationCard } from './ProfileCreationCard';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { logout, getCurrentUser, getProfilesCreated, fetchMe, setCurrentUser as persistCurrentUser } from '../services/authService';
import { toast } from 'sonner';
import { 
  Home, 
  TrendingUp, 
  Search, 
  Bell, 
  DollarSign, 
  Users, 
  MessageCircle, 
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  FileText,
  Star,
  BarChart3,
  Settings,
  User,
  Filter,
  Calendar,
  MapPin,
  Target,
  ArrowUpRight,
  Eye,
  Heart,
  Bookmark,
  Plus,
  Sparkles,
  CheckCircle,
  BadgeCheck,
  Clock,
  ThumbsUp,
  MessageSquare,
  FolderOpen,
  PieChart,
  Activity,
  Award,
  Lock,
  Download,
  Upload,
  Mic,
  LogOut,
  Newspaper,
  AlertCircle,
  BookOpen,
  Rocket
} from 'lucide-react';
import logoImage from '../assets/logo.png';
import squareLogo from '../assets/logo-square.png';
import { brandColors } from '../utils/colors';
import { StartupProfilePage } from './StartupProfilePage';
import { DiscoverStartups } from './DiscoverStartups';
import { SavedStartupsList } from './SavedStartupsList';
import DiscoverInvestor from './DiscoverInvestor';
import { RoleSwitcher, UserRole } from './RoleSwitcher';
import { getInvestorPortfolio } from '../services/investorService';

type SidebarItem = {
  icon: any;
  label: string;
  badge?: number;
};

export function InvestorDashboard() {
  const isCompact = useIsBelowLg();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'Home Feed';
    return localStorage.getItem('dashboard:investor:activeTab') || 'Home Feed';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const [view, setView] = useState<'home' | 'discover' | 'pipeline' | 'portfolio' | 'dealroom' | 'startup-profile'>(() => {
    if (typeof window === 'undefined') return 'home';
    const saved = localStorage.getItem('dashboard:investor:view');
    if (
      saved === 'home' ||
      saved === 'discover' ||
      saved === 'pipeline' ||
      saved === 'portfolio' ||
      saved === 'dealroom' ||
      saved === 'startup-profile'
    ) {
      return saved;
    }
    return 'home';
  });
  const [currentRole, setCurrentRole] = useState<UserRole>('investor');

  const [currentUser, setCurrentUser] = useState<any>(null);
  // iOS ships fully functional with no admin-gated verification wall (Apple
  // Guideline 2.1/4.2): an unverified reviewer account must still reach the app.
  const [isVerified, setIsVerified] = useState(Capacitor.getPlatform() === 'ios');
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [profilesCreated, setProfilesCreated] = useState({ founder: false, expert: false, investor: false });
  const [profileCreationModal, setProfileCreationModal] = useState<'expert' | 'investor' | null>(null);
  const [savedTab, setSavedTab] = useState<'Posts' | 'Profiles' | 'Startups'>('Posts');
  const [initialMessageUserId, setInitialMessageUserId] = useState<string | undefined>(undefined);
  const [portfolioStartups, setPortfolioStartups] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [selectedStartupId, setSelectedStartupId] = useState<string | null>(null);

  const initials = currentUser?.name 
    ? Array.from(currentUser.name.split(' ').map((n: string) => Array.from(n)[0]).join('')).slice(0, 2).join('').toUpperCase() 
    : 'IV';

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const { tab, messageUserId } = e.detail;
      if (messageUserId) setInitialMessageUserId(String(messageUserId));
      if (tab) {
        setActiveTab(tab);
        if (tab === 'Home Feed') setView('home');
        else if (tab === 'Discover') setView('discover');
        else if (tab === 'Pipeline') setView('pipeline');
        else if (tab === 'Portfolio') setView('portfolio');
        else if (tab === 'Deal Rooms') setView('dealroom');
      }
    };
    window.addEventListener('navigateDashboard', handleNavigate);
    return () => window.removeEventListener('navigateDashboard', handleNavigate);
  }, []);

  const completeVerification = () => {
    sessionStorage.setItem('profileCompletionRole', 'investor');
    window.location.hash = '#complete-profile';
  };

  const dismissVerificationBanner = (hours: number) => {
    const until = new Date();
    until.setHours(until.getHours() + hours);
    if (currentUser) {
      const updatedUser = { ...currentUser, verificationBannerDismissedUntil: until.toISOString() };
      setCurrentUser(updatedUser);
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
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard:investor:activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard:investor:view', view);
  }, [view]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoadingPortfolio(true);
        const data = await getInvestorPortfolio();
        setPortfolioStartups(data);
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setLoadingPortfolio(false);
      }
    };
    if (view === 'portfolio' || view === 'home') {
      fetchPortfolio();
    }
  }, [view]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    // Force immediate view reset to avoid unauthorized data fetching
    if (newRole === 'founder') {
      setView('home');
      setActiveTab('Home Feed');
    } else if (newRole === 'expert') {
      setView('home');
      setActiveTab('Home Feed');
    }
    console.log(`Switching to ${newRole} dashboard`);
  };

  // Otherwise render investor dashboard
  const sidebarItems: SidebarItem[] = [
    { icon: Home, label: 'Home Feed' },
    { icon: Target, label: 'Discover' },
    { icon: Briefcase, label: 'Pipeline' },
    // "Explore Startups" is a Coming-Soon placeholder — hidden on iOS (Apple Guideline 2.1)
    ...(Capacitor.getPlatform() !== 'ios' ? [{ icon: Rocket, label: 'Explore Startups' }] : []),
    { icon: FolderOpen, label: 'Deal Rooms' },
    { icon: PieChart, label: 'Portfolio' },
    { icon: BarChart3, label: 'Analytics' },
    { icon: MessageCircle, label: 'Messages' },
    { icon: Users, label: 'Communities' },
    { icon: Calendar, label: 'Events' },
    { icon: Sparkles, label: 'Ignisha AI' },
    { icon: Bookmark, label: 'Saved Items' },
    { icon: Mic, label: 'Podcasts' },
    { icon: BookOpen, label: 'Startup Resources' },
    { icon: Newspaper, label: 'News' },
    { icon: User, label: 'Profile' },
    { icon: Settings, label: 'Settings' },
  ];

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
              key={item.label}
              onClick={() => {
                setActiveTab(item.label);
                if (item.label === 'Home Feed') setView('home');
                else if (item.label === 'Discover') setView('discover');
                else if (item.label === 'Pipeline') setView('pipeline');
                else if (item.label === 'Explore Startups') setView('discover'); // Re-using discover view or just rendering directly
                else if (item.label === 'Portfolio') setView('portfolio');
                else if (item.label === 'Deal Rooms') setView('dealroom');
              }}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-1 transition-all relative group ${
                activeTab === item.label
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
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
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
                    key={item.label}
                    onClick={() => {
                      setActiveTab(item.label);
                      setIsSidebarOpen(false);
                      if (item.label === 'Home Feed') setView('home');
                      if (item.label === 'Discover') setView('discover');
                      if (item.label === 'Pipeline') setView('pipeline');
                      if (item.label === 'Portfolio') setView('portfolio');
                      if (item.label === 'Deal Rooms') setView('dealroom');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                      activeTab === item.label
                        ? 'bg-gradient-to-r text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={activeTab === item.label ? {
                      background: `linear-gradient(135deg, ${brandColors.navyBlue}, ${brandColors.electricBlue})`
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
      <motion.main 
        animate={{ 
          marginLeft: window.innerWidth >= 1280 ? (isSidebarCollapsed ? 80 : 256) : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`flex-1 min-h-0 overflow-hidden ${['Ignisha AI'].includes(activeTab) ? 'pt-[env(safe-area-inset-top)]' : ''} flex flex-col`}
        style={{
          width: window.innerWidth >= 1280 
            ? `calc(100% - ${isSidebarCollapsed ? 80 : 256}px)` 
            : '100%'
        }}
      >
        {/* Verification Banner removed in favor of full overlay */}

        {/* Top Header */}
        {!['Ignisha AI'].includes(activeTab) && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] pt-[env(safe-area-inset-top)]">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <button
                  className="xl:hidden p-2 -ml-2 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 truncate tracking-tight flex items-center gap-2">
                  {activeTab}
                  {activeTab === 'Home Feed' && isVerified && (
                    <BadgeCheck className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 ml-1" />
                  )}
                </h1>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                {/* Mobile quick actions */}
                <div className="flex xl:hidden items-center gap-1.5">
                  <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2 hover:bg-gray-50 rounded-xl transition-colors group"
                  >
                    <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                    {notifUnread > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-xl transition-all border border-red-100/50 active:scale-95 shadow-sm"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Logout</span>
                  </button>
                  <button onClick={() => setActiveTab('Profile')} className="w-8 h-8 ml-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-[10px] font-black overflow-hidden border-2 border-white shadow-sm active:scale-95 transition-transform relative">
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
                        <div className="hidden items-center justify-center w-full h-full text-white">
                          {initials}
                        </div>
                      </>
                    ) : (
                      initials
                    )}
                  </button>
                </div>

                {/* Desktop actions */}
                <div className="hidden xl:flex items-center gap-4">
                  <RoleSwitcher 
                    currentRole={currentRole}
                    onRoleChange={handleRoleChange}
                  />
                  <div className="h-6 w-px bg-gray-200"></div>
                  <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2.5 hover:bg-gray-50 rounded-xl transition-colors group"
                  >
                    <Bell className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                    {notifUnread > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-2.5 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition-colors group"
                    title="Logout"
                  >
                    <LogOut className="w-6 h-6" />
                  </button>
                  <button onClick={() => setActiveTab('Profile')} className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black overflow-hidden border-2 border-white shadow-md hover:shadow-lg transition-all active:scale-95 relative">
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
                        <div className="hidden items-center justify-center w-full h-full text-white">
                          {initials}
                        </div>
                      </>
                    ) : (
                      initials
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}
        
        {/* Notifications Dropdown */}
        <NotificationsDropdown
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          userRole="investor"
          onUnreadCountChange={setNotifUnread}
        />

        <div className={`flex-1 min-h-0 p-[0px] ${['Communities', 'Ignisha AI', 'Messages', 'Events'].includes(activeTab) ? 'overflow-hidden flex flex-col relative' : (!isVerified && !['Profile', 'Settings'].includes(activeTab) ? 'overflow-hidden relative' : 'overflow-y-auto relative')}`}>
          {/* Investor Verification Barrier */}
          {!isVerified && !['Profile', 'Settings'].includes(activeTab) ? (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-50/95 backdrop-blur-md p-4">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">Verification Required</h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  To protect our founders and maintain a high-quality network, all investor accounts must be verified before accessing the platform.
                </p>
                {currentUser?.linkedInUrl ? (
                  <div className="w-full mb-4">
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-semibold text-green-700">LinkedIn URL submitted</span>
                    </div>
                    <a href={currentUser.linkedInUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sm text-blue-600 hover:underline truncate">{currentUser.linkedInUrl}</a>
                    <p className="text-xs text-gray-500 mt-2">Your LinkedIn is being reviewed by our team. You'll be verified shortly.</p>
                  </div>
                ) : (
                  <div className="w-full mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Submit your LinkedIn profile URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/your-profile"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        id="investor-linkedin-url-input"
                      />
                      <button
                        onClick={async () => {
                          const input = document.getElementById('investor-linkedin-url-input') as HTMLInputElement;
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
                              toast.success("LinkedIn URL submitted! We'll verify you shortly.");
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
                <p className="text-xs text-gray-500">
                  Usually verified within 24 hours. Need manual verification? <a href="#help-support" onClick={() => setActiveTab('Help & Support')} className="text-blue-600 font-bold hover:underline">Contact Support</a>
                </p>
              </div>
            </div>
          ) : null}
          {/* Home Feed View — Investor Command Center */}
          {view === 'home' && activeTab === 'Home Feed' && (
            <div className="space-y-6 pb-6">

              {/* Welcome Banner */}
              <div className="mx-4 md:mx-6 mt-4">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-blue-500/20"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-blue-200 text-sm font-semibold mb-1">Welcome back 👋</p>
                      <h2 className="text-2xl md:text-3xl font-black mb-2">{currentUser?.name?.split(' ')[0] || 'Investor'}'s Command Center</h2>
                      <p className="text-blue-100 text-sm">Track your deals, discover startups, and manage your portfolio.</p>
                    </div>
                    <button
                      onClick={() => { setActiveTab('Discover'); setView('discover'); }}
                      className="flex-shrink-0 px-6 py-3 bg-white text-blue-700 font-black rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
                    >
                      <Rocket className="w-4 h-4" /> Find Startups
                    </button>
                  </div>
                </motion.div>
              </div>

              <DashboardWidgets compact={isCompact} label="Dashboard">
              {/* Quick Stat Cards */}
              <div className="px-4 md:px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { label: 'Portfolio', value: portfolioStartups.length || '—', icon: PieChart, gradient: 'from-purple-500 to-indigo-600', onClick: () => { setActiveTab('Portfolio'); setView('portfolio'); } },
                    { label: 'Deal Pipeline', value: 'View', icon: Briefcase, gradient: 'from-blue-500 to-cyan-600', onClick: () => { setActiveTab('Pipeline'); setView('pipeline'); } },
                    { label: 'Deal Rooms', value: 'Open', icon: FolderOpen, gradient: 'from-orange-500 to-red-500', onClick: () => { setActiveTab('Deal Rooms'); setView('dealroom'); } },
                    { label: 'Analytics', value: 'Live', icon: BarChart3, gradient: 'from-emerald-500 to-teal-600', onClick: () => setActiveTab('Analytics') },
                  ].map((stat) => (
                    <motion.button
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={stat.onClick}
                      className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-4 md:p-5 text-white text-left shadow-lg hover:shadow-xl transition-all`}
                    >
                      <stat.icon className="w-6 h-6 mb-3 opacity-80" />
                      <div className="text-xl md:text-2xl font-black mb-0.5">{stat.value}</div>
                      <div className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{stat.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Quick Action Shortcuts */}
              <div className="px-4 md:px-6">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Quick Access</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { label: 'Discover', icon: Target, bg: 'bg-blue-50', text: 'text-blue-600', onClick: () => { setActiveTab('Discover'); setView('discover'); } },
                    { label: 'Connections', icon: Users, bg: 'bg-purple-50', text: 'text-purple-600', onClick: () => setActiveTab('Messages') },
                    { label: 'Deals', icon: DollarSign, bg: 'bg-green-50', text: 'text-green-600', onClick: () => { setActiveTab('Pipeline'); setView('pipeline'); } },
                    { label: 'Rooms', icon: FolderOpen, bg: 'bg-orange-50', text: 'text-orange-600', onClick: () => { setActiveTab('Deal Rooms'); setView('dealroom'); } },
                    { label: 'Ignisha AI', icon: Sparkles, bg: 'bg-violet-50', text: 'text-violet-600', onClick: () => setActiveTab('Ignisha AI') },
                    { label: 'Analytics', icon: BarChart3, bg: 'bg-teal-50', text: 'text-teal-600', onClick: () => setActiveTab('Analytics') },
                  ].map((a) => (
                    <motion.button
                      key={a.label}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={a.onClick}
                      className={`${a.bg} ${a.text} rounded-2xl p-4 flex flex-col items-center gap-2 border border-white/60 shadow-sm hover:shadow-md transition-all`}
                    >
                      <a.icon className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="text-[10px] font-black uppercase tracking-wide">{a.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* AI-Matched Startups Teaser */}
              <div className="px-4 md:px-6">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-5 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-sm md:text-base">AI-Matched Startups</h3>
                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wide">Personalized for your thesis</p>
                      </div>
                    </div>
                    <button onClick={() => { setActiveTab('Discover'); setView('discover'); }} className="text-xs font-black text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { name: 'Browse AI Matches', desc: 'Find startups aligned with your investment thesis', stage: 'Discover', match: '95%' },
                      { name: 'Filter by Sector', desc: 'SaaS, FinTech, HealthTech and 20+ more sectors', stage: 'Filter', match: '92%' },
                      { name: 'Review Decks', desc: 'Access pitch decks and due diligence documents', stage: 'Pipeline', match: '89%' },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveTab('Discover'); setView('discover'); }}
                        className="bg-white rounded-2xl p-4 text-left border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">{item.stage}</span>
                          {/* Fabricated match % hidden on iOS (Apple Guideline 2.3.1 — no misleading data) */}
                          {Capacitor.getPlatform() !== 'ios' && <span className="text-[10px] font-black text-emerald-600">{item.match} match</span>}
                        </div>
                        <h4 className="font-black text-gray-900 text-sm group-hover:text-purple-700 transition-colors mb-1">{item.name}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Portfolio Snapshot */}
              {portfolioStartups.length > 0 && (
                <div className="px-4 md:px-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">My Portfolio</p>
                    <button onClick={() => { setActiveTab('Portfolio'); setView('portfolio'); }} className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {portfolioStartups.slice(0, 3).map((startup: any) => (
                      <div key={startup._id || startup.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                          {(startup.name || startup.startupName || 'S')[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-gray-900 text-sm truncate">{startup.name || startup.startupName || 'Startup'}</h4>
                          <p className="text-[11px] text-gray-400 font-medium truncate">{startup.industry || startup.sector || 'Technology'}</p>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-green-50 text-green-700 rounded-lg font-bold uppercase flex-shrink-0">{startup.stage || 'Active'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile Creation Section */}
              {!profilesCreated.expert && (
                <div className="mx-4 md:mx-6">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Expand Your Profile</p>
                  <div className="space-y-3">
                    {/* Founder profile creation isn't wired into the investor dashboard yet,
                        so that card is omitted rather than shown as a non-functional button. */}
                    <ProfileCreationCard type="expert" isCreated={profilesCreated.expert} onCreateClick={() => setProfileCreationModal('expert')} />
                  </div>
                </div>
              )}

              {/* Account Engagement (LinkedIn-style) */}
              <AccountEngagementCard className="px-4 md:px-6 mb-4" />
              </DashboardWidgets>

              {/* Activity Feed Divider */}
              <div className="px-4 md:px-6 flex items-center gap-4">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Activity Feed</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <EnhancedHomeFeed userType="investor" />
            </div>
          )}

          {/* Saved Items View */}
          {activeTab === 'Saved Items' && (
            <div className="p-4 md:p-6 h-full flex flex-col">
              <div className="mx-4 lg:mx-[24px] mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Bookmark className="w-6 h-6 text-blue-600" />
                  Saved Items
                </h2>
                <p className="text-gray-600 text-sm">Review your bookmarked profiles and insights across the platform.</p>
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
                    userType="investor"
                    initialFilter="Saved"
                  />
                ) : savedTab === 'Profiles' ? (
                  <SavedProfilesList onMessage={(userId) => { setInitialMessageUserId(String(userId)); setActiveTab('Messages'); }} />
                ) : (
                  <SavedStartupsList onOpenStartup={(id) => { setSelectedStartupId(String(id)); setView('startup-profile'); setActiveTab('Discover'); }} />
                )}
              </div>
            </div>
          )}

          {/* Discover View */}
          {view === 'discover' && activeTab === 'Discover' && (
            <DiscoverInvestor
              onViewStartupProfile={(id) => {
                setSelectedStartupId(id);
                setView('startup-profile');
                setActiveTab('Discover');
              }}
            />
          )}

          {view === 'startup-profile' && selectedStartupId && (
            <StartupProfilePage
              startupId={selectedStartupId}
              onBack={() => setView('pipeline')}
            />
          )}

          {/* Messages View */}
          {activeTab === 'Messages' && (
            <MessagingPage initialUserId={initialMessageUserId} onBack={() => { setActiveTab('Home Feed'); setView('home'); }} />
          )}

          {/* Communities View */}
          {activeTab === 'Communities' && (
            <CommunitiesPage 
              userRole="investor" 
              userId={currentUser?.id || currentUser?._id || ''} 
              onBack={() => { setActiveTab('Home Feed'); setView('home'); }}
            />
          )}

          {/* Events View */}
          {activeTab === 'Events' && (
            <EventsPage userRole="investor" onBack={() => { setActiveTab('Home Feed'); setView('home'); }} onMenuClick={() => setIsSidebarOpen(true)} hideHeader />
          )}

          {/* Podcasts View */}
          {activeTab === 'Podcasts' && (
            <PodcastsPage userRole="investor" onBack={() => { setActiveTab('Home Feed'); setView('home'); }} onMenuClick={() => setIsSidebarOpen(true)} hideHeader currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} />
          )}

          {/* Startup Resources View */}
          {activeTab === 'Startup Resources' && (
            <StartupResourcesPage userRole="investor" onBack={() => { setActiveTab('Home Feed'); setView('home'); }} onMenuClick={() => setIsSidebarOpen(true)} hideHeader currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} />
          )}

          {/* News View */}
          {activeTab === 'News' && (
            <NewsFeedPage onBack={() => { setActiveTab('Home Feed'); setView('home'); }} onMenuClick={() => setIsSidebarOpen(true)} hideHeader />
          )}

          {/* Ignisha AI View */}
          {activeTab === 'Ignisha AI' && (
            <IgnishaAIDashboard userRole="investor" onBack={() => { setActiveTab('Home Feed'); setView('home'); }} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} />
          )}

          {/* Profile View */}
          {activeTab === 'Profile' && <ProfilePage userRole="investor" onNavigateToSettings={() => setActiveTab('Settings')} onBack={() => { setActiveTab('Home Feed'); setView('home'); }} />}

          {/* Settings View */}
          {activeTab === 'Settings' && <SettingsPage userRole="investor" onBack={() => { setActiveTab('Home Feed'); setView('home'); }} hideMobileHeader={true} />}

          {/* Analytics View */}
          {activeTab === 'Analytics' && <InvestorAnalytics onNavigateToAI={() => setActiveTab('Ignisha AI')} onBack={() => setActiveTab('Home Feed')} />}

          {/* Explore Startups View */}
          {activeTab === 'Explore Startups' && <DiscoverStartups />}

          {/* Pipeline View - Kanban Board */}
          {view === 'pipeline' && activeTab === 'Pipeline' && (
            <DealFlowPipeline onViewProfile={(id) => { setSelectedStartupId(id); setView("startup-profile"); setActiveTab("Discover"); }} 
              onNavigateToDiscover={() => {
                setActiveTab('Discover');
                setView('discover');
              }} 
            />
          )}

          {/* Portfolio View - Analytics */}
          {view === 'portfolio' && activeTab === 'Portfolio' && (
            <>
              {/* AI Portfolio Insights Widget */}
              <div className="mb-6">
                <AIPortfolioInsights portfolioStartups={portfolioStartups} />
              </div>

              {/* Portfolio Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-0 lg:mr-6 lg:ml-6 ml-4 mr-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 sm:p-6 text-white shadow-lg">
                  <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 mb-3 opacity-80" />
                  <div className="text-lg sm:text-2xl font-bold mb-1">
                    ${portfolioStartups
                      .reduce((acc, s) => acc + (Number(s?.investedAmount ?? s?.funding?.raised ?? s?.fundingRaised ?? 0)), 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-sm text-white/80">Total Invested</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 sm:p-6 text-white shadow-lg">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 mb-3 opacity-80" />
                  <div className="text-lg sm:text-2xl font-bold mb-1">
                    ${portfolioStartups
                      .reduce((acc, s) => {
                        const invested = Number(s?.investedAmount ?? s?.funding?.raised ?? s?.fundingRaised ?? 0);
                        const multiple = Number(s?.valuationMultiple ?? 1);
                        return acc + (invested * multiple);
                      }, 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-sm text-white/80">Portfolio Value</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 sm:p-6 text-white shadow-lg">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 mb-3 opacity-80" />
                  <div className="text-lg sm:text-2xl font-bold mb-1">
                    {(() => {
                      const totalInvested = portfolioStartups.reduce((acc, s) => acc + (Number(s?.investedAmount ?? s?.funding?.raised ?? s?.fundingRaised ?? 0)), 0);
                      const currentValue = portfolioStartups.reduce((acc, s) => {
                        const invested = Number(s?.investedAmount ?? s?.funding?.raised ?? s?.fundingRaised ?? 0);
                        const multiple = Number(s?.valuationMultiple ?? 1);
                        return acc + (invested * multiple);
                      }, 0);
                      if (totalInvested === 0) return '0%';
                      const roi = ((currentValue - totalInvested) / totalInvested) * 100;
                      return `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`;
                    })()}
                  </div>
                  <div className="text-[10px] sm:text-sm text-white/80">Total ROI</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 sm:p-6 text-white shadow-lg">
                  <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 mb-3 opacity-80" />
                  <div className="text-lg sm:text-2xl font-bold mb-1">{portfolioStartups.length}</div>
                  <div className="text-[10px] sm:text-sm text-white/80">Active Investments</div>
                </div>
              </div>

              {/* Portfolio Table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mx-4 lg:mx-6 mb-8">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h3 className="text-lg sm:text-xl font-bold">Portfolio Companies</h3>
                </div>
                {loadingPortfolio ? (
                  <div className="px-6 py-10 text-center text-gray-600">Loading portfolio...</div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Sector</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Invested</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Equity</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Current Value</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ROI</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {portfolioStartups.map((item) => (
                        <tr key={String(item?.id || item?._id || item?.startupId || item?.name || Math.random())} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm">{item.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">
                              {Array.isArray(item?.industry) ? item.industry.join(', ') : (item?.industry || 'N/A')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">
                              {item?.funding?.currency || '$'}{Number(item?.funding?.raised ?? item?.fundingRaised ?? 0).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">{item?.equity ? `${item.equity}%` : 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-green-600">
                              {(() => {
                                const invested = Number(item?.investedAmount ?? item?.funding?.raised ?? item?.fundingRaised ?? 0);
                                const multiple = Number(item?.valuationMultiple ?? 1);
                                return `${item?.funding?.currency || '$'}${(invested * multiple).toLocaleString()}`;
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm font-bold ${Number(item?.valuationMultiple ?? 1) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                              {(() => {
                                const multiple = Number(item?.valuationMultiple ?? 1);
                                const roi = (multiple - 1) * 100;
                                return `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`;
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              className="text-sm text-blue-600 font-medium hover:underline"
                              onClick={() => {
                                const id = String(item?.id || item?._id || '');
                                if (!id) return;
                                setSelectedStartupId(id);
                                setView('startup-profile');
                                setActiveTab('Discover');
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {portfolioStartups.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No active investments in your portfolio yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </>
          )}

          {/* Deal Room View */}
          {view === 'dealroom' && activeTab === 'Deal Rooms' && (
            <DealRoomPage />
          )}
        </div>
      </motion.main>

      {/* Mobile Bottom Navigation */}
      {(
        <nav
          className="xl:hidden flex-shrink-0 bg-white border-t border-gray-100 safe-bottom pb-2 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
          style={{ zIndex: 500 }}
        >
        <div className="relative max-w-lg mx-auto">
          <div className="grid grid-cols-5 gap-1 px-4 py-2">
            {/* Home Feed */}
            <button 
              onClick={() => {
                setActiveTab('Home Feed');
                setView('home');
              }}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all active:scale-95 ${
                activeTab === 'Home Feed' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'Home Feed' ? 'bg-blue-50' : 'bg-transparent'}`}>
                <Home className="w-5 h-5 sm:w-6 sm:h-6" fill={activeTab === 'Home Feed' ? 'currentColor' : 'none'} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">Home</span>
            </button>
            
            {/* Discover */}
            <button 
              onClick={() => {
                setActiveTab('Discover');
                setView('discover');
              }}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all active:scale-95 ${
                activeTab === 'Discover' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'Discover' ? 'bg-blue-50' : 'bg-transparent'}`}>
                <Target className="w-5 h-5 sm:w-6 sm:h-6" fill={activeTab === 'Discover' ? 'currentColor' : 'none'} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">Discover</span>
            </button>
            
            {/* Ignisha AI - Center Elevated Button */}
            <div className="flex flex-col items-center justify-center relative -top-4">
              <button 
                onClick={() => setActiveTab('Ignisha AI')}
                className="flex flex-col items-center group relative z-50"
              >
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    activeTab === 'Ignisha AI'
                      ? 'bg-gradient-to-br from-purple-600 via-blue-600 to-amber-500 shadow-blue-200'
                      : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-purple-100'
                  }`}
                >
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </motion.div>
                <span className={`text-[10px] font-extrabold mt-1.5 transition-colors tracking-widest uppercase ${
                  activeTab === 'Ignisha AI' 
                    ? 'text-blue-600' 
                    : 'text-gray-400'
                }`}>
                  Ignisha
                </span>
                
                {/* Active Indicator for center button */}
                {activeTab === 'Ignisha AI' && (
                  <motion.div 
                    layoutId="ai-active"
                    className="absolute -bottom-2 w-1 h-1 bg-blue-500 rounded-full"
                  />
                )}
              </button>
            </div>
            
            {/* Pipeline */}
            <button 
              onClick={() => {
                setActiveTab('Pipeline');
                setView('pipeline');
              }}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all active:scale-95 ${
                activeTab === 'Pipeline' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'Pipeline' ? 'bg-blue-50' : 'bg-transparent'}`}>
                <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] font-bold tracking-tight">Pipeline</span>
            </button>
            
            {/* Messages */}
            <button 
              onClick={() => setActiveTab('Messages')}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all active:scale-95 relative ${
                activeTab === 'Messages' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'Messages' ? 'bg-blue-50' : 'bg-transparent'}`}>
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" fill={activeTab === 'Messages' ? 'currentColor' : 'none'} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">Chat</span>
              {0 > 0 && (
                <span className="absolute top-1 right-1 sm:right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center p-0.5 border-2 border-white ring-2 ring-red-500/20">
                  0
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
      )}

      {/* Profile Creation Modal */}
      {profileCreationModal && (
        <ProfileCreationModal
          isOpen={profileCreationModal !== null}
          profileType={profileCreationModal as 'expert' | 'investor'}
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

