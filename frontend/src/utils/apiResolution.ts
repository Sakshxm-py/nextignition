/**
 * Shared utility for resolving the API base URL across the application.
 * Handles comma-separated environment variables and production fallbacks.
 */

export const PRODUCTION_API_URL = 'https://nextignition-l3b5.onrender.com/api';

/** Ensure the base URL always ends with /api (no trailing slash) */
export const ensureApiSuffix = (base: string): string => {
  // Strip ALL trailing slashes and ALL trailing /api occurrences to start clean
  let clean = base.replace(/\/+$/, '');
  while (clean.endsWith('/api')) {
    clean = clean.substring(0, clean.length - 4).replace(/\/+$/, '');
  }
  return `${clean}/api`;
};

/** Autocorrect common typo: number-1 vs lowercase-L in the Render subdomain */
/** 
 * Singleton source-of-truth for the API Base URL.
 * Ensures the main app and all lazy-loaded chunks (Admin Panel, etc.) 
 * use the EXACT same URL instance.
 */
let cachedBase: string | null = null;

export const getSingletonApiBase = (envUrl?: string): string => {
  const win = window as any;
  
  // 1. Process environment URL to compare against cache
  let url = envUrl;
  if (url && typeof url === 'string' && url.includes(',')) {
    url = url.split(',')[0].trim();
  }
  
  const fix = (str: string): string => {
    let s = str;
    if (s.includes('nextignition-13b5')) s = s.replace('nextignition-13b5', 'nextignition-l3b5');
    if (s.includes('nextignition-l35b')) s = s.replace('nextignition-l35b', 'nextignition-l3b5');
    return s;
  };
  
  url = url ? fix(url) : undefined;
  const expectedPrefix = url ? ensureApiSuffix(url) : null;

  // 2. Check runtime cache (singleton) but INVALIDATE if envUrl is provided and differs
  if (cachedBase) {
    if (!expectedPrefix || cachedBase === expectedPrefix) return cachedBase;
    cachedBase = null; // Invalidate
  }
  
  // 3. Access global window cache (for cross-chunk persistence)
  if (win.__API_BASE__) {
    if (!expectedPrefix || win.__API_BASE__ === expectedPrefix) {
      cachedBase = win.__API_BASE__;
      return cachedBase!;
    }
    win.__API_BASE__ = null; // Invalidate
  }

  const isLocal = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 /^192\.168\.\d+\.\d+$/.test(window.location.hostname) ||
                 /^10\.\d+\.\d+\.\d+$/.test(window.location.hostname) ||
                 /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(window.location.hostname);

  const isCapacitor = window.location.protocol === 'capacitor:' || window.location.href.includes('capacitor://');

  // A baked env URL that points at loopback (localhost / 127.0.0.1 / the
  // Android-emulator host 10.0.2.2) is only valid when we're ACTUALLY running
  // on a dev machine's browser. If such a URL was accidentally baked into a
  // deployed web build or a native (Capacitor) app — e.g. from a stray
  // `.env.local` — it would make the device call itself and fail. In that
  // case, ignore it and fall back to production so every device converges.
  const urlIsLoopback = url ? /(?:localhost|127\.0\.0\.1|10\.0\.2\.2)/i.test(url) : false;
  const runningOnDevBrowser = isLocal && !isCapacitor;
  const ignoreLoopbackUrl = urlIsLoopback && !runningOnDevBrowser;

  let resolved = '';
  // If an explicit URL is provided via env, respect it first — unless it's a
  // loopback URL that can't be right for this runtime (see above).
  if (url && url.length > 5 && !ignoreLoopbackUrl) {
    resolved = url;
  } else if (isLocal && !isCapacitor) {
    // Only fallback to 5000 if no env URL was provided
    resolved = `http://${window.location.hostname}:5000/api`;
  } else {
    resolved = PRODUCTION_API_URL;
  }


  // Final normalization
  const final = ensureApiSuffix(fix(resolved));
  
  // Cache globally for all chunks to see
  win.__API_BASE__ = final;
  cachedBase = final;

  console.log(`[API] Singleton Resolved: ${final} (Source: ${envUrl || 'Fallback'})`);
  return final;
};

/** 
 * Legacy/Compatibility exports 
 */
export const fixApiTypo = (url: string): string => {
  let s = url;
  if (s.includes('nextignition-13b5')) s = s.replace('nextignition-13b5', 'nextignition-l3b5');
  if (s.includes('nextignition-l35b')) s = s.replace('nextignition-l35b', 'nextignition-l3b5');
  return s;
};

export const resolveApiBase = (envUrl?: string): string => getSingletonApiBase(envUrl);
