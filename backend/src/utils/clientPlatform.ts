import { Request } from 'express';

/**
 * The iOS app ships fully free (Apple Guideline 3.1.1): every Pro/Elite feature
 * is unlocked for all iOS users, so the backend must not enforce plan/tier gates
 * for requests coming from the iOS client. The frontend axios client sets the
 * `X-Client-Platform` header to `Capacitor.getPlatform()` on every request.
 *
 * Note: this header is client-supplied and therefore spoofable. That is an
 * accepted trade-off — the only thing it unlocks is functionality we already
 * give away free on iOS, so there is no revenue/security exposure beyond that.
 */
export const isFreePlatform = (req: Request): boolean =>
    String(req.headers['x-client-platform'] || '').toLowerCase() === 'ios';
