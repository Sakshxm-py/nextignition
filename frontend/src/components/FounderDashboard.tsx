import { Capacitor } from '@capacitor/core';
import { ProfilePage } from './ProfilePage';
import { SettingsPage } from './SettingsPage';
import { DiscoverExperts } from './DiscoverExperts';
import { DiscoverCoFounders } from './DiscoverCoFounders';
import { MessagingPage } from './MessagingPage';
import CommunitiesPage from './CommunitiesPage';
import { FundingPortalFounder } from './FundingPortalFounder';
import { EventsPage } from './EventsPage';
import { PodcastsPage } from './PodcastsPage';
import { StartupResourcesPage } from './StartupResourcesPage';
import { NewsFeedPage } from './NewsFeedPage';
import { RoleSwitcher, UserRole } from './RoleSwitcher';
import { NotificationsDropdown } from './NotificationsDropdown';
import { MyStartupPage } from './MyStartupPage';
import { EnhancedHomeFeed } from './EnhancedHomeFeed';
import { AccountEngagementCard } from './AccountEngagementCard';
import { DashboardWidgets } from './dashboard/DashboardQuickMenu';
import { useIsBelowLg } from '../hooks/useBreakpoint';
import { IgnishaAIDashboard } from './IgnishaAIDashboard';
import { VerificationBanner } from './VerificationBanner';
import { ProfileCreationModal } from './ProfileCreationModal';
import { ProfileCreationCard } from './ProfileCreationCard';
import { DiscoverInvestors } from './DiscoverInvestors';
import { DiscoverStartups } from './DiscoverStartups';
import { SavedProfilesList } from './SavedProfilesList';
import { SavedStartupsList } from './SavedStartupsList';
import { DashboardSidebar} from "./sidebar/Sidebar";
import { brandColors } from '../utils/colors';
import { Toaster, toast } from 'sonner';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { fetchMe, getCurrentUser, setCurrentUser as persistCurrentUser, logout, getProfilesCreated } from '../services/authService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

import {
  Home,
  Rocket,
  Users,
  MessageCircle,
  Calendar,
  Settings,
  Bell,
  Menu,
  X,
  Plus,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  User,
  Compass,
  Mic,
  Newspaper,
  FileText,
  UserPlus,
  Sparkles,
  BadgeCheck,
  Target,
  Award,
  Briefcase,
  BarChart3,
  TrendingUp,
  Search,
  Edit,
  LogOut,
  Bookmark,
  BookOpen,
  CheckCircle
} from 'lucide-react';
import logoImage from '../assets/logo.png';
import squareLogo from '../assets/logo-square.png';

interface SidebarItem {
  icon: any;
  label: string;
  badge?: number;
}

interface QuickAction {
  icon: any;
  title: string;
  description: string;
  color: string;
  action: () => void;
}

