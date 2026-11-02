import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { SidebarItem } from '../../types/dashboard';
import { brandColors } from '../../utils/colors';
import logoImage from '../../assets/logo.png';
import squareLogo from '../../assets/logo-square.png';

interface DashboardSidebarProps {
  sidebarItems: SidebarItem[];
  activeTab: string;
  isCollapsed: boolean;
  onTabChange: (tab: string) => void;
  onToggleCollapse: () => void;
}

export function DashboardSidebar({
  sidebarItems,
  activeTab,
  isCollapsed,
  onTabChange,
  onToggleCollapse,
}: DashboardSidebarProps) {
  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="hidden lg:block fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-40 overflow-hidden"
    >
      <div className="p-6 flex items-center justify-center">
        {isCollapsed ? (
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
      
      <nav className="px-3">
        {sidebarItems.map((item, index) => (
          <button
            key={item.label}
            onClick={() => onTabChange(item.label)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-1 transition-all relative group ${
              activeTab === item.label
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
            title={isCollapsed ? item.label : ''}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {isCollapsed && item.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
            {/* Tooltip on hover when collapsed */}
            {isCollapsed && (
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
          onClick={onToggleCollapse}
          className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
    </motion.aside>
  );
}
