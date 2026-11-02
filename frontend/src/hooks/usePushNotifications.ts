/**
 * usePushNotifications.ts
 * Handles real-time notifications:
 *  - Web: Browser Notification API popup + in-app toast via Sonner
 *  - Mobile (Capacitor): LocalNotifications plugin
 *  - Subscribes to socket.io 'notification' event for live delivery
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSocket } from '../services/socketService';
import { sanitizeUrl } from '../utils/safeUrl';
import { getCurrentUser } from '../services/authService';

/** Minimal Capacitor detection — works even if Capacitor is not imported */
const isCapacitorNative = () =>
  typeof (window as any)?.Capacitor?.isNativePlatform === 'function' &&
  (window as any).Capacitor.isNativePlatform();

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface NotificationPayload {
  id?: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type?: string;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as PushPermission;
  });

  const localNotifRef = useRef<any>(null);

  /** Initialise Capacitor LocalNotifications if on native */
  useEffect(() => {
    if (!isCapacitorNative()) return;
    const init = async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        localNotifRef.current = LocalNotifications;
        const result = await LocalNotifications.requestPermissions();
        setPermission(result.display === 'granted' ? 'granted' : 'denied');
      } catch {
        // LocalNotifications plugin not installed — ignore
      }
    };
    init();
  }, []);

  /** Request browser notification permission */
  const requestPermission = useCallback(async (): Promise<PushPermission> => {
    if (isCapacitorNative()) {
      // Already handled in useEffect above
      return permission;
    }
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted';
    }
    const result = await Notification.requestPermission();
    setPermission(result as PushPermission);
    return result as PushPermission;
  }, [permission]);

  /** Fire a notification */
  const showNotification = useCallback(
    (payload: NotificationPayload) => {
      const { title, body, icon, url } = payload;

      // ─── In-app toast (always shown, web + mobile)
      toast(title, {
        description: body,
        duration: 6000,
        action: (() => {
          const safe = sanitizeUrl(url);
          return safe ? { label: 'View', onClick: () => { window.location.href = safe; } } : undefined;
        })(),
      });

      // ─── Mobile (Capacitor)
      if (isCapacitorNative() && localNotifRef.current) {
        localNotifRef.current
          .schedule({
            notifications: [
              {
                id: Math.floor(Math.random() * 100000),
                title,
                body,
                smallIcon: 'ic_stat_icon_config_sample',
                iconColor: '#0044CC',
              },
            ],
          })
          .catch(() => { /* ignore */ });
        return;
      }

      // ─── Desktop browser popup
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(title, {
            body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
          });
          const safeUrl = sanitizeUrl(url);
          if (safeUrl) {
            notif.onclick = () => {
              window.focus();
              window.location.href = safeUrl;
            };
          }
        } catch {
          // Some browsers block Notification constructor — silently ignore
        }
      }
    },
    []
  );

  /** Connect to socket.io and listen for platform notifications */
  useEffect(() => {
    let mounted = true;
    const socket = getSocket();

    // The backend emits 'notification_received' with the stored notification
    // shape: { user, title, content, link, type, ... }. Map it onto the
    // NotificationPayload the renderer expects ({ title, body, url }).
    const handler = (n: any) => {
      if (!mounted || !n) return;
      // Safety: only surface notifications addressed to the current user.
      const me = getCurrentUser();
      const myId = (me?.id || me?._id) as string | undefined;
      if (n.user && myId && n.user !== myId) return;

      showNotification({
        id: n._id || n.id,
        title: n.title || 'NextIgnition',
        body: n.content || n.body || '',
        url: n.link || n.url,
        type: n.type,
      });
    };

    socket.on('notification_received', handler);
    return () => {
      mounted = false;
      socket.off('notification_received', handler);
    };
  }, [showNotification]);

  return { permission, requestPermission, showNotification };
}
