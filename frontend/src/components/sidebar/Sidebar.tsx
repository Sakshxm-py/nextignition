import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { brandColors } from "../../utils/colors";
import { RoleSwitcher, UserRole } from "../RoleSwitcher";

import {
  Home,
  Rocket,
  Compass,
  MessageCircle,
  DollarSign,
  Users,
  Calendar,
  Mic,
  BookOpen,
  Newspaper,
  Sparkles,
  Bookmark,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  BarChart3,
  Briefcase,
  FolderOpen,
  PieChart,
  Target,
  Headphones,
  FileText,
  Award,
  Video,
  Star,
  CheckCircle,
  Eye,
  ThumbsUp,
  LogOut,
  MapPin,
  ArrowUpRight,
  Heart,
  Plus,
} from "lucide-react";

interface SidebarItem {
  icon: any;
  label: string;
  badge?: number | undefined;
}

interface DashboardSidebarProps {
  sidebarItems: SidebarItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  currentRole: string;
  handleRoleChange: (newRole: string) => void;
  handleLogout: () => void;
  logoImage: string;
  squareLogo: string;
  unreadMessages?: number;
  upcomingEvents?: number;
  isNotificationsOpen?: boolean;
  setIsNotificationsOpen?: (open: boolean) => void;
  initialMessageUserId?: string | undefined;
  setInitialMessageUserId?: (id: string | undefined) => void;
  discoverSubTab?: string;
  setDiscoverSubTab?: (tab: string) => void;
  view?: string;
  setView?: (view: string) => void;
}

export function DashboardSidebar({
  sidebarItems,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  currentRole,
  handleRoleChange,
  handleLogout,
  logoImage,
  squareLogo,
  unreadMessages,
  upcomingEvents,
  isNotificationsOpen,
  setIsNotificationsOpen,
  initialMessageUserId,
  setInitialMessageUserId,
  discoverSubTab,
  setDiscoverSubTab,
  view,
  setView,
}: DashboardSidebarProps) {
  // Mobile-specific state
  const [openHomeFeedCreatePost, setOpenHomeFeedCreatePost] = useState(false);
  const [profileCreationModal, setProfileCreationModal] = useState<'expert' | 'investor' | null>(null);
  const [profilesCreated, setProfilesCreated] = useState({ founder: false, expert: false, investor: false });
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Handle role change for mobile
  const handleMobileRoleChange = (newRole: string) => {
    handleRoleChange(newRole);
    setActiveTab('Home Feed'); // Reset view
    setIsSidebarOpen(false); // Close sidebar on role switch
  };

  // Handle logout for mobile
  const handleMobileLogout = () => {
    handleLogout();
    // In a real app, you'd redirect to homepage
  };

  return (
    <>
      {/* Desktop Sidebar */}
      {!isSidebarOpen && (
        <motion.aside
          animate={{ width: isSidebarCollapsed ? 80 : 256 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="hidden xl:block fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-40 overflow-hidden"
        >
          <div className="p-6 flex items-center justify-center">
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
                onClick={() => window.location.href = '/'}
              />
            )}
          </div>

          <nav className="px-3 overflow-y-auto pb-20" style={{ height: 'calc(100vh - 88px - 72px)', WebkitOverflowScrolling: 'touch' }}>
            {sidebarItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveTab(item.label);
                  // Handle view changes for investor dashboard
                  if (item.label === 'Home Feed' && setView) setView('home');
                  else if (item.label === 'Discover' && setView) setView('discover');
                  else if (item.label === 'Pipeline' && setView) setView('pipeline');
                  else if (item.label === 'Portfolio' && setView) setView('portfolio');
                  else if (item.label === 'Deal Rooms' && setView) setView('dealroom');
                }}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-1 transition-all relative group ${activeTab === item.label
                  ? item.label === 'Ignisha AI'
                    ? 'text-white'
                    : 'bg-gradient-to-r text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
                style={activeTab === item.label ?
                  item.label === 'Ignisha AI'
                    ? {
                        backgroundColor: brandColors.electricBlue,
                        borderLeft: `4px solid ${brandColors.atomicOrange}`,
                        boxShadow: '0 0 20px rgba(102, 102, 255, 0.3)'
                      }
                    : {
                        background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})`
                      }
                  : {}
                }
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
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
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
      )}

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
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <RoleSwitcher 
                  currentRole={currentRole as UserRole} 
                  onRoleChange={(role) => handleMobileRoleChange(role)} 
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
                      if (item.label === 'Home Feed' && setView) setView('home');
                      else if (item.label === 'Discover' && setView) setView('discover');
                      else if (item.label === 'Pipeline' && setView) setView('pipeline');
                      else if (item.label === 'Portfolio' && setView) setView('portfolio');
                      else if (item.label === 'Deal Rooms' && setView) setView('dealroom');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${activeTab === item.label
                      ? 'bg-gradient-to-r text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    style={activeTab === item.label ? {
                      background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})`
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
                  onClick={handleMobileLogout}
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
    </>
  );
}
