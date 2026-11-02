import { useCallback, useEffect, useRef } from 'react';
import { recordImpressions } from '../services/engagementService';

/**
 * Tracks which feed posts actually became visible (>= 50% on screen) and batches
 * them to the engagement API as "post impressions" — like LinkedIn counting a
 * post as seen only when it scrolls into view.
 *
 * Usage:
 *   const trackImpression = useImpressionTracker();
 *   ...
 *   <div ref={trackImpression(post.apiId)}>{renderPost(post)}</div>
 *
 * Each id is counted at most once per mount; flushes are debounced.
 */
export function useImpressionTracker() {
  const seen = useRef<Set<string>>(new Set());
  const pending = useRef<Set<string>>(new Set());
  const elToId = useRef<WeakMap<Element, string>>(new WeakMap());
  const observer = useRef<IntersectionObserver | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (pending.current.size === 0) return;
    const ids = Array.from(pending.current);
    pending.current.clear();
    recordImpressions(ids);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const id = elToId.current.get(entry.target);
          if (!id || seen.current.has(id)) continue;
          seen.current.add(id);
          pending.current.add(id);
          observer.current?.unobserve(entry.target);
        }
        if (pending.current.size > 0) {
          if (flushTimer.current) clearTimeout(flushTimer.current);
          flushTimer.current = setTimeout(flush, 1500);
        }
      },
      { threshold: [0.5] }
    );

    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flush();
      observer.current?.disconnect();
    };
  }, [flush]);

  /** Callback ref factory: attach to a post container, passing its server id. */
  const track = useCallback(
    (id?: string) => (el: HTMLElement | null) => {
      if (!el || !id) return;
      elToId.current.set(el, id);
      observer.current?.observe(el);
    },
    []
  );

  return track;
}
