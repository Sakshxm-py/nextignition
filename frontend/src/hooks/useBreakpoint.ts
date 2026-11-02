import { useEffect, useState } from 'react';

/**
 * True when the viewport is below Tailwind's `lg` breakpoint (1024px) — i.e. the
 * dashboards' "mobile" layout (collapsed sidebar + bottom nav). Initialised
 * synchronously from window width to avoid a layout flash on first paint.
 */
export function useIsBelowLg() {
  const read = () => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [below, setBelow] = useState<boolean>(read);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setBelow(window.innerWidth < 1024);
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return below;
}
