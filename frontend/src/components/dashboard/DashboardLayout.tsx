import { ReactNode } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardMobileSidebar } from './DashboardMobileSidebar';
import { DashboardHeader } from './DashboardHeader';
import { DashboardMobileNav } from './DashboardMobileNav';
import { NotificationsDropdown } from '../NotificationsDropdown';
import { SidebarItem } from '../../types/dashboard';
import { UserRole } from '../RoleSwitcher';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  icon: LucideIcon;
  label: string;
  tab: string;
  hasBadge?: boolean;
  fillIcon?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  mobileNavItems: NavItem[];
  activeTab: string;
  currentRole: UserRole;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isNotificationsOpen: boolean;
  onTabChange: (tab: string) => void;
  onRoleChange: (role: UserRole) => void;
  onSidebarToggle: () => void;
  onSidebarClose: () => void;
  onSidebarCollapseToggle: () => void;
  onNotificationsToggle: () => void;
  onNotificationsClose: () => void;
  onLogout?: () => void;
  onCenterAction?: () => void;
  userAvatar?: string;
}

export function DashboardLayout({
  children,
  sidebarItems,
  mobileNavItems,
  activeTab,
  currentRole,
  isSidebarOpen,
  isSidebarCollapsed,
  isNotificationsOpen,
  onTabChange,
  onRoleChange,
  onSidebarToggle,
  onSidebarClose,
  onSidebarCollapseToggle,
  onNotificationsToggle,
  onNotificationsClose,
  onLogout,
  onCenterAction,
  userAvatar = 'JD',
}: DashboardLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${isSidebarOpen ? 'overflow-hidden' : ''}`}>
      {/* Desktop Sidebar */}
      <DashboardSidebar
        sidebarItems={sidebarItems}
        activeTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        onTabChange={onTabChange}
        onToggleCollapse={onSidebarCollapseToggle}
      />

      {/* Mobile Sidebar Overlay */}
      <DashboardMobileSidebar
        sidebarItems={sidebarItems}
        activeTab={activeTab}
        isOpen={isSidebarOpen}
        onClose={onSidebarClose}
        onTabChange={onTabChange}
      />

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0`}>
        {/* Top Header */}
        <DashboardHeader
          activeTab={activeTab}
          currentRole={currentRole}
          onMenuClick={onSidebarToggle}
          onRoleChange={onRoleChange}
          onNotificationsClick={onNotificationsToggle}
          onLogoutClick={onLogout}
          userAvatar={userAvatar}
        />

        {/* Notifications Dropdown */}
        <NotificationsDropdown 
          isOpen={isNotificationsOpen}
          onClose={onNotificationsClose}
          userRole={currentRole}
        />

        {/* Page Content */}
        <div>{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <DashboardMobileNav
        items={mobileNavItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCenterAction={onCenterAction}
      />
    </div>
  );
}
