import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { brandColors } from '../utils/colors';

export interface QuickAction {
  icon: any;
  title: string;
  description?: string;
  color?: string;
  action: () => void;
}

interface QuickActionsFabProps {
  actions: QuickAction[];
  /** Optional label shown above the action list. */
  label?: string;
}

/**
 * Floating action button that holds a role's quick actions in a popover
 * instead of taking up space on the dashboard. Mounted by each role
 * dashboard with its own set of actions.
 */
export function QuickActionsFab({ actions, label = 'Quick Actions' }: QuickActionsFabProps) {
  const [open, setOpen] = useState(false);

  if (!actions || actions.length === 0) return null;

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div
      className="fixed right-4 bottom-24 lg:right-8 lg:bottom-8 flex flex-col items-end gap-3"
      style={{ zIndex: 600 }}
    >
      {/* The list renders above the FAB; the FAB stays pinned at the bottom */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop to close on outside tap */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/30"
              style={{ zIndex: -1 }}
            />

            {/* Action list */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2 border-b border-gray-50">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                {actions.map((action, index) => {
                  const color = action.color || brandColors.electricBlue;
                  return (
                    <button
                      key={index}
                      onClick={() => runAction(action.action)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <action.icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{action.title}</h3>
                        {action.description && (
                          <p className="text-xs text-gray-500 truncate">{action.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB — glassmorphism */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        className="w-14 h-14 rounded-full flex items-center justify-center text-white backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.37)]"
        style={{
          background: `linear-gradient(135deg, ${brandColors.electricBlue}cc, ${brandColors.navyBlue}b3)`,
          boxShadow:
            '0 8px 32px rgba(31,38,135,0.37), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.1)',
        }}
      >
        <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ duration: 0.2 }}>
          {open ? <X className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
        </motion.span>
      </motion.button>
    </div>
  );
}