export function FounderDashboard() {
  const isCompact = useIsBelowLg();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'Home Feed';
    return localStorage.getItem('dashboard:founder:activeTab') || 'Home Feed';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [discoverSubTab, setDiscoverSubTab] = useState(() => {
    if (typeof window === 'undefined') return 'Experts';
    return localStorage.getItem('dashboard:founder:discoverSubTab') || 'Experts';
  });
  const [openHomeFeedCreatePost, setOpenHomeFeedCreatePost] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('founder');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const userId = currentUser?.id ?? currentUser?._id;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [initialMessageUserId, setInitialMessageUserId] = useState<string | undefined>(undefined);
  const [dashboardStats, setDashboardStats] = useState({
    profileViews: 0,
    connections: 0,
    investorInterest: 0,
    fundingProgress: 0
  });
  const [profilesCreated, setProfilesCreated] = useState({ founder: false, expert: false, investor: false });
  const [profileCreationModal, setProfileCreationModal] = useState<'expert' | 'investor' | null>(null);
  const [savedTab, setSavedTab] = useState<'Posts' | 'Profiles' | 'Startups'>('Posts');
  const { hasFeature, userPlan } = useFeatureAccess();

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const { tab, subTab, messageUserId } = e.detail;
      if (messageUserId) setInitialMessageUserId(String(messageUserId));
      if (tab) setActiveTab(tab);
      if (subTab) setDiscoverSubTab(subTab);
    };
    window.addEventListener('navigateDashboard', handleNavigate);
    return () => window.removeEventListener('navigateDashboard', handleNavigate);
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setIsVerified(!!user?.isVerified);

    // Fetch dashboard data
    fetchDashboardData();
    fetchProfilesCreated();

    // Refresh user state from backend to determine verification + banner visibility
    (async () => {
      try {
        const me = await fetchMe();
        if (me) {
          persistCurrentUser(me);
          setCurrentUser(me);
          setIsVerified(!!me.isVerified);

          const dismissedUntil = me.verificationBannerDismissedUntil ? new Date(me.verificationBannerDismissedUntil) : null;
          const now = new Date();
          const hideBanner = dismissedUntil ? dismissedUntil.getTime() > now.getTime() : false;
          setShowVerificationBanner(!hideBanner);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard:founder:activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard:founder:discoverSubTab', discoverSubTab);
  }, [discoverSubTab]);

  const dismissVerificationBanner = async (hours: number) => {
    try {
      const dismissedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      await api.post('/verification/banner', { dismissedUntil });
      setShowVerificationBanner(false);
      const me = await fetchMe();
      if (me) {
        persistCurrentUser(me);
        setCurrentUser(me);
      }
    } catch {
      setShowVerificationBanner(false);
    }
  };

  const completeVerification = async () => {
    try {
      await api.post('/verification/complete');
      setIsVerified(true);
      const me = await fetchMe();
      if (me) {
        persistCurrentUser(me);
        setCurrentUser(me);
      }
    } catch {
      // ignore
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch unread messages count
      const messagesRes = await api.get('/messages/conversations');
      const unreadCount = messagesRes.data?.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0);
      setUnreadMessages(unreadCount || 0);

      // Fetch unread notifications
      const notifRes = await api.get('/notifications');
      const notifCount = notifRes.data?.filter((n: any) => !n.read).length || 0;
      setUnreadNotifications(notifCount);

      // Fetch dashboard stats
      try {
        const statsRes = await api.get('/startups/my/stats');
        if (statsRes.data) {
          setDashboardStats({
            profileViews: statsRes.data.profileViews || 0,
            connections: statsRes.data.connections || 0,
            investorInterest: statsRes.data.investorInterest || 0,
            fundingProgress: statsRes.data.fundingProgress || 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }

      // Fetch upcoming events count
      const eventsRes = await api.get('/events', { params: { status: 'upcoming' } });
      setUpcomingEvents(eventsRes.data?.length || 0);
    } catch {
      // Silent fail - keep showing 0
    }
  };

  const fetchProfilesCreated = async () => {
    try {
      const data = await getProfilesCreated();
      setProfilesCreated(data);
    } catch (error) {
      console.error('Failed to fetch profiles created:', error);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    // Reset view to prevent unauthorized data fetching from previous role's components
    setActiveTab('Home Feed');
    console.log(`Switching to ${newRole} dashboard`);
  };

  const quickActions: QuickAction[] = [
    {
      icon: Edit,
      title: 'Post Update',
      description: 'Share your progress',
      color: brandColors.electricBlue,
      action: () => {
        setActiveTab('Home Feed');
        setOpenHomeFeedCreatePost(true);
      },
    },
    {
      icon: currentUser?.verificationInfo?.founder?.hasStartup === 'wants-to-join' ? Search : FileText,
      title: currentUser?.verificationInfo?.founder?.hasStartup === 'wants-to-join' ? 'Find Startups' : 'Upload Pitch Deck',
      description: currentUser?.verificationInfo?.founder?.hasStartup === 'wants-to-join' ? 'Browse opportunities' : 'Add to your profile',
      color: brandColors.atomicOrange,
      action: () => {
        if (currentUser?.verificationInfo?.founder?.hasStartup === 'wants-to-join') {
          setActiveTab('Discover');
          setDiscoverSubTab('CoFounders');
          // Note: In co-founders discovery, they can filter by 'Has Startup' to find founders looking for co-founders
          return;
        }
        if (!hasFeature('canUploadPitchDeck')) {
          toast.error(Capacitor.getPlatform() === 'ios' ? 'Pitch deck uploads are available with NextIgnition Premium.' : `Your current ${userPlan} plan does not support pitch deck uploads. Please upgrade to Pro.`, {
            action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
          });
          return;
        }
        setActiveTab('My Startup');
      },
    },
    {
      icon: UserPlus,
      title: 'Find Co-founder',
      description: 'Browse matches',
      color: brandColors.navyBlue,
      action: () => {
        setActiveTab('Discover');
        setDiscoverSubTab('CoFounders');
      },
    },
    {
      icon: Award,
      title: 'Find Experts',
      description: 'Connect with advisors',
      color: brandColors.atomicOrange,
      action: () => {
        setActiveTab('Discover');
        setDiscoverSubTab('Experts');
      },
    },
    {
      icon: DollarSign,
      title: 'Apply for Funding',
      description: 'Get investor ready',
      color: brandColors.electricBlue,
      action: () => {
        if (userPlan === 'free') {
          toast.error(Capacitor.getPlatform() === 'ios' ? "Funding Portal is available with NextIgnition Premium." : "Funding Portal access is limited to Pro and Elite founders.", {
            action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
          });
          return;
        }
        setActiveTab('Funding Portal');
      },
    },
  ];
  const sidebarItems: SidebarItem[] = [
    { icon: Home, label: 'Home Feed' },
    { icon: Rocket, label: 'My Startup' },
    { icon: Compass, label: 'Discover' },
    // "Explore Startups" is a Coming-Soon placeholder — hidden on iOS (Apple Guideline 2.1)
    ...(Capacitor.getPlatform() !== 'ios' ? [{ icon: Rocket, label: 'Explore Startups' }] : []),
    { icon: MessageCircle, label: 'Messages', badge: typeof unreadMessages === 'number' ? unreadMessages : undefined },
    { icon: DollarSign, label: 'Funding Portal' },
    { icon: Users, label: 'Communities' },
    { icon: Calendar, label: 'Events', badge: upcomingEvents || undefined },
    { icon: Mic, label: 'Podcasts' },
    { icon: BookOpen, label: 'Startup Resources' },
    { icon: Newspaper, label: 'News' },
    { icon: Sparkles, label: 'Ignisha AI' },
    { icon: Bookmark, label: 'Saved Items' },
    { icon: User, label: 'Profile' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col">
      <style>{`
        /* Mobile optimizations */
        @media (max-width: 1024px) {
          .safe-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
        
        /* Smooth transitions */
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>

       {/* Sidebar Component (Handles both Desktop and Mobile views) */}
       <DashboardSidebar
         sidebarItems={sidebarItems}
         activeTab={activeTab}
         setActiveTab={setActiveTab}
         isSidebarOpen={isSidebarOpen}
         setIsSidebarOpen={setIsSidebarOpen}
         isSidebarCollapsed={isSidebarCollapsed}
         setIsSidebarCollapsed={setIsSidebarCollapsed}
         currentRole={currentRole}
         handleRoleChange={handleRoleChange as any}
         handleLogout={handleLogout}
         logoImage={logoImage}
         squareLogo={squareLogo}
         unreadMessages={unreadMessages}
         upcomingEvents={upcomingEvents}
         isNotificationsOpen={isNotificationsOpen}
         setIsNotificationsOpen={setIsNotificationsOpen}
         initialMessageUserId={initialMessageUserId}
         setInitialMessageUserId={setInitialMessageUserId}
         discoverSubTab={discoverSubTab}
         setDiscoverSubTab={setDiscoverSubTab}
       />

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'xl:ml-20' : 'xl:ml-64'} flex-1 min-h-0 overflow-hidden ${['Funding Portal', 'Ignisha AI'].includes(activeTab) ? 'pt-[env(safe-area-inset-top)]' : ''} flex flex-col`}>
        {/* Top Header */}
        {!['Funding Portal', 'Ignisha AI'].includes(activeTab) && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] flex-shrink-0 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-4 lg:px-6 py-3">
              <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                <button
                  className="xl:hidden p-2 -ml-2 hover:bg-gray-50 rounded-xl flex-shrink-0 transition-colors"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{activeTab}</span>
                  {activeTab === 'Home Feed' && isVerified && (
                    <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </h1>
              </div>

              <div className="flex items-center gap-1.5 lg:gap-4 flex-shrink-0">
                {/* Desktop Role Switcher */}
                <div className="hidden xl:block">
                  <RoleSwitcher
                    currentRole={currentRole}
                    onRoleChange={handleRoleChange}
                  />
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded-xl transition-all border border-red-100/50 active:scale-95 shadow-sm"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider">Logout</span>
                </button>
                <button onClick={() => setActiveTab('Profile')} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-orange-500 to-blue-600 flex items-center justify-center text-white font-bold overflow-hidden border border-white shadow-sm flex-shrink-0 relative">
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
                      <div className="hidden items-center justify-center w-full h-full text-white text-xs lg:text-sm">
                        {currentUser?.name ? Array.from(currentUser.name.split(' ').map((n: string) => Array.from(n)[0]).join('')).slice(0, 2).join('').toUpperCase() : 'JD'}
                      </div>
                    </>
                  ) : (
                    currentUser?.name ? Array.from(currentUser.name.split(' ').map((n: string) => Array.from(n)[0]).join('')).slice(0, 2).join('').toUpperCase() : 'JD'
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
          userRole="founder"
        />

        {/* Verification Banner */}
        {showVerificationBanner && !isVerified && (
          <VerificationBanner
            userRole="founder"
            userName={currentUser?.name}
            isPending={currentUser?.verificationStatus === 'pending'}
            onComplete={completeVerification}
            onDismiss={() => dismissVerificationBanner(24)}
            onClose={() => dismissVerificationBanner(24)}
          />
        )}

        <div className={`flex-1 min-h-0 ${['Communities', 'Ignisha AI', 'Messages', 'Funding Portal'].includes(activeTab) ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {/* Home Feed Tab */}
          {activeTab === 'Home Feed' && (
            <div className="space-y-6 pb-24 lg:pb-8">
              <DashboardWidgets compact={isCompact} label="Dashboard">
              {/* Dashboard Stats Widget */}
              <div className="grid grid-cols-2 gap-4 px-4 lg:mx-[24px] mt-[16px]">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardStats.profileViews}</p>
                      <p className="text-xs text-gray-500">Profile Views</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardStats.connections}</p>
                      <p className="text-xs text-gray-500">Connections</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardStats.investorInterest}</p>
                      <p className="text-xs text-gray-500">Investor Interest</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardStats.fundingProgress}%</p>
                      <p className="text-xs text-gray-500">Funding Progress</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Engagement (LinkedIn-style) */}
              <AccountEngagementCard />

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm mx-4 lg:mx-[24px] mt-[16px]">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className="flex flex-col items-start p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${action.color}20` }}
                      >
                        <action.icon className="w-5 h-5" style={{ color: action.color }} />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{action.title}</h3>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Creation Section */}
              {(!profilesCreated.expert || !profilesCreated.investor) && (
                <div className="mx-4 lg:mx-[24px] mt-[16px]">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Expand Your Reach</h2>
                  <div className="space-y-3">
                    <ProfileCreationCard
                      type="expert"
                      isCreated={profilesCreated.expert}
                      onCreateClick={() => setProfileCreationModal('expert')}
                    />
                    <ProfileCreationCard
                      type="investor"
                      isCreated={profilesCreated.investor}
                      onCreateClick={() => setProfileCreationModal('investor')}
                    />
                  </div>
                </div>
              )}
              </DashboardWidgets>

              <EnhancedHomeFeed
                userType="founder"
                openCreateModal={openHomeFeedCreatePost}
                onCreateModalClose={() => setOpenHomeFeedCreatePost(false)}
              />
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
                    userType="founder"
                    initialFilter="Saved"
                  />
                ) : savedTab === 'Profiles' ? (
                  <SavedProfilesList onMessage={(userId) => { setInitialMessageUserId(String(userId)); setActiveTab('Messages'); }} />
                ) : (
                  <SavedStartupsList />
                )}
              </div>
            </div>
          )}

          {/* My Startup Tab - Shows Startup Profile */}
          {activeTab === 'My Startup' && (
            <div className="max-w-7xl mx-auto">
              <MyStartupPage
                userRole="founder"
                onNavigate={(tab, subTab) => {
                  setActiveTab(tab);
                  if (subTab && tab === 'Discover') setDiscoverSubTab(subTab);
                }}
              />
            </div>
          )}

          {/* Discover Tab */}
          {activeTab === 'Discover' && (
            <div>
              {/* Sub-tab Navigation */}
              <div className="bg-white rounded-xl p-1.5 shadow-sm flex gap-2 mt-[16px] mx-4 lg:mx-[24px] mb-[24px] overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setDiscoverSubTab('Experts')}
                  className={`whitespace-nowrap flex-1 px-5 lg:px-6 py-2.5 lg:py-3 rounded-lg font-bold transition-all text-sm min-w-fit ${discoverSubTab === 'Experts'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  style={discoverSubTab === 'Experts' ? {
                    background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                  } : {}}
                >
                  Find Experts
                </button>
                <button
                  onClick={() => setDiscoverSubTab('CoFounders')}
                  className={`whitespace-nowrap flex-1 px-5 lg:px-6 py-2.5 lg:py-3 rounded-lg font-bold transition-all text-sm min-w-fit ${discoverSubTab === 'CoFounders'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  style={discoverSubTab === 'CoFounders' ? {
                    background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                  } : {}}
                >
                  Find Founders/Co-Founders
                </button>
                <button
                  onClick={() => setDiscoverSubTab('Investors')}
                  className={`whitespace-nowrap flex-1 px-5 lg:px-6 py-2.5 lg:py-3 rounded-lg font-bold transition-all text-sm min-w-fit ${discoverSubTab === 'Investors'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  style={discoverSubTab === 'Investors' ? {
                    background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                  } : {}}
                >
                  Investors
                </button>
                <button
                  onClick={() => setDiscoverSubTab('Startups')}
                  className={`whitespace-nowrap flex-1 px-5 lg:px-6 py-2.5 lg:py-3 rounded-lg font-bold transition-all text-sm min-w-fit ${discoverSubTab === 'Startups'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  style={discoverSubTab === 'Startups' ? {
                    background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                  } : {}}
                >
                  Explore Startups
                </button>
              </div>

              {/* Sub-tab Content */}
              {discoverSubTab === 'Experts' && <DiscoverExperts onMessage={(userId) => { setInitialMessageUserId(userId); setActiveTab('Messages'); }} />}
              {discoverSubTab === 'CoFounders' && <DiscoverCoFounders onMessage={(userId) => { setInitialMessageUserId(userId); setActiveTab('Messages'); }} />}
              {discoverSubTab === 'Investors' && (
                <DiscoverInvestors
                  excludeUserId={userId ? String(userId) : undefined}
                  onMessage={(id) => {
                    setInitialMessageUserId(String(id));
                    setActiveTab('Messages');
                  }}
                />
              )}
              {discoverSubTab === 'Startups' && <DiscoverStartups />}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'Messages' && (
            <MessagingPage initialUserId={initialMessageUserId} onBack={() => setActiveTab('Home Feed')} />
          )}

          {/* Communities Tab */}
          {activeTab === 'Communities' && (
            userId ? <CommunitiesPage userRole="founder" userId={userId} onBack={() => setActiveTab('Home Feed')} /> : null
          )}


          {/* Funding Portal Tab — Pro/Elite only. Free users (incl. free iOS) are
              sent to the paywall instead of reaching it via the sidebar nav. */}
          {activeTab === 'Funding Portal' && (
            userPlan === 'free'
              ? (() => { window.location.hash = '#pricing'; return null; })()
              : <FundingPortalFounder onBackToDashboard={() => setActiveTab('Home Feed')} onMenuClick={() => setIsSidebarOpen(true)} />
          )}

          {/* Events Tab */}
          {activeTab === 'Events' && (
            <EventsPage userRole="founder" onBack={() => setActiveTab('Home Feed')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader />
          )}

          {/* Podcasts Tab */}
          {activeTab === 'Podcasts' && (
            <PodcastsPage userRole="founder" onBack={() => setActiveTab('Home Feed')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} />
          )}

          {/* Startup Resources Tab */}
          {activeTab === 'Startup Resources' && (
            <StartupResourcesPage userRole="founder" onBack={() => setActiveTab('Home Feed')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} />
          )}

          {/* News Tab */}
          {activeTab === 'News' && (
            <NewsFeedPage userRole="founder" onBack={() => setActiveTab('Home Feed')} onMenuClick={() => setIsSidebarOpen(true)} hideHeader />
          )}

          {/* Ignisha AI Tab */}
          {activeTab === 'Ignisha AI' && (
            <IgnishaAIDashboard userRole="founder" onBack={() => setActiveTab('Home Feed')} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser ? { id: currentUser.id || currentUser._id, name: currentUser.name || '', avatar: currentUser.avatar } : undefined} onMessageUser={(userId) => { setInitialMessageUserId(String(userId)); setActiveTab('Messages'); }} />
          )}

          {/* Profile Tab */}
          {activeTab === 'Profile' && (
            <ProfilePage
              userRole="founder"
              onNavigateToSettings={() => setActiveTab('Settings')}
              onNavigateToMyStartup={() => setActiveTab('My Startup')}
              onBack={() => setActiveTab('Home Feed')}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'Settings' && <SettingsPage userRole="founder" onBack={() => setActiveTab('Home Feed')} hideMobileHeader={true} />}

          {/* Explore Startups Tab */}
          {activeTab === 'Explore Startups' && <DiscoverStartups />}

          {/* Placeholder for other tabs */}
          {!['Home Feed', 'My Startup', 'Profile', 'Discover', 'Messages', 'Communities', 'Funding Portal', 'Events', 'Podcasts', 'Startup Resources', 'News', 'Ignisha AI', 'Settings', 'Saved Items', 'Explore Startups'].includes(activeTab) && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{activeTab}</h2>
                <p className="text-gray-600">Select an option from the menu to get started.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {activeTab !== 'Funding Portal' && (
        <nav
          className="xl:hidden flex-shrink-0 bg-white border-t border-gray-200 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
          style={{ zIndex: 500 }}
        >
        <div className="relative">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {/* Home */}
            <button
              onClick={() => setActiveTab('Home Feed')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${activeTab === 'Home Feed' ? 'text-orange-500' : 'text-gray-600'
                }`}
            >
              <Home className="w-6 h-6" fill={activeTab === 'Home Feed' ? 'currentColor' : 'none'} />
              <span className="text-xs font-medium">Home</span>
            </button>

            {/* Discover */}
            <button
              onClick={() => setActiveTab('Discover')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${activeTab === 'Discover' ? 'text-orange-500' : 'text-gray-600'
                }`}
            >
              <Compass className="w-6 h-6" />
              <span className="text-xs font-medium">Discover</span>
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
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg relative transition-colors ${activeTab === 'Messages' ? 'text-orange-500' : 'text-gray-600'
                }`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-medium">Messages</span>
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>

            {/* More Menu */}
            <button
              onClick={() => setActiveTab('Communities')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${activeTab === 'Communities' ? 'text-orange-500' : 'text-gray-600'
                }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs font-medium">Communities</span>
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
            setProfileCreationModal(null);
            fetchProfilesCreated();
          }}
        />
      )}
    </div>
  );
}
