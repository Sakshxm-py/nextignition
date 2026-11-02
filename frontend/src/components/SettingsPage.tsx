import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Lock,
  Bell,
  CreditCard,
  Sliders,
  Shield,
  HelpCircle,
  Briefcase,
  TrendingUp,
  ChevronRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { ProfileSettingsTab } from './settings/ProfileSettingsTab';
import { ExpertProfileSettingsTab } from './settings/ExpertProfileSettingsTab';
import { InvestorProfileSettingsTab } from './settings/InvestorProfileSettingsTab';
import { AccountSecurityTab } from './settings/AccountSecurityTab';
import { NotificationsTab } from './settings/NotificationsTab';
import { SubscriptionBillingTab } from './settings/SubscriptionBillingTab';
import { PreferencesTab } from './settings/PreferencesTab';
import { PrivacyDataTab } from './settings/PrivacyDataTab';
import { HelpSupportTab } from './settings/HelpSupportTab';

type UserRole = 'founder' | 'expert' | 'investor';

interface SettingsPageProps {
  userRole: UserRole;
  onBack?: () => void;
  hideMobileHeader?: boolean;
}

interface SettingsTab {
  id: string;
  label: string;
  icon: any;
  component: any;
}

export function SettingsPage({ userRole, onBack, hideMobileHeader = false }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('nextignition_settings_tab') || 'profile';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId) {
      localStorage.setItem('nextignition_settings_tab', tabId);
    }
  };

  // Define tabs based on user role
  const getTabsForRole = (): SettingsTab[] => {
    const commonTabs: SettingsTab[] = [
      { id: 'profile', label: 'Profile Settings', icon: User, component: ProfileSettingsTab },
      { id: 'account', label: 'Account & Security', icon: Lock, component: AccountSecurityTab },
      { id: 'notifications', label: 'Notifications', icon: Bell, component: NotificationsTab },
      ...(Capacitor.getPlatform() !== 'ios' ? [{ id: 'subscription', label: 'Subscription & Billing', icon: CreditCard, component: SubscriptionBillingTab }] : []),
      { id: 'preferences', label: 'Preferences', icon: Sliders, component: PreferencesTab },
    ];

    // Role-specific tab
    let roleSpecificTab: SettingsTab | null = null;
    if (userRole === 'expert') {
      roleSpecificTab = { id: 'expert-profile', label: 'Expert Profile Settings', icon: Briefcase, component: ExpertProfileSettingsTab };
    } else if (userRole === 'investor') {
      roleSpecificTab = { id: 'investor-profile', label: 'Investment Profile Settings', icon: TrendingUp, component: InvestorProfileSettingsTab };
    }

    // Build final tab list
    const tabs: SettingsTab[] = [
      commonTabs[0],
      ...(roleSpecificTab ? [roleSpecificTab] : []),
      ...commonTabs.slice(1),
    ];

    // Add final common tabs
    tabs.push(
      { id: 'privacy', label: 'Privacy & Data', icon: Shield, component: PrivacyDataTab },
      { id: 'help', label: 'Help & Support', icon: HelpCircle, component: HelpSupportTab }
    );

    return tabs;
  };

  const tabs = getTabsForRole();
  // A tab persisted under another role (e.g. 'expert-profile') may not exist for
  // the current role — fall back to the first tab instead of a blank panel.
  const activeTabExists = tabs.some(tab => tab.id === activeTab);
  const effectiveTab = activeTabExists ? activeTab : tabs[0]?.id;
  const ActiveComponent = tabs.find(tab => tab.id === effectiveTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header (Hidden if managed by dashboard) */}
      {!hideMobileHeader && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onBack ? onBack() : window.history.back()}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold">Settings</h1>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Settings Sidebar - 25% width */}
        <aside className="w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" style={{ color: brandColors.electricBlue }} />
              Settings
            </h2>
          </div>
          
          <nav className="p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all text-left relative ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={activeTab === tab.id ? {
                  background: brandColors.electricBlue,
                  borderLeft: `4px solid ${brandColors.atomicOrange}`
                } : {}}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content - 75% width */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-8"
            >
              {ActiveComponent && <ActiveComponent userRole={userRole} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Accordion View */}
      <div className="lg:hidden">
        {tabs.map((tab) => (
          <MobileSettingsSection
            key={tab.id}
            tab={tab}
            userRole={userRole}
            isOpen={activeTab === tab.id}
            onToggle={() => handleTabChange(activeTab === tab.id ? '' : tab.id)}
          />
        ))}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setIsMobileSidebarOpen(false)}>
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            className="fixed left-0 top-0 h-screen w-80 bg-white z-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Settings Menu</h2>
              <button onClick={() => setIsMobileSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabChange(tab.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all text-left ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={activeTab === tab.id ? {
                    background: brandColors.electricBlue
                  } : {}}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              ))}
            </nav>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Mobile Accordion Section Component
function MobileSettingsSection({ tab, userRole, isOpen, onToggle }: any) {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <tab.icon className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
          <span className="font-medium">{tab.label}</span>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gray-50 px-4 py-4"
        >
          <tab.component userRole={userRole} />
        </motion.div>
      )}
    </div>
  );
}
