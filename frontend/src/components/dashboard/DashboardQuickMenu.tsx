import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, LayoutGrid } from 'lucide-react';

/**
 * Mobile-only floating "+" button that opens a right-side drawer holding the
 * dashboard widgets (stats, quick actions, engagement, etc.). Keeps the mobile
 * home feed clean — only posts/videos/stories stay in the scroll. On desktop the
 * widgets render inline (see {@link DashboardWidgets}); this component is only
 * mounted below the `lg` breakpoint.
 *
 * Children are rendered only while the drawer is open, so any data-fetching
 * widget (e.g. the engagement card) doesn't load until the user opens the menu.
 */
export function DashboardQuickMenu({
  children,
  label = 'Dashboard',
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Render through a portal to <body> so neither the FAB nor the drawer is
  // affected by an ancestor `transform`/`filter`/`will-change` (which would turn
  // `position: fixed` into a containing-block-relative position and shove the FAB
  // into a corner — as happens inside the Founder dashboard's animated layout).
  return createPortal(
    <>
      {/* Floating action button — sits above the mobile bottom nav. Position is
          set via inline styles (not Tailwind `fixed right-4`) because a global
          stylesheet rule resolves <button> position to `relative`, which would
          shove a class-positioned FAB into the corner. Inline styles win the
          cascade and guarantee a true viewport-fixed bottom-right placement. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open dashboard menu"
        className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center active:scale-95 transition-transform"
        style={{
          position: 'fixed',
          right: '1rem',
          bottom: 'calc(5rem + env(safe-area-inset-bottom) + 0.5rem)',
          zIndex: 120,
        }}
      >
        <Plus className="w-7 h-7" />
      </button>

      <AnimatePresence>
          {open && (
            <div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 z-[140] w-[88%] max-w-sm bg-gray-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 flex-shrink-0"
                  style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
                >
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-blue-600" /> {label}
                  </h2>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Tapping any action/link inside navigates away, so close the
                    drawer too (otherwise it stays pinned over the new view). */}
                <div
                  onClickCapture={(e) => {
                    if ((e.target as HTMLElement).closest('button,a')) setOpen(false);
                  }}
                  className="flex-1 overflow-y-auto py-4 space-y-4"
                  style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
                >
                  {children}
                </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>
    </>,
    document.body,
  );
}

/**
 * Renders dashboard widgets inline on desktop, or behind a floating "+" drawer
 * on mobile (below `lg`). `compact` should come from `useIsBelowLg()`.
 *
 * On desktop a plain fragment is returned so the children stay direct flow
 * children of the parent (preserving its `space-y` rhythm exactly).
 */
export function DashboardWidgets({
  compact,
  children,
  label,
}: {
  compact: boolean;
  children: ReactNode;
  label?: string;
}) {
  // Always tuck the dashboard widgets behind the floating "+" drawer (mobile AND
  // desktop) so the home feed itself shows only stories + posts.
  void compact;
  return <DashboardQuickMenu label={label}>{children}</DashboardQuickMenu>;
}
