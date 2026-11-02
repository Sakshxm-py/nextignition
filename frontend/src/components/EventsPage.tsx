import { useMemo, useState, useEffect } from 'react'; // deployment check
import { usePremium } from '../hooks/usePremium';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  List,
  Users,
  Search,
  Bell,
  BellOff,
  Pin,
  Settings,
  Plus,
  Smile,
  Paperclip,
  Send,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Lock,
  Crown,
  Rocket,
  Handshake,
  Trophy,
  Sparkles,
  ArrowLeft,
  X,
  Check,
  PhoneOff,
  Mic,
  MicOff,
  Gift,
  MoreHorizontal,
  FolderPlus,
  ShieldCheck,
  UserPlus,
  Video,
  Target,
  Newspaper,
  Bot,
  Briefcase,
  BarChart3,
  PieChart,
  MapPin,
  Clock,
  ExternalLink,
  Home,
  Globe,
  DollarSign,
  Trash2,
  Eye,
  Share2,
  Download,
  CheckCircle,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { Flag as ReportFlagIcon } from 'lucide-react';
import { ReportDialog } from './ReportDialog';

import { brandColors } from '../utils/colors';
import { formatWithCommas, parseNumericValue } from '../utils/formatters';
import { ImageWithFallback } from './figma/ImageWithFallback';
import api from '../services/api';
import { fetchMe, getCurrentUser, logout, setCurrentUser as persistCurrentUser } from '../services/authService';
import { Capacitor } from '@capacitor/core';

/* Detect if Apple Pay is available via Razorpay (web/macOS Safari only).
 * Never enable on iOS native — payments must go through Apple IAP there. */
const isApplePayAvailable = () => {
  if (Capacitor.isNativePlatform()) return false;
  if (typeof window !== 'undefined' && (window as any).ApplePaySession) {
    return (window as any).ApplePaySession.canMakePayments();
  }
  return false;
};
const applePaySupported = isApplePayAvailable();



// Types
type UserRole = 'founder' | 'expert' | 'investor';
type EventType = 'webinar' | 'workshop' | 'networking' | 'masterclass';
type EventStatus = 'upcoming' | 'past' | 'live' | 'draft' | 'completed';



interface Event {
  id: string;
  apiId?: string;
  title: string;
  type: EventType;
  host: {
    id?: string;
    name: string;
    role: string;
    avatar: string; // url or initials
    verified: boolean;
    type: 'expert' | 'investor' | 'platform';
  };
  date: string;
  time: string;
  duration: string;
  attendees: number;
  price: number | 'free';
  thumbnail: string;
  description: string;
  status: EventStatus;
  bookmarked: boolean;
  isRegistered: boolean;
  isHost: boolean; // Does the current user own this event?
  meetingLink?: string;
  presentationUrl?: string; // Add presentation URL
  startAt?: string; // ISO string for calendar
}

interface EventsPageProps {
  userRole?: UserRole;
  onBack?: () => void;
  onMenuClick?: () => void;
  hideHeader?: boolean;
}

interface ApiEvent {
  _id: string;
  title: string;
  description: string;
  type: EventType;
  hostType: 'platform' | 'expert' | 'investor' | 'founder';
  hostUser?: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
    isVerified?: boolean;
  };
  status: 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled';
  startAt: string;
  durationMinutes: number;
  format: 'virtual' | 'in-person';
  location?: string;
  meetingLink?: string;
  priceType: 'free' | 'paid';
  priceAmount?: number;
  currency?: string;
  maxAttendees?: number;
  registeredUsers?: string[];
  bookmarkedBy?: string[];
  thumbnailUrl?: string;
  recordingUrl?: string;
  presentationUrl?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    // Never load the third-party payment SDK on iOS native (Apple Guideline 3.1.1).
    if (Capacitor.getPlatform() === 'ios') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });



const mapApiEventToUi = (
  e: ApiEvent,
  currentUser: any,
  currentUserRole: UserRole
): Event => {
  const currentUserId = currentUser?._id || currentUser?.id || null;

  const start = new Date(e.startAt);
  const date = start.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
  const time = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const status: EventStatus = e.status === 'completed'
    ? 'completed'
    : e.status === 'draft'
      ? 'draft'
      : e.status === 'live'
        ? 'live'
        : e.status === 'cancelled'
          ? 'past'
          : 'upcoming';

  const registeredUsers = e.registeredUsers || [];
  const bookmarkedBy = e.bookmarkedBy || [];
  const isRegistered = currentUserId ? registeredUsers.includes(currentUserId) : false;
  const bookmarked = currentUserId ? bookmarkedBy.includes(currentUserId) : false;

  const hostUserId = typeof e.hostUser === 'string' ? e.hostUser : (e.hostUser?._id || (e.hostUser as any)?.id);
  const isHost = e.hostType === 'platform'
    ? currentUserRole === 'investor' // keep legacy UI behavior minimal
    : currentUserId ? hostUserId === currentUserId : false;

  const resolvedHostName = isHost ? (currentUser?.name || 'You') : (e.hostUser?.name || 'Host');
  const resolvedHostRole = isHost ? (currentUserRole || 'Host') : (e.hostUser?.role || '');
  const resolvedHostAvatar = isHost ? (currentUser?.avatar || resolvedHostName.substring(0, 2).toUpperCase()) : (e.hostUser?.avatar || resolvedHostName.substring(0, 2).toUpperCase());

  const hostName = e.hostType === 'platform' ? 'NextIgnition' : resolvedHostName;
  const hostRole = e.hostType === 'platform' ? 'Platform' : resolvedHostRole;
  const hostAvatar = e.hostType === 'platform' ? 'NI' : resolvedHostAvatar;

  const price: number | 'free' = e.priceType === 'free' ? 'free' : Number(e.priceAmount || 0);

  // Generate a consistent meeting link for virtual events if none was provided
  const shortId = e._id ? e._id.toString().split('-')[0].slice(0, 10) : 'event';
  const meetingLink = e.format === 'in-person' 
    ? e.meetingLink 
    : (e.meetingLink || `https://meet.google.com/ni-${shortId}-live`);

  return {
    id: e._id, // use the real unique id (the old hash collided → duplicate keys)
    apiId: e._id,
    title: e.title,
    type: e.type,
    host: {
      id: e.hostUser?._id,
      name: hostName,
      role: hostRole,
      avatar: hostAvatar,
      verified: Boolean(e.hostUser?.isVerified) || e.hostType === 'platform',
      type: e.hostType === 'platform' ? 'platform' : e.hostType === 'expert' ? 'expert' : 'investor',
    },
    date,
    time,
    duration: `${e.durationMinutes || 60} mins`,
    attendees: registeredUsers.length,
    price,
    thumbnail: e.thumbnailUrl || 'https://images.unsplash.com/photo-1561089489-f13d5e730d72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    description: e.description,
    status,
    bookmarked,
    isRegistered,
    isHost,
    meetingLink: meetingLink,
    presentationUrl: e.presentationUrl,
    startAt: e.startAt,
  };
};

