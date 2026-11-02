import { LucideIcon, Plus } from 'lucide-react';

interface NavItem {
  icon: LucideIcon;
  label: string;
  tab: string;
  hasBadge?: boolean;
  fillIcon?: boolean;
}

interface DashboardMobileNavProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCenterAction?: () => void;
}

export function DashboardMobileNav({
  items,
  activeTab,
  onTabChange,
  onCenterAction,
}: DashboardMobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {items.map((item, index) => {
          if (index === 2 && onCenterAction) {
            // Center button (Create/Add action)
            return (
              <button 
                key="center-action"
                onClick={onCenterAction}
                className="flex flex-col items-center gap-1 py-2 px-3"
              >
                <div className="w-12 h-12 -mt-6 bg-gradient-to-r from-orange-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </button>
            );
          }
          
          return (
            <button 
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg relative ${
                activeTab === item.tab ? 'text-orange-500' : 'text-gray-600'
              }`}
            >
              <item.icon 
                className="w-6 h-6" 
                fill={item.fillIcon && activeTab === item.tab ? 'currentColor' : 'none'} 
              />
              <span className="text-xs font-medium">{item.label}</span>
              {item.hasBadge && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
