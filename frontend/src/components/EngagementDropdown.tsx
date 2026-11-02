import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AccountEngagementCard } from './AccountEngagementCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called when a viewer row is clicked (e.g. to open their profile). */
  onViewProfile?: (userId: string) => void;
}

/**
 * Header dropdown that surfaces the user's engagement metrics on demand,
 * instead of taking up space at the bottom of the home feed.
 */
export function EngagementDropdown({ isOpen, onClose, onViewProfile }: Props) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[999] bg-black/40" onClick={onClose} />

          {/* Centered modal (opened from the quick-actions button) */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl"
          >
            <AccountEngagementCard className="" onViewProfile={onViewProfile} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