export function EventsPage({ userRole: initialUserRole = 'founder', onBack, onMenuClick, hideHeader }: EventsPageProps) {
  // State
  const [activeRole, setActiveRole] = useState<UserRole>(initialUserRole);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'my-events' | 'recommended'>('upcoming');
  const [selectedEventType, setSelectedEventType] = useState<EventType | 'all'>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [joiningEvent, setJoiningEvent] = useState<Event | null>(null);

  // My Events Sub-tabs (Expert/Investor)
  const [myEventsTab, setMyEventsTab] = useState<'attending' | 'hosting'>('attending');

  // Event Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pricingType, setPricingType] = useState<'free' | 'paid' | 'custom'>('free');
  const [customPrice, setCustomPrice] = useState('');
  const [createForm, setCreateForm] = useState({
    type: 'webinar' as EventType,
    title: '',
    description: '',
    category: '',
    durationMinutes: 60,
    tags: '',
    startDate: '',
    startTime: '',
    format: 'virtual' as 'virtual' | 'in-person',
    locationOrLink: '',
    maxAttendees: '100',
    currency: 'INR',
    presentationUrl: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [presentationUploading, setPresentationUploading] = useState(false);
  const [showEliteUpgradeModal, setShowEliteUpgradeModal] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string>('');
  const [officialEvents, setOfficialEvents] = useState<Event[]>([]);

  const [currentUser, setCurrentUser] = useState<any>(() => getCurrentUser());
  const currentUserId: string | null = currentUser?._id || currentUser?.id || null;

  // Refresh the user profile from the server so subscription plan changes (e.g. admin upgrades)
  // take effect without requiring a logout/login.
  useEffect(() => {
    let cancelled = false;

    const refreshMe = async () => {
      try {
        // Only attempt if there's an existing user session.
        if (!getCurrentUser()) return;

        const me = await fetchMe();
        if (cancelled) return;

        persistCurrentUser(me);
        setCurrentUser(me);
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          logout();
        }
      }
    };

    refreshMe();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscription checks for event hosting
  const isLoggedIn = !!currentUser;
  const iapPremium = usePremium();
  const hasHostAccess = useMemo(() => {
    if (!currentUser) return false;
    // iOS: hosting requires the StoreKit "premium" entitlement (Apple Guideline 3.1.1).
    if (Capacitor.getPlatform() === 'ios') return iapPremium;

    // Most robust check: aggregate all possible fields that might store the plan
    const allPlans = [
      currentUser.founder_plan, currentUser.data?.founder_plan,
      currentUser.expert_plan, currentUser.data?.expert_plan,
      currentUser.investor_plan, currentUser.data?.investor_plan,
      currentUser.subscriptionTier, currentUser.data?.subscriptionTier,
      currentUser.tier, currentUser.data?.tier,
      currentUser.plan, currentUser.data?.plan
    ];
    
    return allPlans.some(p => {
      const planStr = String(p || 'free').toLowerCase();
      return planStr === 'elite' || planStr === 'pro';
    });
  }, [currentUser, iapPremium]);

  const userPlan = useMemo(() => {
    if (!currentUser) return 'free';
    const role = currentUser.role || activeRole;
    
    // Check specific role plan first, then fall back to generic tier fields
    const plan = currentUser[`${role}_plan`] || 
                 currentUser.data?.[`${role}_plan`] || 
                 currentUser.subscriptionTier || 
                 currentUser.data?.subscriptionTier || 
                 currentUser.tier || 
                 currentUser.data?.tier || 
                 'free';
                 
    const planStr = String(plan).toLowerCase();
    return planStr.charAt(0).toUpperCase() + planStr.slice(1);
  }, [currentUser, activeRole]);

  const handleHostEventClick = () => {
    if (!isLoggedIn) {
      // Save where they came from and redirect to login
      sessionStorage.setItem('redirectAfterAuth', '#events');
      window.location.hash = '#login';
      return;
    }
    if (!hasHostAccess) {
      setShowEliteUpgradeModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    setEventsError('');
    try {
      const statusParam = activeTab === 'past' ? 'completed' : activeTab === 'upcoming' ? 'upcoming' : undefined;
      const params: any = {};
      if (statusParam) params.status = statusParam;
      if (selectedEventType !== 'all') params.type = selectedEventType;

      if (activeTab === 'my-events') {
        const mode = myEventsTab;
        const resp = await api.get('/events/mine', { params: { mode } });
        const mapped = (resp.data as ApiEvent[]).map(e => mapApiEventToUi(e, currentUser, activeRole));
        setEvents(mapped);
      } else {
        const resp = await api.get('/events', { params });
        const mapped = (resp.data as ApiEvent[]).map(e => mapApiEventToUi(e, currentUser, activeRole));
        setEvents(mapped);
      }
    } catch (err: any) {
      setEventsError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchOfficialEvents = async () => {
    try {
      const resp = await api.get('/events', { params: { hostType: 'platform' } });
      const mapped = (resp.data as ApiEvent[]).map(e => mapApiEventToUi(e, currentUser, activeRole));
      setOfficialEvents(mapped);
    } catch {
      // Non-critical: the official section just stays empty on failure.
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEventType, myEventsTab, activeRole]);

  useEffect(() => {
    fetchOfficialEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole]);

  const handleToggleBookmark = async (event: Event) => {
    try {
      if (!event.apiId) return;
      const resp = await api.post(`/events/${event.apiId}/bookmark`);
      const updated = mapApiEventToUi(resp.data as ApiEvent, currentUser, activeRole);
      setEvents(prev => prev.map(e => (e.id === event.id ? updated : e)));
    } catch {
      // ignore
    }
  };

  const handlePaidTicketCheckout = async (event: Event) => {
    // IAP compliance: never run third-party payment on iOS native
    if (Capacitor.getPlatform() === 'ios') return;
    if (!event.apiId) return;

    const { data: order } = await api.post(`/events/${event.apiId}/ticket-order`);
    if (order?.alreadyPaid) {
      const resp = await api.post(`/events/${event.apiId}/register`);
      const updated = mapApiEventToUi(resp.data as ApiEvent, currentUser, activeRole);
      setEvents(prev => prev.map(e => (e.id === event.id ? updated : e)));
      if (selectedEvent && selectedEvent.id === event.id) setSelectedEvent(updated);
      return;
    }

    if (order?.checkoutMode === 'manual') {
      const verifyResp = await api.post(`/events/${event.apiId}/ticket-verify`, {
        orderId: order.orderId,
        localOrderId: order.localOrderId,
        manual: true,
      });
      if (verifyResp.data?.ok) {
        const resp = await api.get('/events/mine', { params: { mode: 'attending' } });
        const mapped = (resp.data as ApiEvent[]).map(e => mapApiEventToUi(e, currentUser, activeRole));
        setEvents(prev => prev.map(e => mapped.find(m => m.id === e.id) || e));
      }
      return;
    }

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) throw new Error('Failed to load payment gateway');
    if (!order?.key || !order?.orderId) throw new Error('Payment gateway not configured');

    await new Promise<void>((resolve, reject) => {
      const rzpOptions: any = {
        key: order.key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'NextIgnition',
        description: `Ticket: ${event.title}`,
        order_id: order.orderId,
        handler: async function (response: any) {
          try {
            await api.post(`/events/${event.apiId}/ticket-verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              localOrderId: order.localOrderId,
            });
            const refreshed = await api.get('/events/mine', { params: { mode: 'attending' } });
            const mapped = (refreshed.data as ApiEvent[]).map(e => mapApiEventToUi(e, currentUser, activeRole));
            setEvents(prev => prev.map(e => mapped.find(m => m.id === e.id) || e));
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        theme: { color: '#1d4ed8' },
      };

      // Enable Apple Pay in Razorpay checkout when available
      if (applePaySupported) {
        rzpOptions.method = { wallet: { applepay: true } };
      }

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on('payment.failed', function (response: any) {
        reject(new Error(response?.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  };

  const handleRegisterToggle = async (event: Event) => {
    try {
      if (!event.apiId) return;
      const isRegistering = !event.isRegistered;

      if (isRegistering && event.price !== 'free') {
        if (Capacitor.getPlatform() === 'ios') {
          alert("Paid tickets aren't available in the app.");
          return;
        }
        await handlePaidTicketCheckout(event);
        await fetchEvents();
        return;
      }

      if (!isRegistering && event.price !== 'free') {
        if (Capacitor.getPlatform() === 'ios') {
          alert("Paid event changes aren't available in the app.");
          return;
        }
        await api.post(`/events/${event.apiId}/refund`, { reason: 'attendee_cancelled' });
        await fetchEvents();
        return;
      }

      const endpoint = isRegistering ? 'register' : 'unregister';
      const resp = await api.post(`/events/${event.apiId}/${endpoint}`);
      const updated = mapApiEventToUi(resp.data as ApiEvent, currentUser, activeRole);
      
      setEvents(prev => prev.map(e => (e.id === event.id ? updated : e)));
      if (selectedEvent && selectedEvent.id === event.id) {
        setSelectedEvent(updated);
      }

      if (isRegistering) {
         const start = updated.startAt ? new Date(updated.startAt) : new Date(updated.date);
         const startDate = isNaN(start.getTime()) ? new Date() : start;
         const end = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
         const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
         
         const title = encodeURIComponent(updated.title || 'Event');
         const details = encodeURIComponent(updated.description || '');
         const loc = encodeURIComponent(updated.meetingLink || 'Online Event');
         
         const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(startDate)}/${fmt(end)}&details=${details}&location=${loc}`;
         
         const newWin = window.open(url, '_blank');
         if (!newWin) {
           alert('Registration successful! Please allow popups to add to Google Calendar.');
         }
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.isGuestLimitReached) {
        // Show a rich inline prompt instead of a bare alert
        const upgrade = window.confirm(
          '🎟️ Guest Limit Reached\n\nYou have used your 1 free event as a guest.\n\nCreate a full account to attend unlimited events.\n\nClick OK to register now (it\'s free!).'
        );
        if (upgrade) window.location.hash = '#signup';
        return;
      }
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update registration status.');
    }
  };

  const handleJoinEvent = (event: Event) => {
    setJoiningEvent(event);
  };

  const handleAddToCalendar = (event: Event) => {
    try {
      // Basic Google Calendar link generation
      const start = event.startAt ? new Date(event.startAt) : new Date(event.date);
      // If date is invalid, fallback to today
      const startDate = isNaN(start.getTime()) ? new Date() : start;
      const end = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
      const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(startDate)}/${fmt(end)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.meetingLink || 'Online Event')}`;
      window.open(url, '_blank');
    } catch {
      alert('Could not generate calendar link.');
    }
  };

  const handleEditEvent = (event: Event) => {
    // Pre-fill the create modal with event data for editing
    const startDate = event.startAt ? new Date(event.startAt) : null;
    setCreateForm({
      type: event.type,
      title: event.title,
      description: event.description,
      category: '',
      durationMinutes: parseInt(event.duration) || 60,
      tags: '',
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      startTime: startDate ? startDate.toTimeString().slice(0, 5) : '',
      format: event.meetingLink ? 'virtual' : 'in-person',
      locationOrLink: event.meetingLink || '',
      maxAttendees: '100',
      currency: 'INR',
      presentationUrl: event.presentationUrl || '',
    });
    if (event.price === 'free') {
      setPricingType('free');
    } else {
      setPricingType('custom');
      setCustomPrice(String(event.price));
    }
    setSelectedEvent(null);
    setShowCreateModal(true);
  };



  const handleCreateEvent = async () => {
    try {
      setCreateSubmitting(true);
      setEventsError('');

      // Collect every missing required field so the notice tells the host
      // exactly what still needs filling (matches the red * markers).
      const missing: string[] = [];
      if (!createForm.title.trim()) missing.push('Event Title');
      if (!createForm.description.trim()) missing.push('Description');
      if (!createForm.startDate) missing.push('Date');
      if (!createForm.startTime) missing.push('Time');
      if (missing.length) {
        setEventsError(`Please fill the required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
        return;
      }
      // Presentation is optional — hosts can add slides/recordings later.

      const startAt = new Date(`${createForm.startDate}T${createForm.startTime}:00`);
      const priceType = pricingType === 'free' ? 'free' : 'paid';
      const priceAmount = pricingType === 'custom'
        ? Number(customPrice || 0)
        : pricingType === 'paid'
          ? 499
          : 0;

      const payload: any = {
        title: createForm.title,
        description: createForm.description,
        type: createForm.type,
        category: createForm.category || undefined,
        tags: createForm.tags,
        startAt,
        durationMinutes: Number(createForm.durationMinutes || 60),
        format: createForm.format,
        location: createForm.format === 'in-person' ? createForm.locationOrLink : undefined,
        meetingLink: createForm.format === 'virtual' ? createForm.locationOrLink : undefined,
        maxAttendees: Number(createForm.maxAttendees || 0) || undefined,
        priceType,
        priceAmount: priceType === 'paid' ? priceAmount : undefined,
        currency: createForm.currency,
        presentationUrl: createForm.presentationUrl || undefined,
        status: 'upcoming',
      };

      await api.post('/events', payload);
      setShowCreateModal(false);
      setCreateForm({
        type: 'webinar',
        title: '',
        description: '',
        category: '',
        durationMinutes: 60,
        tags: '',
        startDate: '',
        startTime: '',
        format: 'virtual',
        locationOrLink: '',
        maxAttendees: '100',
        currency: 'INR',
        presentationUrl: '',
      });
      setPricingType('free');
      setCustomPrice('');
      fetchEvents();
    } catch (err: any) {
      setEventsError(err.response?.data?.message || 'Failed to publish event');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Generate a free, instant meeting link (Jitsi Meet — no account needed)
  // for hosts who don't have a Zoom/Meet link of their own.
  const generateMeetingLink = () => {
    const slug = (createForm.title.trim() || 'NextIgnition-Event')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 8);
    const link = `https://meet.jit.si/NextIgnition-${slug}-${suffix}`;
    setCreateForm(f => ({ ...f, locationOrLink: link }));
  };

  // Build a "prefilled Google Calendar event" URL from the current form so the
  // host can add the event (with its meeting link) to their calendar.
  const buildGoogleCalendarUrl = (): string | null => {
    if (!createForm.startDate || !createForm.startTime) return null;
    const start = new Date(`${createForm.startDate}T${createForm.startTime}:00`);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + (Number(createForm.durationMinutes) || 60) * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const details = [createForm.description, createForm.locationOrLink ? `Join: ${createForm.locationOrLink}` : '']
      .filter(Boolean).join('\n\n');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: createForm.title || 'NextIgnition Event',
      dates: `${fmt(start)}/${fmt(end)}`,
      details,
      location: createForm.locationOrLink || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Derived Data
  const filteredEvents = events.filter(event => {
    // Tab filtering
    if (activeTab === 'past' && event.status !== 'past') return false;
    if (activeTab === 'upcoming' && (event.status === 'past' || event.status === 'completed')) return false;
    if (activeTab === 'my-events') {
      if (myEventsTab === 'attending') return event.isRegistered;
      if (myEventsTab === 'hosting') return event.isHost;
    }

    // Type filtering
    if (selectedEventType !== 'all' && event.type !== selectedEventType) return false;

    return true;
  });

  // Helpers
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  type CalendarDay = { day: number | null; events: Event[] };

  const calendarEvents = useMemo<CalendarDay[]>(() => {
    const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();

    const days: CalendarDay[] = [];

    // Padding for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, events: [] });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), d).toISOString().split('T')[0];
      const dayEvents = events.filter((e: Event) => {
        const eDate = e.startAt ? new Date(e.startAt).toISOString().split('T')[0] : e.date;
        return eDate === dateStr;
      });
      days.push({ day: d, events: dayEvents });
    }

    return days;
  }, [currentCalendarDate, events]);

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'webinar': return brandColors.electricBlue;
      case 'workshop': return brandColors.atomicOrange;

      case 'networking': return '#8B5CF6'; // Violet
      case 'masterclass': return '#F59E0B'; // Amber
      default: return brandColors.navyBlue;
    }
  };

  const CalendarView = () => (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-lg">
          {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentCalendarDate(new Date())}
            className="px-3 py-1 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarEvents.map((item: CalendarDay, idx: number) => (
          <div key={idx} className={`min-h-[120px] border-r border-b border-gray-50 p-2 ${!item.day ? 'bg-gray-50/50' : ''}`}>
            {item.day && (
              <>
                <span className={`text-sm font-bold ${
                  new Date().getDate() === item.day &&
                  new Date().getMonth() === currentCalendarDate.getMonth() &&
                  new Date().getFullYear() === currentCalendarDate.getFullYear()
                    ? 'w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center'
                    : 'text-gray-900'
                }`}>
                  {item.day}
                </span>
                <div className="mt-2 space-y-1">
                  {item.events.slice(0, 3).map((event: Event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="px-2 py-1 rounded text-[10px] font-bold truncate cursor-pointer transition-transform hover:scale-[1.02]"
                      style={{
                        backgroundColor: `${getEventTypeColor(event.type)}15`,
                        color: getEventTypeColor(event.type),
                        borderLeft: `3px solid ${getEventTypeColor(event.type)}`,
                      }}
                    >
                      {event.time} {event.title}
                    </div>
                  ))}
                  {item.events.length > 3 && (
                    <p className="text-[10px] text-gray-400 font-medium pl-1">+{item.events.length - 3} more</p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (joiningEvent) {
    return <MeetingRoomPage event={joiningEvent} onBack={() => setJoiningEvent(null)} />;
  }

  if (selectedEvent) {
    return (
      <EventDetailPage
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        role={activeRole}
        onRegister={handleRegisterToggle}
        onJoin={handleJoinEvent}
        onAddToCalendar={handleAddToCalendar}
        onEditEvent={handleEditEvent}

      />
    );
  }

  return (
    <div className={`flex ${hideHeader ? 'h-full' : 'h-screen'} bg-gray-50 overflow-hidden font-sans`}>
      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Guest Banner */}
        {currentUser?.isGuest && (
          <div
            className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 text-sm font-medium"
            style={{
              background: 'linear-gradient(90deg, #1E40AF 0%, #6D28D9 100%)',
              color: '#fff',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">👋</span>
              <span>
                You're browsing as a <strong>guest</strong>. You can attend{' '}
                <strong>1 event for free</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.hash = '#signup'}
                className="flex-shrink-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border border-white/30 transition-all"
              >
                {Capacitor.getPlatform() === 'ios' ? 'Create a free account →' : 'Upgrade for unlimited access →'}
              </button>
              <button
                onClick={() => {
                  logout();
                  window.location.hash = '#home';
                  window.location.reload();
                }}
                className="text-white/70 hover:text-white text-xs font-medium underline underline-offset-4 transition-colors ml-2"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex-shrink-0">
          <div className={`flex items-center gap-4 ${hideHeader ? 'justify-end' : 'justify-between'}`}>
            <div className={`flex items-center gap-2 md:gap-4 min-w-0 ${hideHeader ? 'hidden' : ''}`}>
              <div className="flex items-center gap-1">
                {onMenuClick && (
                  <button 
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
                    title="Menu"
                  >
                    <Menu className="w-5 h-5 text-gray-700" />
                  </button>
                )}
                {onBack && (
                  <button 
                    onClick={() => onBack()}
                    className="p-2 hover:bg-gray-50 rounded-xl transition-all flex-shrink-0"
                    title="Go back"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-black text-gray-900 truncate tracking-tight">Events</h1>
                <p className="hidden md:block text-xs md:text-sm text-gray-500 font-medium">Discover, host, and attend world-class events</p>
              </div>
            </div>

            {/* Create Event Button */}
            <div className="flex-shrink-0">
              <button
                onClick={handleHostEventClick}
                className="px-4 py-2 md:px-5 md:py-2.5 font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-102 active:scale-98 transition-all flex items-center gap-2 text-xs md:text-sm text-white"
                style={{ 
                  backgroundColor: !isLoggedIn 
                    ? '#6b7280' 
                    : !hasHostAccess 
                      ? brandColors.electricBlue 
                      : '#2563eb' 
                }}
              >
                {!isLoggedIn ? (
                  <>
                    <Crown className="w-4 h-4" />
                    <span className="hidden md:inline">Login to Host Events</span>
                    <span className="md:hidden">Login</span>
                  </>
                ) : !hasHostAccess ? (
                  <>
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span className="hidden md:inline">{Capacitor.getPlatform() === 'ios' ? 'Host Events' : 'Upgrade to Host'}</span>
                    <span className="md:hidden">{Capacitor.getPlatform() === 'ios' ? 'Host' : 'Upgrade'}</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span className="hidden md:inline">Host Webinar/Event</span>
                    <span className="md:hidden">Host Event</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filters & Tabs */}
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Main Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                {['upcoming', 'past', 'my-events', 'recommended'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-3 lg:px-4 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start hidden lg:flex">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub Filters (Event Types) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
              <button
                onClick={() => setSelectedEventType('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap flex-shrink-0 ${selectedEventType === 'all'
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
              >
                All Types
              </button>
              {[
                { id: 'webinar', label: 'Webinars' },
                { id: 'workshop', label: 'Workshops' },
                { id: 'networking', label: 'Networking' },
                { id: 'masterclass', label: 'Masterclasses' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedEventType(type.id as EventType)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap flex-shrink-0 ${selectedEventType === type.id
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  style={selectedEventType === type.id ? { backgroundColor: getEventTypeColor(type.id as EventType) } : {}}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {eventsError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              {eventsError}
            </div>
          )}
          {eventsLoading && (
            <div className="mb-6 p-4 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 text-sm">
              Loading events...
            </div>
          )}

          {/* ROLE SPECIFIC WIDGETS */}
          <div className="mb-8">
            {activeTab === 'my-events' && myEventsTab === 'hosting' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Total Hosted</p>
                  <p className="text-2xl font-bold text-gray-900">{events.filter(e => e.isHost).length} Events</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Total Attendees</p>
                  <p className="text-2xl font-bold text-blue-600">{events.filter(e => e.isHost).reduce((sum, e) => sum + e.attendees, 0)} People</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Events Hosted</p>
                  <p className="text-2xl font-bold text-emerald-600">{events.filter(e => e.isHost && e.status === 'completed').length} Completed</p>
                </div>
              </div>
            )}

            {/* Demo Day Applications section removed */}
          </div>

          {/* MY EVENTS SUB-TABS (Expert/Investor) */}
          {activeTab === 'my-events' && (
            <div className="flex items-center gap-6 mb-6 border-b border-gray-200">
              <button
                onClick={() => setMyEventsTab('attending')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${myEventsTab === 'attending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
              >
                Attending
              </button>
              <button
                onClick={() => setMyEventsTab('hosting')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${myEventsTab === 'hosting' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
              >
                Hosting
              </button>
            </div>
          )}

          {/* OFFICIAL NEXTIGNITION EVENTS */}
          {activeTab !== 'my-events' && viewMode !== 'calendar' && officialEvents.length > 0 && (
            <section className="mb-8 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border border-blue-100 rounded-2xl p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: brandColors.electricBlue }}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    Official NextIgnition Events
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </h2>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Hosted by the NextIgnition team</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {officialEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    className="group bg-white rounded-xl border border-blue-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="relative h-36 overflow-hidden">
                      <ImageWithFallback src={event.thumbnail} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-sm">
                        <CheckCircle className="w-3 h-3" /> OFFICIAL
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 mb-2">
                        <Calendar className="w-3 h-3" />
                        {event.date} • {event.time}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{event.title?.trim() || 'Untitled Event'}</h3>
                      <div className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">{event.type.replace('-', ' ')}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* EVENTS GRID */}
          {viewMode === 'calendar' ? (
            <CalendarView />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layoutId={`event-${event.id}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
                  onClick={() => setSelectedEvent(event)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 overflow-hidden">
                    <ImageWithFallback
                      src={event.thumbnail}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Overlay Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur text-xs font-bold text-gray-900 shadow-sm">
                        {event.type.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>


                    {/* Price Badge — never show a price on iOS (Apple Guideline 3.1.1) */}
                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/70 backdrop-blur text-white text-xs font-bold">
                      {event.price === 'free'
                        ? 'Free'
                        : (Capacitor.getPlatform() === 'ios' ? '—' : `₹${event.price}`)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {event.date} • {event.time}
                      </div>
                    </div>

                    {(() => {
                      // Show the host's real title/description; only fall back to a
                      // neutral placeholder when genuinely empty (don't overwrite real
                      // short titles with fabricated marketing copy).
                      const displayTitle = event.title?.trim() || 'Untitled Event';
                      const displayDescription = event.description?.trim() || 'No description provided.';

                      return (
                        <>
                          <h3 className="font-bold text-base md:text-lg text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                            {displayTitle}
                          </h3>

                          <p className="text-xs md:text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                            {displayDescription}
                          </p>
                        </>
                      );
                    })()}

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200 bg-gray-100 flex-shrink-0">
                        {event.host.avatar && (event.host.avatar.startsWith('http') || event.host.avatar.startsWith('/uploads') || event.host.avatar.includes('/')) ? (
                          <ImageWithFallback src={event.host.avatar} alt={event.host.name} className="w-full h-full object-cover" />
                        ) : (
                          event.host.avatar
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">By {event.host.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{event.host.role}</p>
                      </div>
                    </div>

                    {/* Consolidated Footer */}
                    <div className="pt-4 border-t border-gray-100 mt-auto">
                      {/* Branding Row */}
                      <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-1.5 opacity-60">
                           <div className="w-4 h-4 rounded bg-gray-900 flex items-center justify-center p-0.5">
                              <img src="/logo-white.png" alt="" className="w-full h-full object-contain" />
                           </div>
                           <span className="text-[10px] font-bold text-gray-400 tracking-tight uppercase">Powered by Next Ignition</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                          <Users className="w-3 h-3" />
                          {event.attendees} Registered
                        </div>
                      </div>

                      {/* Action Row */}
                      {!event.isHost ? (
                        Capacitor.getPlatform() === 'ios' && event.price !== 'free' ? (
                          <div className="w-full py-2.5 text-center text-[10px] font-medium text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                            Paid tickets aren't available in the app
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegisterToggle(event);
                            }}
                            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                              event.isRegistered 
                                ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600' 
                                : 'bg-blue-600 text-white shadow-md hover:shadow-lg'
                            }`}
                          >
                            {event.isRegistered ? (event.price === 'free' ? 'Unregister' : 'Request Refund') : (event.price === 'free' ? 'Register Now' : `Buy Ticket • ₹${event.price}`)}
                          </button>
                        )
                      ) : (
                        <div className="w-full py-2.5 text-center text-blue-600 bg-blue-50 text-xs font-black rounded-lg uppercase tracking-widest">
                          You are hosting
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-[10px] text-gray-400 font-semibold tracking-wide uppercase">Powered by Next Ignition</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {viewMode === 'list' && filteredEvents.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No events found</h3>
              <p className="text-gray-500">Try adjusting your filters or check back later.</p>
            </div>
          )}
        </div>
      </main>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: brandColors.electricBlue }}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">Host New Event</h2>
                  <p className="text-sm text-gray-500">Fields marked <span className="text-red-500">*</span> are required to publish.</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
              {/* Event Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { label: 'Webinar', value: 'webinar' },
                    { label: 'Workshop', value: 'workshop' },
                    { label: 'Networking', value: 'networking' },
                    { label: 'Masterclass', value: 'masterclass' },
                  ] as const).map(t => (
                    <button
                      key={t.value}
                      onClick={() => setCreateForm(f => ({ ...f, type: t.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium hover:border-blue-500 hover:bg-blue-50 text-center transition-colors"
                      style={createForm.type === t.value ? { borderColor: brandColors.electricBlue, backgroundColor: '#EFF6FF', color: brandColors.electricBlue } : {}}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title <span className="text-red-500">*</span></label>
                  <input name="input-81d1a7"
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Q1 Investor Showcase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea name="textarea-68d600"
                    rows={4}
                    value={createForm.description}
                    onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Describe what attendees will learn and why they should join..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presentation (PPT/PDF)</label>
                  {createForm.presentationUrl ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => window.open(createForm.presentationUrl, '_blank')}
                        className="px-4 py-2.5 text-blue-600 font-bold border border-blue-100 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, presentationUrl: '' }))}
                        className="px-4 py-2.5 text-gray-700 font-medium border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="create-presentation-upload"
                        className="hidden"
                        accept=".pdf,.ppt,.pptx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setPresentationUploading(true);
                            const fd = new FormData();
                            fd.append('presentation', file);
                            const res = await api.post('/events/upload-presentation', fd);
                            const url = res.data?.presentationUrl;
                            if (url) {
                              setCreateForm(f => ({ ...f, presentationUrl: url }));
                            } else {
                              setEventsError('Upload failed: no URL returned');
                            }
                          } catch (err: any) {
                            setEventsError(err.response?.data?.message || 'Failed to upload presentation');
                          } finally {
                            setPresentationUploading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                      <label
                        htmlFor="create-presentation-upload"
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-gray-700 font-medium border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-4 h-4" />
                        {presentationUploading ? 'Uploading...' : 'Upload Presentation'}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Optional — you can add slides or recordings later.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select name="select-fe6c97"
                      value={createForm.category}
                      onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select category</option>
                      <option value="technology">Technology</option>
                      <option value="business">Business</option>
                      <option value="marketing">Marketing</option>
                      <option value="finance">Finance</option>
                      <option value="product">Product</option>
                      <option value="design">Design</option>
                      <option value="sales">Sales</option>
                      <option value="hr">HR & Talent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <select name="select-cf102d"
                      value={String(createForm.durationMinutes)}
                      onChange={(e) => setCreateForm(f => ({ ...f, durationMinutes: Number(e.target.value || 60) }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select duration</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                      <option value="180">3 hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input name="input-fed6a6"
                    type="text"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm(f => ({ ...f, tags: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. startup, funding, pitch (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                    <input name="input-e95b36"
                      type="date"
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time <span className="text-red-500">*</span></label>
                    <input name="input-b63157"
                      type="time"
                      value={createForm.startTime}
                      onChange={(e) => setCreateForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Format */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCreateForm(f => ({ ...f, format: 'virtual' }))}
                      className="border border-gray-200 rounded-lg p-3 text-sm font-medium hover:border-blue-500 hover:bg-blue-50 flex items-center gap-2"
                      style={createForm.format === 'virtual' ? { borderColor: brandColors.electricBlue, backgroundColor: '#EFF6FF' } : {}}
                    >
                      <Video className="w-4 h-4" />
                      Virtual
                    </button>
                    <button
                      onClick={() => setCreateForm(f => ({ ...f, format: 'in-person' }))}
                      className="border border-gray-200 rounded-lg p-3 text-sm font-medium hover:border-blue-500 hover:bg-blue-50 flex items-center gap-2"
                      style={createForm.format === 'in-person' ? { borderColor: brandColors.electricBlue, backgroundColor: '#EFF6FF' } : {}}
                    >
                      <MapPin className="w-4 h-4" />
                      In-Person
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Location / Meeting Link</label>
                    {createForm.format === 'virtual' && (
                      <button
                        type="button"
                        onClick={generateMeetingLink}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Video className="w-3.5 h-3.5" /> Generate link
                      </button>
                    )}
                  </div>
                  <input name="input-b8bcbe"
                    type="text"
                    value={createForm.locationOrLink}
                    onChange={(e) => setCreateForm(f => ({ ...f, locationOrLink: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={createForm.format === 'virtual' ? 'Paste a Zoom/Meet link, or tap “Generate link”' : 'e.g. physical address'}
                  />
                  {createForm.format === 'virtual' && !createForm.locationOrLink && (
                    <p className="text-xs text-gray-500 mt-1">No link? “Generate link” creates a free instant meeting room.</p>
                  )}
                  <div className="mt-2">
                    {(() => {
                      const gcalUrl = buildGoogleCalendarUrl();
                      return (
                        <a
                          href={gcalUrl || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { if (!gcalUrl) { e.preventDefault(); setEventsError('Add a date and time first to create a calendar event.'); } }}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${gcalUrl ? 'text-gray-700 hover:text-blue-600' : 'text-gray-400 cursor-not-allowed'}`}
                        >
                          <Calendar className="w-3.5 h-3.5" /> Add to Google Calendar
                        </a>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                    <input name="input-3f5839"
                      type="text"
                      value={formatWithCommas(String(createForm.maxAttendees))}
                      onChange={(e) => {
                        const val = parseNumericValue(e.target.value);
                        if (val === '' || /^\d+$/.test(val)) setCreateForm(f => ({ ...f, maxAttendees: val }));
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select name="select-82337e" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="english">English</option>
                      <option value="hindi">Hindi</option>
                      <option value="both">English & Hindi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pricing</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="price"
                        checked={pricingType === 'free'}
                        onChange={() => setPricingType('free')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Free</span>
                    </label>
                    {/* Paid/Custom event creation hidden on iOS — no in-app digital-goods commerce (Apple Guideline 3.1.1) */}
                    {Capacitor.getPlatform() !== 'ios' && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="price"
                            checked={pricingType === 'paid'}
                            onChange={() => setPricingType('paid')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">Paid (₹499)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="price"
                            checked={pricingType === 'custom'}
                            onChange={() => setPricingType('custom')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">Custom</span>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Custom Price Input */}
                  {pricingType === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="relative"
                    >
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₹</span>
                      </div>
                      <input name="input-17849d"
                        type="text"
                        value={formatWithCommas(customPrice)}
                        onChange={(e) => {
                          const val = parseNumericValue(e.target.value);
                          if (val === '' || /^\d+$/.test(val)) setCustomPrice(val);
                        }}
                        placeholder="Enter amount"
                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </motion.div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Paid hosting requires completed KYC (email/profile, phone, and ID verification).
                </p>
                <div>
                  <textarea name="textarea-79f19e"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Any prerequisites or requirements for attendees..."
                  />
                </div>

                {/* Agenda Builder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Agenda</label>
                  <div className="space-y-3 mb-3">
                    {[
                      { time: '00:00', title: 'Welcome & Introduction' },
                      { time: '00:15', title: 'Main Session' }
                    ].map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <input name="input-5761fd"
                          type="text"
                          defaultValue={item.time}
                          placeholder="00:00"
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        />
                        <input name="input-bccd8b"
                          type="text"
                          defaultValue={item.title}
                          placeholder="Agenda item title"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                        <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Agenda Item
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Settings</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input name="input-2b8961" type="checkbox" className="text-blue-600 focus:ring-blue-500" />
                      Enable Q&A session
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input name="input-956cde" type="checkbox" className="text-blue-600 focus:ring-blue-500" />
                      Allow recordings
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input name="input-d15f72" type="checkbox" defaultChecked className="text-blue-600 focus:ring-blue-500" />
                      Send reminder emails
                    </label>
                  </div>
                </div>
              </div>


            </div>

            <div className="flex-shrink-0 border-t border-gray-100 bg-white">
              {eventsError && (
                <div className="mx-6 mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{eventsError}</span>
                </div>
              )}
              <div className="px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={handleCreateEvent}
                disabled={createSubmitting}
                className={`px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors ${createSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {createSubmitting ? 'Publishing...' : 'Publish Event'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── ELITE UPGRADE MODAL ───────────────────────────────────────── */}
      {showEliteUpgradeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-y-auto overflow-x-hidden max-h-[90vh]">
            {/* Simple header */}
            <div className="p-8 text-white relative overflow-hidden" style={{ backgroundColor: brandColors.navyBlue }}>
              <div className="absolute top-0 right-0 w-52 h-52 bg-white/10 rounded-full -translate-y-20 translate-x-20 pointer-events-none" />
              <button
                onClick={() => setShowEliteUpgradeModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    {Capacitor.getPlatform() !== 'ios' && (
                      <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest">Elite Plan Required</p>
                    )}
                    <h2 className="text-2xl font-bold text-white">Host Your Own Events</h2>
                  </div>
                </div>
                <p className="text-blue-100 text-sm leading-relaxed">
                  {Capacitor.getPlatform() === 'ios'
                    ? "Hosting webinars and events is available with NextIgnition Premium."
                    : <>Hosting webinars and events is an <strong className="text-white">Elite</strong> feature. Upgrade now to start building your audience.</>}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Plan badge row — hidden on iOS (no plan/tier surfaces, Apple Guideline 3.1.1) */}
              {Capacitor.getPlatform() !== 'ios' && (
                <div className="flex items-center gap-2 mb-5">
                  <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                    Current: {userPlan} Plan
                  </div>
                  <div className="h-px flex-1 bg-gray-100" />
                  <div className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                    Elite — Unlock All
                  </div>
                </div>
              )}

              {/* Feature list */}
              <div className="space-y-3 mb-6">
                {[
                  'Host unlimited webinars & events',
                  'Host paid events & charge attendees',
                  'Attendee analytics dashboard',
                  'Verified badge on your events',
                  'Priority listing in event discovery',
                  'Upload presentations & recordings',
                ].map((label) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-900 font-medium flex-1">{label}</span>
                    {Capacitor.getPlatform() !== 'ios' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">Elite</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Pricing card — never shown on iOS (Apple Guideline 3.1.1: no prices/purchase surfaces) */}
              {Capacitor.getPlatform() !== 'ios' && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 mb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-0.5">Elite Plan</p>
                      <p className="text-gray-900 font-bold text-xl">
                        ₹{currentUser?.role === 'investor' ? '4,999' : currentUser?.role === 'expert' ? '1,999' : '2,999'}
                        <span className="text-gray-400 text-sm font-normal"> /mo</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Save 17% with annual billing</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowEliteUpgradeModal(false);
                    window.location.hash = '#pricing';
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#1e40af' }}
                >
                  Upgrade to Premium
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowEliteUpgradeModal(false)}
                  className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Maybe later
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-3 opacity-60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-900 flex items-center justify-center p-1">
                    <img src="/logo-white.png" alt="" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 tracking-wider">Powered by <span className="text-gray-900">Next Ignition</span></span>
                </div>
                <p className="text-[10px] text-gray-400 font-medium text-center">Standard Event Protocol v2.4 • Secure Escrow Payments Enabled</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// MEETING ROOM PAGE SUB-COMPONENT
// ----------------------------------------------------------------------
function MeetingRoomPage({ event, onBack }: { event: Event; onBack: () => void }) {
  const [activeResource, setActiveResource] = useState<string | null>(null);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);

  const handleLaunchMeeting = () => {
    let link = event.meetingLink || 'https://meet.google.com/new';
    if (!link.startsWith('http') && !link.startsWith('//')) {
      link = 'https://' + link;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (name: string) => {
    setActiveResource(name);
    setTimeout(() => {
      setActiveResource(null);
      alert(`${name} is being prepared for download.`);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Sidebar for Details */}
      <div className="w-full lg:w-1/3 flex flex-col border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold truncate text-gray-900">{event.title}</h2>
        </div>

        <div className="p-6 space-y-8">
          {/* Host Info */}
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white flex-shrink-0">
              {event.host.avatar && (event.host.avatar.startsWith('http') || event.host.avatar.startsWith('/uploads') || event.host.avatar.includes('/')) ? (
                <ImageWithFallback src={event.host.avatar} alt={event.host.name} className="w-full h-full object-cover" />
              ) : (
                event.host.avatar
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Hosted by</p>
              <p className="font-bold text-gray-900">{event.host.name}</p>
              <p className="text-xs text-gray-500">{event.host.role}</p>
            </div>
            {event.host.id && (
              <button
                onClick={() => { window.location.hash = `#profile/${event.host.type}/${event.host.id}`; }}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Eye className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Event Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">About Event</h3>
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{event.description || 'No description provided for this session.'}</p>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <Clock className="w-4 h-4 text-blue-500 mb-2" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Duration</p>
                  <p className="text-sm font-bold text-gray-900">{event.duration}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <Users className="w-4 h-4 text-emerald-500 mb-2" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Attendees</p>
                  <p className="text-sm font-bold text-gray-900">{event.attendees}+ Joined</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Session Resources</h3>
            <div className="space-y-3">
              {Capacitor.getPlatform() !== 'ios' && (
                <button
                  onClick={() => handleDownload('Presentation Slides')}
                  disabled={!!activeResource}
                  className="w-full p-4 flex items-center gap-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-gray-900">Presentation Slides</p>
                    <p className="text-[10px] text-gray-400">PDF • 4.2 MB</p>
                  </div>
                  {activeResource === 'Presentation Slides' ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-gray-300 group-hover:text-blue-600" />
                  )}
                </button>
              )}

              {Capacitor.getPlatform() !== 'ios' && (
                <button
                  onClick={() => handleDownload('Event Transcript')}
                  disabled={!!activeResource}
                  className="w-full p-4 flex items-center gap-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-gray-900">Event Transcript</p>
                    <p className="text-[10px] text-gray-400">DOCX • 120 KB</p>
                  </div>
                  {activeResource === 'Event Transcript' ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-gray-300 group-hover:text-blue-600" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-4 h-4 rounded bg-gray-900 flex items-center justify-center p-0.5">
                <img src="/logo-white.png" alt="" className="w-full h-full object-contain" />
             </div>
             <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Powered by Next Ignition</span>
          </div>
          <p className="text-[10px] text-gray-400 text-center font-medium">
            Powered by Next Ignition • Secure & Encrypted Connection
          </p>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
        
        <div className="max-w-md w-full text-center space-y-10 relative z-10">
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mx-auto relative shadow-inner"
            >
              <Video className="w-14 h-14 text-blue-600" />
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-blue-400 rounded-full"
              />
            </motion.div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Ready to join?</h1>
            <p className="text-gray-500 font-medium">The session is currently live. Your expert is waiting.</p>
          </div>

          <div className="p-8 rounded-[32px] bg-white border border-gray-200 shadow-2xl shadow-blue-500/10 space-y-8">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 shadow-sm border border-emerald-100 flex items-center justify-center">
                  <Video className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-gray-900">Google Meet</p>
                  <p className="text-xs text-gray-400 font-medium">Secure Video Call</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                LIVE NOW
              </div>
            </div>

            <button
              onClick={handleLaunchMeeting}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[20px] shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 text-lg"
            >
              <Video className="w-6 h-6" />
              Join via Google Meet
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setMicActive(!micActive)}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${micActive
                    ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-md'
                    : 'bg-red-50 border-red-200 text-red-600 shadow-sm'
                  }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <p className={`text-[10px] font-bold uppercase transition-colors ${micActive ? 'text-blue-600' : 'text-red-600'}`}>
                {micActive ? 'Mic Ready' : 'Mic Muted'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setCamActive(!camActive)}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${camActive
                    ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-md'
                    : 'bg-red-50 border-red-200 text-red-600 shadow-sm'
                  }`}
              >
                <Video className="w-5 h-5" />
              </button>
              <p className={`text-[10px] font-bold uppercase transition-colors ${camActive ? 'text-blue-600' : 'text-red-600'}`}>
                {camActive ? 'Cam Active' : 'Cam Off'}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            By joining, you agree to our Code of Conduct. Ensure you have a stable internet connection for the best experience.
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// EVENT DETAIL PAGE SUB-COMPONENT
// ----------------------------------------------------------------------
function EventDetailPage({
  event,
  onBack,
  role,
  onRegister,
  onJoin,
  onAddToCalendar,
  onEditEvent
}: {
  event: Event;
  onBack: () => void;
  role: UserRole;
  onRegister: (e: Event) => void;
  onJoin: (e: Event) => void;
  onAddToCalendar: (e: Event) => void;
  onEditEvent: (e: Event) => void;
}) {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [presentationUrl, setPresentationUrl] = useState<string | undefined>(event.presentationUrl);
  const [uploading, setUploading] = useState(false);
  const [hostActionLoading, setHostActionLoading] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletBalancePaise, setWalletBalancePaise] = useState<number>(0);
  const [walletCurrency, setWalletCurrency] = useState<string>('INR');
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [showReportEvent, setShowReportEvent] = useState(false);

  useEffect(() => {
    if (event.isHost && event.apiId) {
      api.get(`/events/${event.apiId}/attendees`)
        .then(res => setAttendees(res.data))
        .catch(console.error);
    }
  }, [event.apiId, event.isHost]);

  const runHostAction = async (endpoint: string, body?: any) => {
    if (!event.apiId) return;
    try {
      setHostActionLoading(true);
      await api.post(`/events/${event.apiId}/${endpoint}`, body || {});
      alert('Action completed successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete action.');
    } finally {
      setHostActionLoading(false);
    }
  };

  const loadFinancialSummary = async () => {
    if (!event.apiId) return;
    try {
      setHostActionLoading(true);
      const { data } = await api.get(`/events/${event.apiId}/financials`);
      setFinancialSummary(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load event financials.');
    } finally {
      setHostActionLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      setWalletLoading(true);
      const [walletResp, txResp] = await Promise.all([
        api.get('/wallet/me'),
        api.get('/wallet/transactions', { params: { limit: 50 } }),
      ]);
      setWalletBalancePaise(Number(walletResp.data?.balancePaise || 0));
      setWalletCurrency(String(walletResp.data?.currency || 'INR'));
      setWalletTxns(Array.isArray(txResp.data?.transactions) ? txResp.data.transactions : []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load wallet.');
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto">
        {/* Cover */}
        <div className="h-64 md:h-80 relative bg-gray-900">
          <ImageWithFallback
            src={event.thumbnail}
            alt={event.title}
            className="w-full h-full object-cover opacity-60"
          />
          <button
            onClick={onBack}
            className="absolute top-6 left-6 p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          {/* Report event — Apple Guideline 1.2 (UGC moderation); only for events you don't host */}
          {!event.isHost && (
            <button
              onClick={() => setShowReportEvent(true)}
              title="Report event"
              className="absolute top-6 right-6 p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <ReportFlagIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <ReportDialog
          open={showReportEvent}
          onClose={() => setShowReportEvent(false)}
          targetType="event"
          targetId={String(event.id)}
          targetLabel={event.title}
        />

        <div className="px-6 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
                  {event.type.replace('-', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${event.status === 'upcoming' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                  {event.status}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{event.title}</h1>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Powered by Next Ignition</p>

              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span>{event.time} ({event.duration})</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>Online Event</span>
                </div>
              </div>
            </div>

            {/* Host */}
            <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {event.host.avatar && (event.host.avatar.startsWith('http') || event.host.avatar.startsWith('/uploads') || event.host.avatar.includes('/')) ? (
                  <ImageWithFallback src={event.host.avatar} alt={event.host.name} className="w-full h-full object-cover" />
                ) : (
                  event.host.avatar
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  {event.host.name}
                  {event.host.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                </h3>
                <p className="text-sm text-gray-500">{event.host.role}</p>
              </div>
              {event.host.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); window.location.hash = `#profile/${event.host.type}/${event.host.id}`; }}
                  className="ml-auto text-sm font-bold text-blue-600 px-4 py-2 hover:bg-blue-50 rounded-lg"
                >
                  View Profile
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xl font-bold mb-3">About this Event</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {event.description}
                {/* Generic boilerplate identical on every event — hidden on iOS so only the real description shows (Apple 2.1/2.3.1) */}
                {Capacitor.getPlatform() !== 'ios' && '\n\nJoin us for an immersive session designed to help you navigate the complexities of the current startup ecosystem. Whether you are just starting out or looking to scale, this event provides actionable insights.'}
              </p>
            </div>

            {/* Agenda — generic template identical across all events; hidden on iOS (Apple 2.1/2.3.1) */}
            {Capacitor.getPlatform() !== 'ios' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Agenda</h3>
              <div className="space-y-4">
                {[
                  { time: '00:00', title: 'Welcome & Introduction' },
                  { time: '00:15', title: 'Keynote Presentation' },
                  { time: '00:45', title: 'Panel Discussion' },
                  { time: '01:15', title: 'Q&A Session' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-16 font-mono text-sm text-gray-500 pt-1">{item.time}</div>
                    <div className="pb-4 border-l-2 border-gray-100 pl-6 relative">
                      <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-blue-400" />
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="p-6 rounded-2xl border border-gray-200 shadow-lg sticky top-6">
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-500 mb-1">Price</p>
                <p className="text-4xl font-bold text-gray-900">
                  {event.price === 'free'
                    ? 'Free'
                    : (Capacitor.getPlatform() === 'ios' ? '—' : `₹${event.price}`)}
                </p>
              </div>

              {Capacitor.getPlatform() === 'ios' && !event.isRegistered && !event.isHost && event.price !== 'free' ? (
                <div className="w-full py-3.5 text-center text-sm font-medium text-slate-500 bg-slate-50 rounded-xl border border-slate-200 mb-3">
                  Paid tickets aren't available in the app
                </div>
              ) : (
                <button
                  onClick={() => (event.isRegistered || event.isHost) ? onJoin(event) : onRegister(event)}
                  className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all mb-3"
                >
                  {(event.isRegistered || event.isHost)
                    ? 'Join Event'
                    : (event.price === 'free' ? 'Register Now' : 'Buy Ticket')}
                </button>
              )}

              {event.isRegistered && (
                <button
                  onClick={() => onAddToCalendar(event)}
                  className="w-full py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-xl border border-gray-200 mb-4"
                >
                  Add to Calendar
                </button>
              )}



              {(event.isHost) && (
                <button
                  onClick={() => onEditEvent(event)}
                  className="w-full py-2.5 mt-2 text-blue-600 font-bold border border-blue-100 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  Edit Event Details
                </button>
              )}

              {event.isHost && (
                <>
                  {/* Payout / Wallet / financials — hidden on iOS (no payment surfaces;
                      iOS events are always free so there is nothing to pay out). */}
                  {Capacitor.getPlatform() !== 'ios' && (
                    <>
                      <button
                        onClick={() => runHostAction('complete')}
                        disabled={hostActionLoading}
                        className="w-full py-2.5 mt-2 text-emerald-700 font-bold border border-emerald-100 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-60"
                      >
                        Mark Completed (Enable Payout)
                      </button>
                      <button
                        onClick={() => runHostAction('release-payout')}
                        disabled={hostActionLoading}
                        className="w-full py-2.5 mt-2 text-violet-700 font-bold border border-violet-100 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors disabled:opacity-60"
                      >
                        Release Payout
                      </button>
                      <button
                        onClick={async () => {
                          setWalletOpen(true);
                          await loadWallet();
                        }}
                        disabled={walletLoading}
                        className="w-full py-2.5 mt-2 text-blue-700 font-bold border border-blue-100 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-60"
                      >
                        Wallet
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => runHostAction('cancel', { reason: 'host_cancelled' })}
                    disabled={hostActionLoading}
                    className="w-full py-2.5 mt-2 text-red-700 font-bold border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
                  >
                    {Capacitor.getPlatform() === 'ios' ? 'Cancel Event' : 'Cancel Event + Refund Attendees'}
                  </button>
                  {Capacitor.getPlatform() !== 'ios' && (
                    <button
                      onClick={loadFinancialSummary}
                      disabled={hostActionLoading}
                      className="w-full py-2.5 mt-2 text-gray-700 font-bold border border-gray-200 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60"
                    >
                      View Financial Summary
                    </button>
                  )}
                </>
              )}

              {walletOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <div>
                        <div className="text-lg font-bold text-gray-900">Wallet</div>
                        <div className="text-sm text-gray-500">Balance: {walletCurrency} {Math.round(walletBalancePaise / 100)}</div>
                      </div>
                      <button
                        onClick={() => setWalletOpen(false)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Close"
                      >
                        <X className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>

                    <div className="p-5">
                      {walletLoading ? (
                        <div className="text-sm text-gray-600">Loading...</div>
                      ) : walletTxns.length === 0 ? (
                        <div className="text-sm text-gray-600">No wallet transactions yet.</div>
                      ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                          {walletTxns.map((t: any) => {
                            const d = t?.data || {};
                            const direction = String(d.direction || '');
                            const amountPaise = Number(d.amountPaise || 0);
                            const sign = direction === 'debit' ? '-' : '+';
                            const amount = Math.round(amountPaise / 100);
                            const label = String(d.entryKind || d.sourceType || 'transaction');
                            const created = t?.created_at ? new Date(t.created_at).toLocaleString() : '';
                            return (
                              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{label}</div>
                                  <div className="text-xs text-gray-500">{created}</div>
                                </div>
                                <div className={`text-sm font-bold ${direction === 'debit' ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {sign}{walletCurrency} {amount}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {event.isHost && financialSummary && (
                <div className="mt-3 p-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-700 space-y-1">
                  <p className="font-bold text-gray-900">Financial Summary</p>
                  <p>Paid Tickets: {financialSummary?.stats?.paidTickets ?? 0}</p>
                  <p>Gross: ₹{Math.round((financialSummary?.stats?.grossPaise ?? 0) / 100)}</p>
                  <p>Commission: ₹{Math.round((financialSummary?.stats?.commissionPaise ?? 0) / 100)}</p>
                  <p>Host Net: ₹{Math.round((financialSummary?.stats?.hostNetPaise ?? 0) / 100)}</p>
                  <p>Refunded: ₹{Math.round((financialSummary?.stats?.refundedPaise ?? 0) / 100)}</p>
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase mb-2">Powered by Next Ignition</p>
                <p className="text-sm font-bold text-gray-900 mb-3">Attendees</p>
                {event.isHost ? (
                  <div className="space-y-3 mt-4">
                     {attendees.length === 0 ? <p className="text-sm text-gray-500">No attendees yet.</p> : attendees.map(u => (
                       <div key={u._id} className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                           {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{(u.name || 'U')[0]}</div>}
                         </div>
                         <div className="text-sm font-medium text-gray-900">{u.name}</div>
                       </div>
                     ))}
                  </div>
                ) : (
                  /* Real registered count — no fabricated avatars or "+100" (Apple 2.3.1) */
                  event.attendees > 0 ? (
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {Array.from({ length: Math.min(event.attendees, 4) }).map((_, i) => (
                          <div
                            key={i}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gradient-to-br from-blue-500 to-purple-500"
                          />
                        ))}
                        {event.attendees > 4 && (
                          <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[11px] text-gray-600 font-semibold">
                            +{(event.attendees - 4).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {event.attendees.toLocaleString()} {event.attendees === 1 ? 'person' : 'people'} registered
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-2">Be the first to register</p>
                  )
                )}
              </div>

              {/* Presentation Section */}
              <div className="pt-6 mt-6 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-900 mb-3">Event Presentation</p>
                {presentationUrl ? (
                  <button
                    onClick={() => window.open(presentationUrl, '_blank')}
                    className="w-full py-2.5 flex items-center justify-center gap-2 text-blue-600 font-bold border border-blue-100 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    View Presentation
                  </button>
                ) : event.isHost ? (
                  <div>
                    <input 
                      type="file" 
                      id="presentation-upload" 
                      className="hidden" 
                      accept=".pdf,.ppt,.pptx"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !event.apiId) return;
                        try {
                          setUploading(true);
                          const fd = new FormData();
                          fd.append('presentation', file);
                          const res = await api.post(`/events/${event.apiId}/presentation`, fd);
                          setPresentationUrl(res.data.presentationUrl);
                        } catch (err) {
                          console.error(err);
                          alert('Failed to upload presentation');
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    <label 
                      htmlFor="presentation-upload"
                      className="w-full py-2.5 flex items-center justify-center gap-2 text-gray-600 font-medium border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Upload Presentation'}
                    </label>
                  </div>
                ) : (
                   <p className="text-sm text-gray-500">No presentation uploaded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
