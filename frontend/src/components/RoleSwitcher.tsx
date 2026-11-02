import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Lightbulb, DollarSign, ChevronDown, Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { brandColors } from '../utils/colors';
import { getProfilesCreated, switchRole } from '../services/authService';

export type UserRole = 'founder' | 'expert' | 'investor';

interface RoleOption {
  role: UserRole;
  label: string;
  icon: typeof Briefcase;
  color: string;
  notifications: number;
  description: string;
  isAvailable?: boolean;
  lockedMessage?: string;
}

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isMobile?: boolean;
}

export function RoleSwitcher({ currentRole, onRoleChange, isMobile = false }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastRole, setToastRole] = useState<UserRole | null>(null);
  const [previousRole, setPreviousRole] = useState<UserRole>(currentRole);
  const [profilesCreated, setProfilesCreated] = useState({ founder: false, expert: false, investor: false });
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfilesCreated = async () => {
      try {
        const data = await getProfilesCreated();
        setProfilesCreated(data);
      } catch (error) {
        console.error('Failed to fetch profiles created:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfilesCreated();
  }, []);

  const getRoleOptions = (): RoleOption[] => {
    return [
      {
        role: 'founder',
        label: 'Founder',
        icon: Briefcase,
        color: brandColors.electricBlue,
        notifications: 0,
        description: 'Build and grow your startup',
        isAvailable: true,
        lockedMessage: 'Create a Founder profile to access'
      },
      {
        role: 'expert',
        label: 'Expert',
        icon: Lightbulb,
        color: brandColors.atomicOrange,
        notifications: 0,
        description: 'Share expertise and mentor',
        isAvailable: profilesCreated.expert,
        lockedMessage: 'Create an Expert profile to access'
      },
      {
        role: 'investor',
        label: 'Investor/VC',
        icon: DollarSign,
        color: brandColors.navyBlue,
        notifications: 0,
        description: 'Discover investment opportunities',
        isAvailable: profilesCreated.investor,
        lockedMessage: 'Create an Investor profile to access'
      },
    ];
  };

  const roleOptions = getRoleOptions();
  const currentRoleData = roleOptions.find(r => r.role === currentRole);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastRole(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === currentRole) {
      setIsOpen(false);
      return;
    }

    const option = roleOptions.find(r => r.role === newRole);

    try {
      setPreviousRole(currentRole);
      setToastRole(newRole);
      await switchRole(newRole);
      onRoleChange(newRole);
      window.location.hash = `#${newRole}-dashboard`;
      setToastMessage(`Switched to ${option?.label || newRole}`);
      setShowToast(true);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to switch role:', error);
      setToastMessage(error?.response?.data?.message || 'Failed to switch role');
      setShowToast(true);
    }
  };

  const handleUndo = () => {
    if (previousRole) {
      onRoleChange(previousRole);
      setShowToast(false);
      setToastRole(null);
    }
  };

  if (isMobile) {
    // Mobile version - Full screen menu
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {currentRoleData && (
              <>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${currentRoleData.color}15` }}
                >
                  <currentRoleData.icon className="w-5 h-5" style={{ color: currentRoleData.color }} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-gray-900">Switch Role</h4>
                  <p className="text-sm text-gray-600">Currently: {currentRoleData.label}</p>
                </div>
              </>
            )}
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </button>

        {/* Mobile Full Screen Modal */}
        {typeof document !== 'undefined' ? createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center"
                style={{ zIndex: 999999 }}
                onClick={() => setIsOpen(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white w-full max-w-md rounded-t-3xl lg:rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Switch Role</h2>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {roleOptions.map((option) => (
                      <motion.button
                        key={option.role}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRoleSwitch(option.role)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                          currentRole === option.role
                            ? 'border-current bg-opacity-10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={
                          currentRole === option.role
                            ? {
                                borderColor: option.color,
                                backgroundColor: `${option.color}10`,
                              }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${option.color}20` }}
                          >
                            <option.icon className="w-6 h-6" style={{ color: option.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">{option.label}</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                              {option.description}
                            </p>
                          </div>
                          {currentRole === option.role && (
                            <Check className="w-5 h-5 flex-shrink-0" style={{ color: option.color }} />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        ) : null}

        {/* Toast Notification - Mobile */}
        {typeof document !== 'undefined' ? createPortal(
          <AnimatePresence>
            {showToast && toastRole && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-20 left-4 right-4"
                style={{ zIndex: 999999 }}
              >
                <div className="bg-gray-900 text-white rounded-xl p-4 shadow-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${
                          roleOptions.find((r) => r.role === toastRole)?.color
                        }30`,
                      }}
                    >
                      {(() => {
                        const Icon = roleOptions.find((r) => r.role === toastRole)?.icon;
                        return Icon ? (
                          <Icon
                            className="w-5 h-5"
                            style={{
                              color: roleOptions.find((r) => r.role === toastRole)?.color,
                            }}
                          />
                        ) : null;
                      })()}
                    </div>
                    <div>
                      <p className="font-bold">{toastMessage || `Switched to ${roleOptions.find((r) => r.role === toastRole)?.label}`}</p>
                      <p className="text-sm text-gray-300">{toastMessage?.includes('Locked') || toastMessage?.includes('Create') ? '' : 'Dashboard updated'}</p>
                    </div>
                  </div>
                  {toastMessage && !toastMessage.includes('Locked') && !toastMessage.includes('Create') && (
                    <button
                      onClick={handleUndo}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm transition-colors"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        ) : null}
      </>
    );
  }

  // Desktop version - Dropdown
  return (
    <>
      <div className="relative z-50" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {currentRoleData && (
            <>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center relative"
                style={{ backgroundColor: `${currentRoleData.color}15` }}
              >
                <currentRoleData.icon className="w-4 h-4" style={{ color: currentRoleData.color }} />
                {currentRoleData.notifications > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: currentRoleData.color }}
                  >
                    {currentRoleData.notifications}
                  </span>
                )}
              </div>
              <div className="text-left">
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: currentRoleData.color }}
                >
                  {currentRoleData.label}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:absolute lg:top-full lg:bottom-auto lg:right-0 lg:left-auto lg:translate-x-0 lg:translate-y-0 lg:mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
            >
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-900 text-sm">Switch Role</h3>
                <p className="text-xs text-gray-600 mt-0.5">Choose your active dashboard</p>
              </div>

              <div className="p-2">
                {roleOptions.map((option) => (
                  <motion.button
                    key={option.role}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSwitch(option.role)}
                    className={`w-full p-3 rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
                      currentRole === option.role
                        ? 'bg-opacity-10'
                        : 'hover:bg-gray-50'
                    }`}
                    style={
                      currentRole === option.role
                        ? { backgroundColor: `${option.color}15` }
                        : {}
                    }
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${option.color}20` }}
                    >
                      <option.icon className="w-5 h-5" style={{ color: option.color }} />
                      {option.notifications > 0 && currentRole !== option.role && (
                        <span
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                          style={{ backgroundColor: option.color }}
                        >
                          {option.notifications}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{option.label}</h4>
                        {currentRole === option.role && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: option.color }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
                      {option.notifications > 0 && currentRole !== option.role && (
                        <p className="text-xs font-medium mt-1" style={{ color: option.color }}>
                          {option.notifications} unread notification{option.notifications > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    {currentRole === option.role && (
                      <Check className="w-5 h-5 flex-shrink-0" style={{ color: option.color }} />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification - Desktop */}
      <AnimatePresence>
        {showToast && toastRole && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-20 right-6 z-50"
          >
            <div className="bg-gray-900 text-white rounded-xl p-4 shadow-2xl flex items-center gap-4 min-w-[320px]">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${
                    roleOptions.find((r) => r.role === toastRole)?.color
                  }30`,
                }}
              >
                {(() => {
                  const Icon = roleOptions.find((r) => r.role === toastRole)?.icon;
                  return Icon ? (
                    <Icon
                      className="w-6 h-6"
                      style={{
                        color: roleOptions.find((r) => r.role === toastRole)?.color,
                      }}
                    />
                  ) : null;
                })()}
              </div>
              <div className="flex-1">
                <p className="font-bold">Switched to {roleOptions.find((r) => r.role === toastRole)?.label} Dashboard</p>
                <p className="text-sm text-gray-300">Your workspace has been updated</p>
              </div>
              <button
                onClick={handleUndo}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
              >
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}