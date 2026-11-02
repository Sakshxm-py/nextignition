import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SidebarItem } from '../../types/dashboard';
import { brandColors } from '../../utils/colors';
import logoImage from '../../assets/logo.png';

interface DashboardMobileSidebarProps {
  sidebarItems: SidebarItem[];
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: string) => void;
}

export function DashboardMobileSidebar({
  sidebarItems,
  activeTab,
  isOpen,
  onClose,
  onTabChange,
}: DashboardMobileSidebarProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 bg-black/50 z-[99998] flex pointer-events-auto" onClick={onClose}>
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="fixed left-0 top-0 h-screen w-64 bg-white z-[99999] pt-[env(safe-area-inset-top)] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoImage} alt="NextIgnition" className="h-8 w-8 object-contain shrink-0" />
            <span className="text-lg font-bold text-gray-900 tracking-tight truncate">NextIgnition</span>
          </div>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="px-3 pt-4">
          {sidebarItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => {
                onTabChange(item.label);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                activeTab === item.label
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
      </motion.aside>
    </div>
  );
}
