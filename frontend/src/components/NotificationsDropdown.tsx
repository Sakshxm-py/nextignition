import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MessageCircle, 
  DollarSign, 
  Star, 
  Clock, 
  Award,
  X,
  TrendingUp,
  Users,
  FileText,
  Video,
  Bell,
  BadgeCheck,
  AlertCircle,
  Heart,
  MessageSquare,
  Sparkles,
  Presentation,
  Download
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socketService';
import { getCurrentUser } from '../services/authService';
import { sanitizeUrl } from '../utils/safeUrl';

type UserRole = 'founder' | 'investor' | 'expert';

type ApiNotification = {
  _id: string;
  type: 'booking' | 'message' | 'connection' | 'system' | 'ai' | 'post' | 'review' | 'community' | 'like' | 'comment' | 'news' | 'event' | 'star' | 'pitch_deck';
  title: string;
  content: string;
  link?: string;
  read?: boolean;
  sender?: string;
  metadata?: Record<string, any>;
  createdAt: string;
};

interface UiNotification {
  id: string;
  type: ApiNotification['type'];
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon: any;
  link?: string;
  metadata?: Record<string, any>;
}

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  /** Reports the current unread count to the parent so it can show/hide the bell dot. */
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationsDropdown({ isOpen, onClose, userRole, onUnreadCountChange }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const relativeTime = (iso: string) => {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  };

  const iconFor = (type: ApiNotification['type']) => {
    switch (type) {
      case 'booking':
      case 'event':
        return Calendar;
      case 'message':
        return MessageCircle;
      case 'review':
      case 'star':
        return Star;
      case 'community':
      case 'connection':
        return Users;
      case 'system':
      case 'news':
        return Bell;
      case 'like':
        return Heart;
      case 'comment':
        return MessageSquare;
      case 'ai':
        return Sparkles;
      case 'post':
        return FileText;
      case 'pitch_deck':
        return Presentation;
      default:
        return AlertCircle;
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const resp = await api.get<ApiNotification[]>('/notifications');
      const mapped: UiNotification[] = (resp.data || []).map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.content,
        time: relativeTime(n.createdAt),
        unread: !n.read,
        icon: iconFor(n.type),
        link: n.link,
        metadata: n.metadata,
      }));
      setNotifications(mapped);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchNotifications();

    const socket = getSocket();
    const currentUser = getCurrentUser();

    const myId = currentUser?._id || currentUser?.id;
    const onNewNotification = (n: any) => {
      // Security: Only show if notification belongs to this user
      if (n.user && myId && n.user !== myId) return;
      
      setNotifications(prev => {
        if (prev.some(x => x.id === n._id)) return prev;
        const ui: UiNotification = {
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.content,
          time: 'Just now',
          unread: true,
          icon: iconFor(n.type),
          link: n.link,
          metadata: n.metadata,
        };
        return [ui, ...prev];
      });
    };

    socket.on('notification_received', onNewNotification);

    return () => {
      socket.off('notification_received', onNewNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  // Fetch once on mount so the bell's unread dot is correct before the dropdown
  // is ever opened.
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the parent's bell dot in sync with the real unread count (so "Mark all
  // read" actually clears the dot).
  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  const markAllRead = async () => {
    // Optimistically clear unread state first so the button always responds,
    // even if the request is slow or fails — otherwise a swallowed error left
    // the UI unchanged and the button looked dead.
    const hadUnread = notifications.some((n) => n.unread);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (!hadUnread) return;
    try {
      await api.put('/notifications/read-all');
    } catch {
      // ignore — UI already reflects the intended state
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    } catch {
      // ignore
    }
  };

  const respondInvite = async (inviteId: string, action: 'accept' | 'decline', notificationId: string) => {
    setBusyIds((prev) => new Set(prev).add(notificationId));
    try {
      await api.post(`/communities/invites/${inviteId}/respond`, { action });
      await markOneRead(notificationId);
      await fetchNotifications();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[999]" 
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed right-4 lg:right-6 top-20 z-[1000] w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          )}

          {notifications.map((notification, idx) => {
            const Icon = notification.icon;
            const isInvite =
              notification.type === 'community' &&
              notification.metadata?.action === 'community_invite' &&
              typeof notification.metadata?.inviteId === 'string';
            const inviteId = isInvite ? String(notification.metadata?.inviteId) : '';
            const isBusy = busyIds.has(notification.id);

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  if (notification.unread) markOneRead(notification.id);
                  const safeLink = sanitizeUrl(notification.link);
                  if (safeLink) window.location.href = safeLink;
                }}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  notification.unread ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.type === 'booking' ? 'bg-blue-100' :
                    notification.type === 'message' ? 'bg-purple-100' :
                    notification.type === 'review' ? 'bg-yellow-100' :
                    notification.type === 'community' ? 'bg-green-100' :
                    notification.type === 'pitch_deck' ? 'bg-orange-100' :
                    'bg-purple-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      (notification.type === 'booking' || notification.type === 'event') ? 'text-blue-600' :
                      notification.type === 'message' ? 'text-purple-600' :
                      notification.type === 'review' ? 'text-yellow-600' :
                      notification.type === 'community' ? 'text-green-600' :
                      notification.type === 'pitch_deck' ? 'text-orange-600' :
                      notification.type === 'like' ? 'text-red-600' :
                      notification.type === 'comment' ? 'text-blue-500' :
                      notification.type === 'ai' ? 'text-amber-500' :
                      notification.type === 'news' ? 'text-orange-600' :
                      'text-purple-600'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm text-gray-900">{notification.title}</h4>
                      {notification.unread && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notification.message}</p>

                    {isInvite && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            respondInvite(inviteId, 'accept', notification.id);
                          }}
                          className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            respondInvite(inviteId, 'decline', notification.id);
                          }}
                          className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-200 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {notification.type === 'pitch_deck' && notification.metadata?.canDownload && notification.metadata?.pitchDeckUrl && (
                      <div className="mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const safe = sanitizeUrl(String(notification.metadata?.pitchDeckUrl || ''));
                            if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Deck
                        </button>
                      </div>
                    )}

                    <span className="text-xs text-gray-500">{notification.time}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {!loading && notifications.length === 0 && (
            <div className="p-4 text-sm text-gray-600">No notifications</div>
          )}
        </div>
      </motion.div>
    </>,
    document.body
  );
}