// Guards against `javascript:`/`data:` URI injection and open redirects.
// User- and server-supplied links (notification.link, profile.linkedin, etc.)
// must never be navigated to or rendered as an href without going through here.

/** Returns a safe URL to navigate to, or null if the input is unsafe.
 *  Allows same-origin relative paths/hashes and http(s) absolute URLs only. */
export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Relative path, hash, or query → same-origin, safe to use as-is.
  if (/^[/#?]/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed, window.location.origin);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    return null; // blocks javascript:, data:, vbscript:, file:, etc.
  } catch {
    return null;
  }
}

/** Normalizes a value for use as an external link href. Bare hosts like
 *  "example.com" get an https:// prefix; unsafe schemes return '#' (inert). */
export function safeExternalHref(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '#';
  let v = raw.trim();
  if (!v) return '#';
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v) && !v.startsWith('/')) {
    v = 'https://' + v; // bare domain → assume https
  }
  return sanitizeUrl(v) || '#';
}
