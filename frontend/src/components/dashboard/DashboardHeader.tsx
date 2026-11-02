import { Menu, Bell, LogOut } from 'lucide-react';
import { RoleSwitcher, UserRole } from '../RoleSwitcher';

interface DashboardHeaderProps {
  activeTab: string;
  currentRole: UserRole;
  onMenuClick: () => void;
  onRoleChange: (role: UserRole) => void;
  onNotificationsClick: () => void;
  onLogoutClick?: () => void;
  hasNotification?: boolean;
  userAvatar?: string;
}

export function DashboardHeader({
  activeTab,
  currentRole,
  onMenuClick,
  onRoleChange,
  onNotificationsClick,
  onLogoutClick,
  hasNotification = true,
  userAvatar = 'JD',
}: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 lg:px-[24px] py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">{activeTab}</h1>
        </div>
        
        <div className="flex items-center gap-1.5 lg:gap-4">
          {/* Desktop Role Switcher */}
          <div className="hidden lg:block">
            <RoleSwitcher 
              currentRole={currentRole} 
              onRoleChange={onRoleChange}
            />
          </div>
          <button 
            onClick={onNotificationsClick}
            className="relative p-2 hover:bg-gray-100 rounded-full"
          >
            <Bell className="w-6 h-6" />
            {hasNotification && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          {onLogoutClick && (
            <button
              onClick={onLogoutClick}
              className="p-2 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          )}
          <button className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-orange-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm lg:text-base">
            {userAvatar}
          </button>
        </div>
      </div>
    </header>
  );
}
