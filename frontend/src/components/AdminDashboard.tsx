import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationsDropdown } from './NotificationsDropdown';
import {
  Home, BarChart3, Activity, Users, UserCheck, UserX, Search, CreditCard,
  FileText, Flag, Image, MessageSquare, Rocket, Briefcase, GraduationCap,
  Calendar, Mic, DollarSign, TrendingUp, Gift, Filter as FilterIcon,
  Shield, AlertTriangle, ScrollText, Lock, Settings, Palette, Mail, Bot,
  Wrench, ExternalLink, LogOut, Bell, ChevronDown, X, Check, MoreVertical,
  Eye, Trash2, Plus, Download, RefreshCw, ChevronRight, Zap, Clock, Menu,
  ArrowRight, Edit, BadgeCheck, Star, Send, Phone, Linkedin, Apple
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { logout } from '../services/authService';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

import { getSingletonApiBase } from '../utils/apiResolution';

// --- SINGLETON API SYNC ---
const API_BASE = getSingletonApiBase(import.meta.env.VITE_API_URL);

/** Unified fetch with automatic Singleton API resolution and auth headers */
const adminFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const rawToken = localStorage.getItem('adminToken');
  const token = rawToken?.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${fullPath}`;

  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  return fetch(url, { ...init, headers });
};

const getAdminToken = () => localStorage.getItem('adminToken') || '';
const authHeaders = (token: string) => {
  const raw = token?.startsWith('Bearer ') ? token.split(' ')[1] : token;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${raw}`,
  };
};

/** Decode role from JWT payload without a library */
const getAdminRoleFromToken = (token: string): string => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || 'SECONDARY_ADMIN';
  } catch { return 'SECONDARY_ADMIN'; }
};

// ─── Types ──────────────────────────────────────────────────────────────────
type NavigationItem = { id: string; label: string; icon: any; section?: string; primaryOnly?: boolean };

interface DashboardData {
  users: {
    total: number; founders: number; experts: number; investors: number;
    frozen: number; activeToday: number; newThisWeek: number; newThisMonth: number;
    newInRange: number; rangeLabel: string;
  };
  revenue: { total: number; thisMonth: number; inRange: number; transactions: number };
  events: { total: number };
  charts: {
    userGrowth: { date: string; users: number }[];
    revenue: { date: string; revenue: number }[];
    tierBreakdown: { name: string; value: number }[];
  };
  recentUsers: {
    id: string; name: string; email: string; role: string;
    createdAt: string | null; isFrozen: boolean; isVerified: boolean; avatar: string | null;
  }[];
  recentTransactions: {
    id: string; userId: string; amount: number; currency: string;
    status: string; purpose: string; date: string;
  }[];
  appInstalls?: {
    totalInstalls: number; activeInstalls: number; dailyInstalls: number;
    asOf: string | null; packageName: string;
  } | null;
  iosInstalls?: {
    dailyDownloads: number; monthlyDownloads: number;
    monthOf: string | null; asOf: string | null;
  } | null;
}

interface AllUser {
  id: string; name: string; email: string; role: string; roles: string[];
  createdAt: string | null; lastActive: string | null; isVerified: boolean;
  isFrozen: boolean; avatar: string | null; totalSessions: number;
  linkedInUrl?: string | null;
  founder_plan?: 'free' | 'pro' | 'elite';
  expert_plan?: 'free' | 'pro' | 'elite';
  investor_plan?: 'free' | 'pro' | 'elite';
}

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  status: string;
  createdAt: string;
}

const getStatusColor = (isFrozen: boolean, isVerified: boolean) => {
  if (isFrozen) return '#ef4444'; // Red
  if (isVerified) return '#10b981'; // Green
  return '#f59e0b'; // Amber/Orange for unverified
};

const getStatusLabel = (isFrozen: boolean, isVerified: boolean) => {
  if (isFrozen) return 'Frozen';
  if (isVerified) return 'Verified';
  return 'Unverified';
};

// --- Z-INDEX SCALE ---
const Z_INDEX = {
  BASE: 0,
  STICKY: 10,
  SIDEBAR_BACKDROP: 40,
  SIDEBAR_MOBILE: 50,
  HEADER_MOBILE: 60,
  BOTTOM_NAV_MOBILE: 60,
  NOTIFICATIONS_DROPDOWN: 70,
  ACTION_TOAST: 100,
  MODAL_BACKDROP: 140,
  MODAL_CONTENT: 150,
};


const ADMIN_NAV_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, section: 'Overview' },
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, section: 'Overview', primaryOnly: true },
  { id: 'all-users', label: 'All Users', icon: Users, section: 'User Management' },
  { id: 'flagged', label: 'Flagged/Frozen', icon: UserX, section: 'User Management' },
  { id: 'contact-messages', label: 'Contact Messages', icon: Mail, section: 'User Management' },
  { id: 'support-tickets', label: 'Support Tickets', icon: MessageSquare, section: 'User Management', primaryOnly: true },
  // Platform — Secondary admins have access to these:
  { id: 'startup-mgmt', label: 'Startup Management', icon: Rocket, section: 'Platform' },
  { id: 'service-requests', label: 'Service Requests', icon: Wrench, section: 'Platform' },
  { id: 'content-mod', label: 'Content Moderation', icon: Flag, section: 'Platform' },
  { id: 'events-mgmt', label: 'Events & Webinars', icon: Calendar, section: 'Platform' },
  { id: 'notifications', label: 'Notifications', icon: Bell, section: 'Platform' },
  // Business & Revenue — Primary admin only:
  { id: 'payments', label: 'Payments & Finance', icon: DollarSign, section: 'Business & Revenue', primaryOnly: true },
  { id: 'ai-control', label: 'AI Control (Ignisha)', icon: Bot, section: 'Business & Revenue', primaryOnly: true },
  // System — Primary admin only:
  { id: 'platform-settings', label: 'Platform Settings', icon: Settings, section: 'System', primaryOnly: true },
  { id: 'admin-mgmt', label: 'Admin Management', icon: Shield, section: 'System', primaryOnly: true },
  { id: 'logs-security', label: 'Audit Logs', icon: ScrollText, section: 'System', primaryOnly: true },
];

const ADMIN_SECTIONS = ['Overview', 'User Management', 'Platform', 'Business & Revenue', 'System'];

function Sidebar({ 
  adminName, 
  lastUpdated, 
  navigation, 
  activeView, 
  setActiveView, 
  setMobileMenuOpen, 
  fetchDashboard, 
  handleLogout 
}: {
  adminName: string;
  lastUpdated: Date | null;
  navigation: NavigationItem[];
  activeView: string;
  setActiveView: (view: string) => void;
  setMobileMenuOpen: (open: boolean) => void;
  fetchDashboard: () => void;
  handleLogout: () => void;
}) {
  const groupedNav = navigation.reduce((acc, item) => {
    const s = item.section || 'Other';
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <div className="text-xl font-bold mb-1" style={{ color: brandColors.electricBlue }}>NextIgnition</div>
        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">Admin Panel</span>
        <p className="text-xs text-gray-500 mt-2">Logged in as: {adminName}</p>
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Updated {timeAgo(lastUpdated.toISOString())}
          </p>
        )}
      </div>

      <nav className="space-y-5 flex-1 overflow-y-auto">
        {ADMIN_SECTIONS.map(section => (
          <div key={section}>
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">{section}</h3>
            <div className="space-y-0.5">
              {groupedNav[section]?.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive ? 'text-white shadow-md shadow-blue-500/20 translate-x-1' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: brandColors.electricBlue } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-gray-200 space-y-1">
        <button
          onClick={fetchDashboard}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}

const TIER_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280'];

const formatINR = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const timeAgo = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── Skeleton loader ────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// ─── User Detail Modal ──────────────────────────────────────────────────────
const DETAIL_TABS = ['Profile', 'Activity', 'Startups', 'Events', 'Payments', 'Messages', 'Uploads'] as const;
type DetailTab = typeof DETAIL_TABS[number];

function UserDetailModal({
  user, detail, loading, error, onClose,
}: {
  user: AllUser | null;
  detail: any;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>('Profile');

  const rowData = (row: any) => (row && typeof row === 'object' && 'data' in row ? row.data : row);
  const rowCreatedAt = (row: any) => (row?.created_at ?? row?.createdAt ?? rowData(row)?.created_at ?? rowData(row)?.createdAt ?? null);

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
  };
  const fmtINR = (n: number | string | null | undefined) => {
    const v = Number(n);
    if (isNaN(v)) return '—';
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v}`;
  };

  const rel = detail?.related || {};
  const uData = detail?.user?.data || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="absolute left-1/2 top-1/2 w-[94vw] max-w-4xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: brandColors.electricBlue }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">{user?.name || 'User'}</div>
              <div className="text-xs text-gray-500">{user?.email || ''}</div>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">{user?.role || '—'}</span>
            {user?.isVerified && <BadgeCheck className="w-4 h-4 text-green-500" />}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-4 shrink-0 overflow-x-auto">
          {DETAIL_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
              {t === 'Activity' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-bold">
                  {[
                    ...(rel.posts || []),
                    ...(rel.notifications || []),
                  ].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          ) : (
            <>
              {tab === 'Profile' && (
                <div className="space-y-5">
                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard label="Name" value={uData.name || user?.name} />
                    <InfoCard label="Email" value={uData.email || user?.email} />
                    <InfoCard label="Role" value={user?.role} />
                    <InfoCard label="All Roles" value={user?.roles?.join(', ')} />
                    <InfoCard label="Joined" value={fmtDate(user?.createdAt)} />
                    <InfoCard label="Last Active" value={user?.lastActive ? timeAgo(user.lastActive) : '—'} />
                    <InfoCard label="Total Sessions" value={String(user?.totalSessions ?? '—')} />
                    <InfoCard label="Frozen" value={user?.isFrozen ? 'Yes' : 'No'} />
                  </div>
                  {/* Verification */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Verification</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatusBadge label="Verified" active={!!uData.isVerified} />
                      <StatusBadge label="Phone" active={!!uData.phoneVerified} />
                      <StatusBadge label="LinkedIn" active={!!uData.linkedInVerified} />
                      <StatusBadge label="Status" active={false} text={uData.verificationStatus || 'none'} />
                    </div>
                  </div>
                  {/* LinkedIn URL */}
                  {uData.linkedInUrl && (
                    <div className="p-4 rounded-xl border border-gray-200 bg-blue-50/50">
                      <div className="text-xs font-semibold text-gray-500 mb-1">LinkedIn URL</div>
                      <a href={uData.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
                        {uData.linkedInUrl}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {/* Bio / headline */}
                  {uData.headline && <InfoCard label="Headline" value={uData.headline} />}
                  {uData.bio && <InfoCard label="Bio" value={uData.bio} />}
                </div>
              )}

              {tab === 'Activity' && (
                <div className="space-y-5">
                  {/* Summary counts */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {([
                      ['Posts', rel.posts],
                      ['Startups', rel.startups],
                      ['Payments', rel.payments],
                      ['Events', rel.eventsHosting],
                      ['Bookings', rel.bookingsAsFounder],
                      ['Messages', rel.directMessagesSent],
                    ] as [string, any[]][]).map(([label, arr]) => (
                      <div key={label} className="p-3 rounded-xl border border-gray-200 bg-white text-center">
                        <div className="text-xl font-black text-gray-900">{Array.isArray(arr) ? arr.length : 0}</div>
                        <div className="text-[11px] text-gray-500 font-semibold">{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Posts list */}
                  {Array.isArray(rel.posts) && rel.posts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Posts</h4>
                      <div className="space-y-2">
                        {rel.posts.slice(0, 20).map((p: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                            {(() => {
                              const d = rowData(p) || {};
                              return (
                                <>
                                  <div className="text-gray-800 line-clamp-2">{d.content || d.caption || d.text || d.title || '—'}</div>
                                  <div className="text-[11px] text-gray-400 mt-1">{fmtDate(rowCreatedAt(p))} · {d.type || d.category || ''}</div>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Notifications */}
                  {Array.isArray(rel.notifications) && rel.notifications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Notifications</h4>
                      <div className="space-y-2">
                        {rel.notifications.slice(0, 15).map((n: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                            {(() => {
                              const d = rowData(n) || {};
                              return (
                                <>
                                  <div className="text-gray-800">{d.message || d.title || d.type || '—'}</div>
                                  <div className="text-[11px] text-gray-400 mt-1">{fmtDate(rowCreatedAt(n))} · {d.read ? 'Read' : 'Unread'}</div>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!Array.isArray(rel.posts) || rel.posts.length === 0) && (!Array.isArray(rel.notifications) || rel.notifications.length === 0) && (
                    <EmptyState message="No activity recorded" />
                  )}
                </div>
              )}

              {tab === 'Startups' && (
                <div className="space-y-3">
                  {Array.isArray(rel.startups) && rel.startups.length > 0 ? rel.startups.map((s: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-gray-200 bg-white">
                      {(() => {
                        const d = rowData(s) || {};
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-gray-900">{d.name || d.startupName || 'Unnamed'}</div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>{d.status || '—'}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{d.description || d.tagline || ''}</div>
                            <div className="text-[11px] text-gray-400 mt-2">
                              {d.industry || ''} · Created {fmtDate(rowCreatedAt(s))} · {d.team_size ? `${d.team_size} members` : ''}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )) : <EmptyState message="No startups found" />}
                </div>
              )}

              {tab === 'Events' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Hosting</h4>
                    {Array.isArray(rel.eventsHosting) && rel.eventsHosting.length > 0 ? (
                      <div className="space-y-2">
                        {rel.eventsHosting.map((e: any, i: number) => (
                          <EventRow key={i} e={e} fmtDate={fmtDate} fmtINR={fmtINR} />
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">None</p>}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Registered</h4>
                    {Array.isArray(rel.eventsRegistered) && rel.eventsRegistered.length > 0 ? (
                      <div className="space-y-2">
                        {rel.eventsRegistered.map((e: any, i: number) => (
                          <EventRow key={i} e={e} fmtDate={fmtDate} fmtINR={fmtINR} />
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">None</p>}
                  </div>
                </div>
              )}

              {tab === 'Payments' && (
                <div className="space-y-4">
                  {/* Subscriptions */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Subscriptions</h4>
                    {Array.isArray(rel.subscriptions) && rel.subscriptions.length > 0 ? (
                      <div className="space-y-2">
                        {rel.subscriptions.map((s: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900">{s.plan_name || s.plan || 'Plan'}</span>
                              <span className="ml-2 text-[11px] text-gray-400">{fmtDate(s.created_at)}</span>
                            </div>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>{s.status || '—'}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">No subscriptions</p>}
                  </div>
                  {/* Payments */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Payments</h4>
                    {Array.isArray(rel.payments) && rel.payments.length > 0 ? (
                      <div className="space-y-2">
                        {rel.payments.map((p: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm flex items-center justify-between">
                            {(() => {
                              const d = rowData(p) || {};
                              const status = d.status || d.state || '—';
                              return (
                                <>
                                  <div>
                                    <span className="font-medium text-gray-900">{d.purpose || d.type || d.reason || 'Payment'}</span>
                                    <span className="ml-2 text-[11px] text-gray-400">{fmtDate(rowCreatedAt(p))}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{fmtINR(d.amount)}</span>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                      status === 'completed' || status === 'captured' ? 'bg-green-100 text-green-700' :
                                      status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>{status}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">No payments</p>}
                  </div>
                  {/* Bookings */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Bookings</h4>
                    {(() => {
                      const all = [...(rel.bookingsAsFounder || []), ...(rel.bookingsAsExpert || [])];
                      return all.length > 0 ? (
                        <div className="space-y-2">
                          {all.map((b: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm flex items-center justify-between">
                              {(() => {
                                const d = rowData(b) || {};
                                const status = d.status || d.state || '—';
                                return (
                                  <>
                                    <div>
                                      <span className="font-medium text-gray-900">{d.purpose || d.topic || d.title || 'Booking'}</span>
                                      <span className="ml-2 text-[11px] text-gray-400">{fmtDate(rowCreatedAt(b))}</span>
                                    </div>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                      status === 'confirmed' || status === 'completed' ? 'bg-green-100 text-green-700' :
                                      status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>{status}</span>
                                  </>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-gray-400">No bookings</p>;
                    })()}
                  </div>
                </div>
              )}

              {tab === 'Messages' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Conversations</h4>
                    {Array.isArray(rel.conversations) && rel.conversations.length > 0 ? (
                      <div className="space-y-2">
                        {rel.conversations.map((c: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                            {(() => {
                              const d = rowData(c) || {};
                              const meta = [fmtDate(rowCreatedAt(c)), d.status || d.state].filter(Boolean).join(' · ');
                              return (
                                <>
                                  <div className="font-medium text-gray-900">{d.title || d.name || `Conversation ${c?.id || i + 1}`}</div>
                                  <div className="text-[11px] text-gray-400 mt-1">{meta || '—'}</div>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">No conversations</p>}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Direct Messages Sent</h4>
                    {Array.isArray(rel.directMessagesSent) && rel.directMessagesSent.length > 0 ? (
                      <div className="space-y-2">
                        {rel.directMessagesSent.slice(0, 20).map((m: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                            {(() => {
                              const d = rowData(m) || {};
                              return (
                                <>
                                  <div className="text-gray-800 line-clamp-2">{d.content || d.body || d.message || '—'}</div>
                                  <div className="text-[11px] text-gray-400 mt-1">{fmtDate(rowCreatedAt(m))}</div>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">No messages</p>}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Channel Messages</h4>
                    {Array.isArray(rel.messages) && rel.messages.length > 0 ? (
                      <div className="space-y-2">
                        {rel.messages.slice(0, 20).map((m: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                            {(() => {
                              const d = rowData(m) || {};
                              return (
                                <>
                                  <div className="text-gray-800 line-clamp-2">{d.content || d.body || d.message || '—'}</div>
                                  <div className="text-[11px] text-gray-400 mt-1">{fmtDate(rowCreatedAt(m))}</div>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">No channel messages</p>}
                  </div>
                </div>
              )}

              {tab === 'Uploads' && (
                <div className="space-y-5">
                  {([
                    ['Deal Room Documents', rel.dealRoomDocuments],
                    ['Document Analyses', rel.documentAnalyses],
                    ['Pitch Deck Analyses', rel.pitchDeckAnalyses],
                    ['Stories', rel.stories],
                    ['Knowledge Content', rel.knowledgeContent],
                  ] as [string, any[]][]).map(([label, arr]) => (
                    <div key={label}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">{label}</h4>
                      {Array.isArray(arr) && arr.length > 0 ? (
                        <div className="space-y-2">
                          {arr.slice(0, 25).map((it: any, i: number) => {
                            const d = rowData(it) || {};
                            const title = d.title || d.name || d.fileName || d.filename || d.documentName || d.deckName || d.topic || d.type || `Item ${i + 1}`;
                            const sub = [fmtDate(rowCreatedAt(it)), d.status || d.state].filter(Boolean).join(' · ');
                            const url = d.url || d.fileUrl || d.downloadUrl || d.publicUrl || d.link;
                            return (
                              <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                                <div className="font-medium text-gray-900 break-words">{title}</div>
                                {url ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                                    {url}
                                  </a>
                                ) : null}
                                <div className="text-[11px] text-gray-400 mt-1">{sub || '—'}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">None</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50">
      <div className="text-[11px] font-semibold text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-900 font-medium break-words">{value || '—'}</div>
    </div>
  );
}

function StatusBadge({ label, active, text }: { label: string; active: boolean; text?: string }) {
  if (text) {
    return (
      <div className="p-3 rounded-xl border border-gray-200 bg-white text-center">
        <div className={`text-xs font-semibold ${active ? 'text-green-600' : 'text-gray-500'}`}>{label}</div>
        <div className="text-sm font-bold text-gray-900 mt-0.5">{text}</div>
      </div>
    );
  }
  return (
    <div className="p-3 rounded-xl border border-gray-200 bg-white text-center">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${active ? 'text-green-600' : 'text-red-400'}`}>
        {active ? '✓ Yes' : '✗ No'}
      </div>
    </div>
  );
}

function EventRow({ e, fmtDate, fmtINR }: { e: any; fmtDate: (d: any) => string; fmtINR: (n: any) => string }) {
  const d = e && typeof e === 'object' && 'data' in e ? e.data : e;
  return (
    <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{d?.title || d?.name || 'Event'}</span>
        <span className="font-semibold text-gray-900">{fmtINR(d?.price || d?.fee)}</span>
      </div>
      <div className="text-[11px] text-gray-400 mt-1">
        {fmtDate(d?.date || d?.start_date || e?.created_at || d?.created_at)} · {d?.mode || d?.type || ''} · {d?.location || ''}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <div className="text-gray-300 mb-2"><FileText className="w-10 h-10 mx-auto" /></div>
      <div className="text-sm text-gray-400">{message}</div>
    </div>
  );
}

// ─── Auth Guard Wrapper ─────────────────────────────────────────────────────
export function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const token = getAdminToken();
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandColors.atomicOrange }}>
            <Shield className="w-7 h-7 text-white" />
          </div>
          <p className="text-lg font-bold mb-2">Admin authentication required</p>
          <p className="text-sm text-gray-400 mb-6">Please log in to access the admin panel.</p>
          <button
            onClick={() => { window.location.hash = 'admin-panel'; }}
            className="px-6 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: brandColors.atomicOrange }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  return <AdminDashboardInner token={token} onLogout={onLogout} />;
}

// ─── Main Dashboard (auth-gated) ─────────────────────────────────────────────
function AdminDashboardInner({ token, onLogout }: { token: string; onLogout?: () => void }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState('');

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUser, setUpgradeUser] = useState<AllUser | null>(null);
  const [upgradeRole, setUpgradeRole] = useState<'founder' | 'expert' | 'investor'>('founder');
  const [upgradePlan, setUpgradePlan] = useState<'free' | 'pro' | 'elite'>('elite');
  const [upgradeSaving, setUpgradeSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AllUser | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);

  // Data state
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const adminName = localStorage.getItem('adminName') || 'Admin';

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    if (onLogout) {
      onLogout();
    } else {
      window.location.hash = 'home';
    }
  }, [onLogout]);

  // ── Fetch dashboard overview ──────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({ range: timeRange });
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }
      
      const res = await adminFetch(`/admin/dashboard?${params}`, { headers: authHeaders(token) });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setDashData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token, timeRange, customStartDate, customEndDate]);

  // ── Fetch all users (paginated) ───────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1, search = '', isFrozen = false) => {
    if (!token) return;
    try {
      setUsersLoading(true);
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: '20', 
        search,
        isFrozen: isFrozen ? 'true' : 'false'
      });
      const res = await adminFetch(`/admin/users?${params}`, { headers: authHeaders(token) });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setAllUsers(data.users || []);
      setTotalUsersCount(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const freezeUser = async (id: string, frozen: boolean) => {
    const endpoint = frozen ? `/admin/unfreeze/${id}` : `/admin/freeze/${id}`;
    try {
      await adminFetch(endpoint, { method: 'POST', headers: authHeaders(token) });
      setActionMsg(frozen ? 'User unfrozen' : 'User frozen');
      fetchUsers(usersPage, userSearch);
      fetchDashboard();
      setTimeout(() => setActionMsg(''), 3000);
    } catch { setActionMsg('Action failed'); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently? This cannot be undone.')) return;
    try {
      await adminFetch(`/admin/delete/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      setActionMsg('User deleted');
      fetchUsers(usersPage, userSearch);
      fetchDashboard();
      setTimeout(() => setActionMsg(''), 3000);
    } catch { setActionMsg('Delete failed'); }
  };

  const verifyUser = async (id: string, isVerified: boolean) => {
    const confirmMsg = isVerified ? 'Revoke verification for this user?' : 'Verify this user profile?';
    if (!confirm(confirmMsg)) return;
    const endpoint = isVerified ? `/admin/unverify/${id}` : `/admin/verify/${id}`;
    try {
      await adminFetch(endpoint, { method: 'POST', headers: authHeaders(token) });
      setActionMsg(isVerified ? 'Verification revoked' : 'User verified');
      fetchUsers(usersPage, userSearch);
      fetchDashboard();
      setTimeout(() => setActionMsg(''), 3000);
    } catch { setActionMsg('Action failed'); }
  };

  const openUpgrade = (u: AllUser) => {
    setUpgradeUser(u);
    setUpgradeRole('founder');
    setUpgradePlan('elite');
    setUpgradeOpen(true);
  };

  const saveUpgrade = async () => {
    if (!upgradeUser) return;
    try {
      setUpgradeSaving(true);
      const res = await adminFetch(`/admin/users/${upgradeUser.id}/set-plan`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ role: upgradeRole, plan: upgradePlan }),
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setActionMsg(`Updated ${upgradeUser.name}: ${upgradeRole} → ${upgradePlan.toUpperCase()}`);
      setTimeout(() => setActionMsg(''), 3500);
      setUpgradeOpen(false);
      fetchUsers(usersPage, userSearch);
      fetchDashboard();
    } catch (e: any) {
      setActionMsg(e?.message || 'Upgrade failed');
      setTimeout(() => setActionMsg(''), 3500);
    } finally {
      setUpgradeSaving(false);
    }
  };

  const openUserDetail = async (u: AllUser) => {
    setSelectedUser(u);
    setUserDetailOpen(true);
    setUserDetailLoading(true);
    setUserDetailError('');
    setUserDetail(null);
    try {
      const res = await adminFetch(`/admin/users/${u.id}`, { headers: authHeaders(token) });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return;
        }
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUserDetail(data);
    } catch (e: any) {
      setUserDetailError(e?.message || 'Failed to load user detail');
    } finally {
      setUserDetailLoading(false);
    }
  };

  // ── Fetch Support Tickets ─────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      setTicketsLoading(true);
      const res = await adminFetch(`/admin/support-tickets`, { headers: authHeaders(token) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSupportTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTicketsLoading(false);
    }
  }, [token]);

  const updateTicketStatus = async (id: string, newStatus: string) => {
    try {
      await adminFetch(`/admin/support-tickets/${id}/status`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ status: newStatus }),
      });
      setActionMsg('Ticket status updated');
      fetchTickets();
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg('Update failed');
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  // Initial fetch and auto-refresh every 30 seconds for live updates
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, timeRange, customStartDate, customEndDate]);
  useEffect(() => {
    if (activeView === 'all-users' || activeView === 'flagged') {
      fetchUsers(usersPage, userSearch, activeView === 'flagged');
    } else if (activeView === 'support-tickets') {
      fetchTickets();
    }
  }, [activeView, usersPage, userSearch, fetchUsers, fetchTickets]);

  const adminRole = getAdminRoleFromToken(token);
  const isPrimary = adminRole === 'PRIMARY_ADMIN';

  const navigation = ADMIN_NAV_ITEMS.filter(item => !item.primaryOnly || isPrimary);
  const d = dashData;

  // ── Dashboard overview ────────────────────────────────────────────────────
  const DashboardView = () => (
    <div className="space-y-6">
      {/* Date Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FilterIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Metrics Range</h3>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Filtered by sign-up date</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: '7d', label: 'Last 7 Days' },
            { id: '15d', label: '15 Days' },
            { id: '1m', label: '1 Month' },
            { id: 'custom', label: 'Custom' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setTimeRange(opt.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                timeRange === opt.id 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
          
          {timeRange === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 ml-2"
            >
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-gray-400 text-xs font-bold">to</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </motion.div>
          )}
        </div>
      </div>

      <div className="space-y-6">
      {/* Stat Cards */}
      <div className={`grid grid-cols-2 ${isPrimary ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        {[
          {
            label: 'Total Users', value: d?.users.total, icon: Users,
            color: brandColors.electricBlue, sub: `+${d?.users.newInRange ?? 0} ${d?.users.rangeLabel ?? 'this week'}`
          },
          {
            label: 'Active Today', value: d?.users.activeToday, icon: Activity,
            color: '#10b981', sub: `${d?.users.founders ?? 0} founders · ${d?.users.experts ?? 0} experts`
          },
          {
            label: 'Total Revenue', value: d ? formatINR(d.revenue.total) : '—', icon: DollarSign,
            color: brandColors.atomicOrange, sub: `${formatINR(d?.revenue.inRange ?? 0)} ${d?.users.rangeLabel ?? 'this month'}`,
            primaryOnly: true
          },
          {
            label: 'Paid Transactions', value: d?.revenue.transactions, icon: CreditCard,
            color: '#8b5cf6', sub: `${d?.users.frozen ?? 0} frozen accounts`,
            primaryOnly: true
          },
          {
            label: 'Play Store Installs',
            value: d?.appInstalls ? d.appInstalls.totalInstalls.toLocaleString('en-IN') : '—',
            icon: Download,
            color: '#34a853',
            sub: d?.appInstalls
              ? `${d.appInstalls.activeInstalls.toLocaleString('en-IN')} active devices${d.appInstalls.asOf ? ` · as of ${d.appInstalls.asOf}` : ''}`
              : 'Connect Play Console reports',
          },
          {
            label: 'App Store Downloads',
            value: d?.iosInstalls
              ? (d.iosInstalls.monthlyDownloads || d.iosInstalls.dailyDownloads).toLocaleString('en-IN')
              : '—',
            icon: Apple,
            color: '#555555',
            sub: d?.iosInstalls
              ? (d.iosInstalls.monthOf
                  ? `${d.iosInstalls.dailyDownloads.toLocaleString('en-IN')} on ${d.iosInstalls.asOf || 'latest day'} · month of ${d.iosInstalls.monthOf}`
                  : `downloads on ${d.iosInstalls.asOf || 'latest day'}`)
              : 'Connect App Store Connect API',
          },
        ].filter(card => !card.primaryOnly || isPrimary).map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-5 lg:p-6 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white to-transparent opacity-10 rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20 mb-1" />
            ) : (
              <p className="text-2xl lg:text-3xl font-bold mb-1">{card.value ?? 0}</p>
            )}
            <p className="text-xs text-gray-400">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <h2 className="font-bold text-gray-800 mb-6 text-lg tracking-tight capitalize">User Signups ({d?.users.rangeLabel || 'Last 7 Days'})</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={d?.charts.userGrowth || []}>
                <defs>
                  <linearGradient id="ugFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={brandColors.electricBlue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={brandColors.electricBlue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke={brandColors.electricBlue} fill="url(#ugFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tier Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <h2 className="font-bold text-gray-800 mb-6 text-lg tracking-tight">User Tiers</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : d?.charts.tierBreakdown.length ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={d.charts.tierBreakdown} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value" labelLine={false}>
                    {d.charts.tierBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={TIER_COLORS[idx % TIER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1">
                {d.charts.tierBreakdown.map((t, idx) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[idx % TIER_COLORS.length] }} />
                      <span className="capitalize text-gray-600">{t.name}</span>
                    </div>
                    <span className="font-bold">{t.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <Users className="w-12 h-12 mb-2" />
              <p className="text-sm">No tier data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Chart */}
      {isPrimary && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <h2 className="font-bold text-gray-800 mb-6 text-lg tracking-tight">Revenue (Last 7 Days — INR)</h2>
          {loading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d?.charts.revenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v}`} />
                <Tooltip formatter={(v: any) => [`₹${v}`, 'Revenue']} />
                <Bar dataKey="revenue" fill={brandColors.atomicOrange} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Recent Users & Transactions */}
      <div className={`grid grid-cols-1 ${isPrimary ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Recent Signups */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Recent Signups</h2>
            <button onClick={() => setActiveView('all-users')} className="text-xs font-medium hover:underline" style={{ color: brandColors.electricBlue }}>
              View all →
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : d?.recentUsers.length ? (
            <div className="space-y-3">
              {d.recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 group/item">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: brandColors.electricBlue }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm truncate text-gray-900 group-hover/item:text-blue-600 transition-colors">{u.name}</p>
                      {u.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-600 fill-blue-500/10 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 opacity-50" /> {u.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                    <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: getStatusColor(u.isFrozen, u.isVerified) }} />
                    <span className="text-[10px] font-black uppercase tracking-tight text-gray-600">{getStatusLabel(u.isFrozen, u.isVerified)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <Users className="w-10 h-10 mb-2" />
              <p className="text-sm">No users yet</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        {isPrimary && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Recent Transactions</h2>
              <button onClick={() => setActiveView('payments')} className="text-xs font-medium hover:underline" style={{ color: brandColors.electricBlue }}>
                View all →
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : d?.recentTransactions.length ? (
              <div className="space-y-3">
                {d.recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.purpose}</p>
                      <p className="text-xs text-gray-400">{timeAgo(tx.date)}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold text-sm text-green-600">{formatINR(tx.amount)}</p>
                      <span className={`text-xs px-2 py-1 rounded-md font-semibold ${
                        tx.status === 'paid' || tx.status === 'captured'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-gray-50 text-gray-600 border border-gray-100'
                      }`}>{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                <DollarSign className="w-10 h-10 mb-2" />
                <p className="text-sm">No transactions yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Founders', value: d?.users.founders ?? 0, icon: Rocket, color: '#3b82f6' },
          { label: 'Experts', value: d?.users.experts ?? 0, icon: GraduationCap, color: '#10b981' },
          { label: 'Investors', value: d?.users.investors ?? 0, icon: Briefcase, color: '#f59e0b' },
          { label: 'Frozen Accounts', value: d?.users.frozen ?? 0, icon: UserX, color: '#ef4444' },
        ].map((card, i) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
            {loading ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold">{card.value}</p>}
          </div>
        ))}
      </div>
    </div>
  </div>
);

  // ── All Users View ────────────────────────────────────────────────────────
  const UsersView = () => {
    // Users are now filtered server-side via the isFrozen parameter in fetchUsers
    const filteredUsers = allUsers;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold">
              {activeView === 'flagged' ? 'Frozen / Flagged Accounts' : 'All Users'}
              <span className="ml-2 text-sm font-normal text-gray-400">({totalUsersCount} total)</span>
            </h2>
            <button onClick={fetchDashboard} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {activeView !== 'flagged' && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['User', 'Role', 'Status', 'Joined', 'Last Active', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="py-2"><Skeleton className="h-10 w-full" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      {activeView === 'flagged' ? 'No frozen accounts' : 'No users found'}
                    </td>
                  </tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 hover:shadow-sm transition-all">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: u.isFrozen ? '#ef4444' : brandColors.electricBlue }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openUserDetail(u)}
                              className="font-medium text-sm text-left hover:underline"
                              style={{ color: brandColors.electricBlue }}
                            >
                              {u.name}
                            </button>
                            {u.isVerified && <BadgeCheck className="w-4 h-4 text-blue-600 fill-blue-500/10 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          {u.linkedInUrl ? (
                            <a
                              href={u.linkedInUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline max-w-[240px] truncate block"
                              title={u.linkedInUrl}
                            >
                              {u.linkedInUrl}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">{u.role}</span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: getStatusColor(u.isFrozen, u.isVerified) }}>
                        {getStatusLabel(u.isFrozen, u.isVerified)}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="py-3 text-xs text-gray-500">{timeAgo(u.lastActive)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => freezeUser(u.id, u.isFrozen)}
                          title={u.isFrozen ? 'Unfreeze' : 'Freeze'}
                          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                            u.isFrozen
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {u.isFrozen ? <Check className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => verifyUser(u.id, u.isVerified)}
                          title={u.isVerified ? 'Unverify user' : 'Verify user'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isVerified 
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openUpgrade(u)}
                          title="Upgrade plan (testing override)"
                          className="p-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                        {isPrimary && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          title="Delete user (Primary Admin only)"
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upgrade User Modal */}
          <AnimatePresence>
            {upgradeOpen && upgradeUser && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUpgradeOpen(false)} />
                <motion.div
                  initial={{ y: 30, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.98 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                  className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Upgrade User (Testing)</div>
                      <div className="text-xs text-gray-500">{upgradeUser.name} · {upgradeUser.email}</div>
                    </div>
                    <button onClick={() => setUpgradeOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="p-3 rounded-xl border border-gray-200 bg-white">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Current Tier</div>
                      <div className="text-xs text-gray-600">Founder: <span className="font-bold text-gray-900">{String(upgradeUser.founder_plan || 'free').toUpperCase()}</span></div>
                      <div className="text-xs text-gray-600">Expert: <span className="font-bold text-gray-900">{String(upgradeUser.expert_plan || 'free').toUpperCase()}</span></div>
                      <div className="text-xs text-gray-600">Investor: <span className="font-bold text-gray-900">{String(upgradeUser.investor_plan || 'free').toUpperCase()}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={upgradeRole}
                        onChange={(e) => setUpgradeRole(e.target.value as any)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <option value="founder">Founder</option>
                        <option value="expert">Expert</option>
                        <option value="investor">Investor</option>
                      </select>
                      <select
                        value={upgradePlan}
                        onChange={(e) => setUpgradePlan(e.target.value as any)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="elite">Elite</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={upgradeSaving}
                      onClick={saveUpgrade}
                      className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ backgroundColor: brandColors.atomicOrange }}
                    >
                      {upgradeSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                      Apply Upgrade
                    </button>
                    <div className="text-[11px] text-gray-500">No payment is taken. This updates the user’s plan tier in the database.</div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {activeView !== 'flagged' && totalUsersCount > 20 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-gray-500">
                Showing {(usersPage - 1) * 20 + 1}–{Math.min(usersPage * 20, totalUsersCount)} of {totalUsersCount}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage(p => p - 1)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >Previous</button>
                <button
                  disabled={usersPage * 20 >= totalUsersCount}
                  onClick={() => setUsersPage(p => p + 1)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Payments View ─────────────────────────────────────────────────────────
  const PaymentsView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Payment Transactions</h2>
      {loading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : d?.recentTransactions.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Purpose', 'Amount', 'Currency', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.recentTransactions.map(tx => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 hover:shadow-sm transition-all group">
                  <td className="py-3 text-sm font-medium">{tx.purpose}</td>
                  <td className="py-3 text-sm font-bold text-green-600">{formatINR(tx.amount)}</td>
                  <td className="py-3 text-sm text-gray-500">{tx.currency}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      tx.status === 'paid' || tx.status === 'captured'
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : tx.status === 'pending'
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                        : 'bg-gray-50 text-gray-600 border border-gray-100'
                    }`}>{tx.status}</span>
                  </td>
                  <td className="py-3 text-xs text-gray-400">{tx.date ? new Date(tx.date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <DollarSign className="w-14 h-14 mb-3" />
          <p className="text-base">No transactions recorded yet</p>
        </div>
      )}
    </div>
  );

  // ── Analytics View ────────────────────────────────────────────────────────
  const AnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <h2 className="font-bold mb-4 text-gray-800 text-lg tracking-tight">User Growth (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d?.charts.userGrowth || []}>
              <defs>
                <linearGradient id="ugFill2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={brandColors.electricBlue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={brandColors.electricBlue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke={brandColors.electricBlue} fill="url(#ugFill2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <h2 className="font-bold mb-4 text-gray-800 text-lg tracking-tight">Revenue (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d?.charts.revenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v}`} />
              <Tooltip formatter={(v: any) => [`₹${v}`, 'Revenue']} />
              <Bar dataKey="revenue" fill={brandColors.atomicOrange} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: d?.users.total ?? 0 },
          { label: 'New This Month', value: d?.users.newThisMonth ?? 0 },
          { label: 'Total Revenue', value: d ? formatINR(d.revenue.total) : '₹0' },
          { label: 'This Month Revenue', value: d ? formatINR(d.revenue.thisMonth) : '₹0' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-500 mb-1 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Support Tickets View ──────────────────────────────────────────────────
  const SupportTicketsView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Support Tickets</h2>
        <button onClick={fetchTickets} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      {ticketsLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : supportTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <MessageSquare className="w-14 h-14 mb-3" />
          <p className="text-base">No support tickets found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['User', 'Message', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {supportTickets.map(ticket => (
                <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50 transition-all">
                  <td className="py-4">
                    <div className="font-medium text-sm">{ticket.userName}</div>
                    <div className="text-xs text-gray-500">{ticket.userEmail}</div>
                  </td>
                  <td className="py-4 text-sm text-gray-700 max-w-sm whitespace-pre-wrap">
                    {ticket.message}
                  </td>
                  <td className="py-4 text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleString()}</td>
                  <td className="py-4">
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      className="bg-white border border-gray-200 text-sm rounded focus:ring-indigo-500 focus:border-indigo-500 p-1 font-medium"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      {/* Action toast */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium shadow-xl"
            style={{ zIndex: Z_INDEX.ACTION_TOAST }}
          >
            {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile header */}
      <div 
        className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center justify-between"
        style={{ zIndex: Z_INDEX.HEADER_MOBILE }}
      >
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Admin Panel</h1>
        <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40"
          style={{ zIndex: Z_INDEX.SIDEBAR_BACKDROP }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Notifications */}
      <NotificationsDropdown isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} userRole="founder" />

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || mobileMenuOpen) && (
          <motion.div
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            className={`${mobileMenuOpen ? 'fixed top-0 left-0 bottom-0 w-72 max-w-[85vw]' : 'hidden lg:block'} lg:w-64 bg-white border-r border-gray-200 overflow-hidden flex-shrink-0`}
            style={{ 
              zIndex: mobileMenuOpen ? Z_INDEX.SIDEBAR_MOBILE : 'auto',
              paddingTop: mobileMenuOpen ? '64px' : '0' 
            }}
          >
            <Sidebar 
              adminName={adminName}
              lastUpdated={lastUpdated}
              navigation={navigation}
              activeView={activeView}
              setActiveView={setActiveView}
              setMobileMenuOpen={setMobileMenuOpen}
              fetchDashboard={fetchDashboard}
              handleLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop header */}
        <div 
          className="hidden lg:flex items-center justify-between bg-white/80 backdrop-blur-lg border-b border-gray-100 px-8 py-5 flex-shrink-0 sticky top-0"
          style={{ zIndex: Z_INDEX.STICKY }}
        >
          <div>
            <h1 className="text-xl font-bold">
              {navigation.find(n => n.id === activeView)?.label || 'Platform Overview'}
            </h1>
            {lastUpdated && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <div className="relative">
              <button
                onClick={() => setShowAdminMenu(v => !v)}
                title={adminName}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-blue-200 transition-all"
              >
                {Array.from(adminName)[0]?.toUpperCase() || 'A'}
              </button>
              {showAdminMenu && (
                <>
                  <div className="fixed inset-0" style={{ zIndex: Z_INDEX.STICKY }} onClick={() => setShowAdminMenu(false)} />
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2"
                    style={{ zIndex: Z_INDEX.MODAL_CONTENT }}
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{adminName}</p>
                      <p className="text-xs text-gray-400">{isPrimary ? 'Primary Admin' : 'Secondary Admin'}</p>
                    </div>
                    <button
                      onClick={() => { setShowAdminMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 lg:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={fetchDashboard} className="text-red-600 hover:underline text-sm font-medium">Retry</button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-0 pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pt-8 lg:pb-8">
          {activeView === 'dashboard' && DashboardView()}
          {(activeView === 'all-users' || activeView === 'flagged') && UsersView()}
          {activeView === 'payments' && isPrimary && <PaymentsView />}
          {activeView === 'payments' && !isPrimary && <PermissionDenied onBack={() => setActiveView('dashboard')} />}
          {activeView === 'analytics' && isPrimary && <AnalyticsView />}
          {activeView === 'analytics' && !isPrimary && <PermissionDenied onBack={() => setActiveView('dashboard')} />}
          {activeView === 'support-tickets' && isPrimary && SupportTicketsView()}
          {activeView === 'support-tickets' && !isPrimary && <PermissionDenied onBack={() => setActiveView('dashboard')} />}
          {activeView === 'contact-messages' && <ContactMessagesView token={token} isPrimary={isPrimary} setActionMsg={setActionMsg} />}
          {activeView === 'startup-mgmt' && <StartupMgmtView token={token} isPrimary={isPrimary} setActionMsg={setActionMsg} />}
          {activeView === 'service-requests' && <ServiceRequestsView token={token} />}
          {activeView === 'content-mod' && <ContentModerationView token={token} setActionMsg={setActionMsg} />}
          {activeView === 'events-mgmt' && <EventsMgmtView token={token} isPrimary={isPrimary} setActionMsg={setActionMsg} />}
          {activeView === 'notifications' && <NotificationsView token={token} isPrimary={isPrimary} setActionMsg={setActionMsg} />}
          {activeView === 'ai-control' && isPrimary && <AIControlView token={token} setActionMsg={setActionMsg} />}
          {activeView === 'ai-control' && !isPrimary && <PermissionDenied onBack={() => setActiveView('dashboard')} />}
          {activeView === 'platform-settings' && isPrimary && <PlatformSettingsView token={token} setActionMsg={setActionMsg} />}
          {activeView === 'platform-settings' && !isPrimary && <PermissionDenied onBack={() => setActiveView('dashboard')} />}
          {activeView === 'admin-mgmt' && isPrimary && <AdminMgmtView token={token} setActionMsg={setActionMsg} />}
          {activeView === 'admin-mgmt' && !isPrimary && <PermissionDenied onBack={() => setActiveView('dashboard')} />}
          {activeView === 'logs-security' && isPrimary && <ActivityLogsView token={token} />}
          {activeView === 'logs-security' && !isPrimary && <PermissionDenied onBack={() => setActiveView('dashboard')} />}

          {/* Fallback for unknown views */}
          {!['dashboard','all-users','flagged','contact-messages','payments','analytics','support-tickets','startup-mgmt','service-requests','content-mod','events-mgmt','notifications','ai-control','platform-settings','admin-mgmt','logs-security'].includes(activeView) && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-300">
              <Settings className="w-16 h-16 mb-4" />
              <h2 className="text-xl font-semibold text-gray-500 mb-2">Section not found</h2>
              <button onClick={() => setActiveView('dashboard')} className="px-5 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: brandColors.electricBlue }}>← Back to Dashboard</button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {userDetailOpen && (
          <UserDetailModal
            user={selectedUser}
            detail={userDetail}
            loading={userDetailLoading}
            error={userDetailError}
            onClose={() => setUserDetailOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <div 
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around"
        style={{ zIndex: Z_INDEX.BOTTOM_NAV_MOBILE }}
      >
        {[
          { id: 'dashboard', icon: Home, label: 'Dashboard' },
          { id: 'all-users', icon: Users, label: 'Users' },
          { id: 'analytics', icon: BarChart3, label: 'Analytics' },
          { id: 'payments', icon: DollarSign, label: 'Revenue' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-lg ${activeView === item.id ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Placeholder Components for New Sections ────────────────────────────────
function StartupMgmtView({ token, isPrimary, setActionMsg }: any) {
  const [startups, setStartups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectionModal, setRejectionModal] = useState<{ id: string, name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchStartups = async (p = 1, s = statusFilter) => {
    try {
      setLoading(true);
      const res = await adminFetch(`/admin/startups?page=${p}&status=${s}`, { headers: authHeaders(token) });
      const data = await res.json();
      setStartups(data.startups || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStartups(page, statusFilter); }, [page, statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      const res = await adminFetch(`/admin/startups/${id}/approve`, { method: 'POST', headers: authHeaders(token) });
      if (res.ok) {
        setActionMsg('Startup approved');
        fetchStartups(page, statusFilter);
      }
    } catch (err) { console.error(err); }
  };

  const handleReject = async (e: any) => {
    e.preventDefault();
    if (!rejectionModal) return;
    try {
      const res = await adminFetch(`/admin/startups/${rejectionModal.id}/reject`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ reason: rejectionReason })
      });
      if (res.ok) {
        setActionMsg('Startup rejected');
        setRejectionModal(null);
        setRejectionReason('');
        fetchStartups(page, statusFilter);
      }
    } catch (err) { console.error(err); }
  };

  const toggleFeature = async (id: string, featured: boolean) => {
    try {
      const res = await adminFetch(`/admin/startups/${id}/feature`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ featured })
      });
      if (res.ok) {
        setActionMsg(featured ? 'Startup featured' : 'Startup unfeatured');
        fetchStartups(page, statusFilter);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">Startup Management</h2>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Startup</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Funding</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">AI Score</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {startups.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-gray-400 absolute" />
                          {s.logo && (
                            <img 
                              src={s.logo.startsWith('http') || s.logo.startsWith('data:') ? s.logo : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${s.logo.startsWith('/') ? '' : '/'}${s.logo}`} 
                              className="w-full h-full object-cover absolute inset-0 z-10" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900 flex items-center gap-1">
                            {s.name}
                            {s.isFeatured && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                          </div>
                          <div className="text-xs text-gray-500">{s.tagline || 'No tagline'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'approved' ? 'bg-green-100 text-green-700' :
                        s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {s.status || 'pending'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="text-sm font-semibold text-gray-700">${(s.funding?.target || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400">{s.funding?.stage || 'N/A'}</div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-blue-600">{s.aiScore || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {s.status !== 'approved' && (
                          <button onClick={() => handleApprove(s.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {s.status !== 'rejected' && (
                          <button onClick={() => setRejectionModal({ id: s.id, name: s.name })} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => toggleFeature(s.id, !s.isFeatured)} className={`p-1.5 rounded-lg ${s.isFeatured ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}`} title={s.isFeatured ? 'Unfeature' : 'Feature'}>
                          <Star className={`w-4 h-4 ${s.isFeatured ? 'fill-yellow-600' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {rejectionModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRejectionModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: -1 }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-2">Reject {rejectionModal.name}</h3>
              <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejecting this startup application.</p>
              <form onSubmit={handleReject} className="space-y-4">
                <textarea
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 outline-none resize-none text-sm"
                  placeholder="Reason for rejection..."
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setRejectionModal(null)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold shadow-lg shadow-red-500/20">Confirm Rejection</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactMessagesView({ token, isPrimary, setActionMsg }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [unread, setUnread] = useState(0);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/admin/contact-messages', { headers: authHeaders(token) });
      const data = await res.json();
      setMessages(data.messages || []);
      setUnread(data.unread || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMessages(); }, []);

  const toggleRead = async (id: string) => {
    try {
      await adminFetch(`/admin/contact-messages/${id}/read`, { method: 'POST', headers: authHeaders(token) });
      fetchMessages();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    try {
      const res = await adminFetch(`/admin/contact-messages/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      if (res.ok) { setActionMsg('Message deleted'); setTimeout(() => setActionMsg(''), 3000); setSelected(null); fetchMessages(); }
      else { setActionMsg('Delete failed (permission)'); setTimeout(() => setActionMsg(''), 3500); }
    } catch (err) { console.error(err); }
  };

  const openMessage = (m: any) => {
    setSelected(m);
    if (m.status === 'new') toggleRead(m.id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Contact Messages
              {unread > 0 && <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[11px] font-bold">{unread} new</span>}
            </h2>
            <p className="text-sm text-gray-500">Submissions from the public Contact Us form.</p>
          </div>
          <button onClick={fetchMessages} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Mail className="w-12 h-12 mb-2" />
            <p className="text-sm">No contact messages yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['From', 'Subject', 'Received', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${m.status === 'new' ? 'bg-blue-50/40' : ''}`}>
                    <td className="py-4">
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        {m.status === 'new' && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
                        {m.name}
                      </div>
                      <div className="text-xs text-gray-500">{m.email}{m.company ? ` · ${m.company}` : ''}</div>
                    </td>
                    <td className="py-4 text-sm text-gray-700">{m.subject || <span className="text-gray-400">—</span>}</td>
                    <td className="py-4 text-xs text-gray-500">{m.submittedAt ? new Date(m.submittedAt).toLocaleString() : '—'}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openMessage(m)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100">View</button>
                        {isPrimary && (
                          <button onClick={() => handleDelete(m.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{selected.subject || 'No subject'}</h3>
                  <p className="text-sm text-gray-500">{selected.name} · {selected.email}{selected.company ? ` · ${selected.company}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : ''}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words bg-gray-50 rounded-xl p-4 border border-gray-100">{selected.message}</p>
              <div className="flex justify-end gap-2 mt-5">
                <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Your inquiry')}`} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Reply by Email</a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceRequestsView({ token }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/admin/service-requests', { headers: authHeaders(token) });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const prettyKey = (k: string) =>
    k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Service Requests</h2>
            <p className="text-sm text-gray-500">MVP Development requests submitted by founders.</p>
          </div>
          <button onClick={fetchRequests} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Wrench className="w-12 h-12 mb-2" />
            <p className="text-sm">No service requests yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Startup', 'Founder', 'Type', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-bold text-sm text-gray-900">{r.startupName}</td>
                    <td className="py-4">
                      <div className="text-sm text-gray-900">{r.founderName}</div>
                      <div className="text-xs text-gray-500">{r.founderEmail}</div>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{r.type}</span>
                    </td>
                    <td className="py-4 text-xs text-gray-500">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}</td>
                    <td className="py-4">
                      <button onClick={() => setSelected(r)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100">View details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{selected.startupName}</h3>
                  <p className="text-sm text-gray-500">{selected.founderName} · {selected.founderEmail}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {Object.entries(selected.details || {})
                  .filter(([k]) => k !== 'submittedAt')
                  .map(([k, v]) => (
                    <div key={k} className="border-b border-gray-50 pb-2">
                      <div className="text-[11px] font-bold text-gray-400 uppercase">{prettyKey(k)}</div>
                      <div className="text-sm text-gray-800 break-words">
                        {Array.isArray(v) ? (v.length ? v.join(', ') : '—')
                          : typeof v === 'object' && v !== null ? JSON.stringify(v)
                          : (v === '' || v == null ? '—' : String(v))}
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContentModerationView({ token, setActionMsg }: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReports = async (p = 1, s = statusFilter) => {
    try {
      setLoading(true);
      const res = await adminFetch(`/admin/reports?page=${p}&status=${s}`, { headers: authHeaders(token) });
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(page, statusFilter); }, [page, statusFilter]);

  const handleResolve = async (id: string, status: string) => {
    try {
      const res = await adminFetch(`/admin/reports/${id}/resolve`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ status, actionTaken: `Resolved as ${status}` })
      });
      if (res.ok) {
        setActionMsg(`Report marked as ${status}`);
        fetchReports(page, statusFilter);
      }
    } catch (err) { console.error(err); }
  };

  // ── View / remove the reported content, and full user detail for user reports ──
  const [contentModal, setContentModal] = useState<any | null>(null);
  const [userModal, setUserModal] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openUserDetail = async (userId: string) => {
    try {
      setDetailLoading(true);
      const res = await adminFetch(`/admin/users/${userId}`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data.message || 'Failed to load user'); setTimeout(() => setActionMsg(''), 3000); return; }
      setUserModal(data);
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  const handleViewContent = async (r: any) => {
    if (r.content_type === 'user') { openUserDetail(r.content_id); return; }
    try {
      setDetailLoading(true);
      const res = await adminFetch(`/admin/reports/${r.id}/content`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data.message || 'Content not found'); setTimeout(() => setActionMsg(''), 3500); return; }
      setContentModal({ ...data, report: r });
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  const handleRemoveContent = async (r: any) => {
    if (!confirm(`Permanently remove this ${r.content_type} and resolve the report? This cannot be undone.`)) return;
    try {
      const res = await adminFetch(`/admin/reports/${r.id}/content`, { method: 'DELETE', headers: authHeaders(token) });
      const data = await res.json();
      if (res.ok) {
        setActionMsg('Content removed and report resolved'); setTimeout(() => setActionMsg(''), 3000);
        setContentModal(null);
        fetchReports(page, statusFilter);
      } else {
        setActionMsg(data.message || 'Remove failed'); setTimeout(() => setActionMsg(''), 3500);
      }
    } catch (err) { console.error(err); }
  };

  const prettyVal = (v: any): string =>
    v == null || v === '' ? '—'
      : Array.isArray(v) ? (v.length ? `${v.length} item(s)` : '—')
      : typeof v === 'object' ? JSON.stringify(v).slice(0, 120)
      : String(v);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Content Moderation</h2>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100">
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Type</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Reason</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Content ID</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold uppercase text-gray-600">{r.content_type}</span>
                    </td>
                    <td className="py-4">
                      <div className="text-sm font-medium text-gray-900">{r.reason}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">{r.details}</div>
                    </td>
                    <td className="py-4 font-mono text-[10px] text-gray-400">{r.content_id}</td>
                    <td className="py-4 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-4">
                      <div className="flex gap-2 flex-wrap">
                        {r.content_type === 'user' ? (
                          <button onClick={() => openUserDetail(r.content_id)} disabled={detailLoading} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-semibold flex items-center gap-1" title="View full user profile">
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleViewContent(r)} disabled={detailLoading} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-semibold flex items-center gap-1" title="View reported content">
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            {r.status === 'pending' && (
                              <button onClick={() => handleRemoveContent(r)} className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-semibold flex items-center gap-1" title="Remove content & resolve report">
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            )}
                          </>
                        )}
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => handleResolve(r.id, 'resolved')} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Mark resolved (keep content)">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleResolve(r.id, 'dismissed')} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100" title="Dismiss report">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reported content viewer ─────────────────────────────────────── */}
      <AnimatePresence>
        {contentModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setContentModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold capitalize">Reported {contentModal.contentType}</h3>
                  <p className="text-xs text-gray-400 font-mono">{contentModal.contentId}</p>
                  <p className="text-xs text-gray-500 mt-1">Reported for: <span className="font-semibold">{contentModal.report?.reason}</span></p>
                </div>
                <button onClick={() => setContentModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {Object.entries(contentModal.content || {})
                  .filter(([k, v]) => v != null && v !== '' && !['registeredUsers', 'bookmarkedBy', 'likes', 'comments'].includes(k))
                  .slice(0, 25)
                  .map(([k, v]) => (
                    <div key={k} className="border-b border-gray-50 pb-2">
                      <div className="text-[11px] font-bold text-gray-400 uppercase">{k.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="text-sm text-gray-800 break-words whitespace-pre-wrap">{prettyVal(v)}</div>
                    </div>
                  ))}
              </div>
              {contentModal.report?.status === 'pending' && (
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => handleResolve(contentModal.report.id, 'dismissed').then(() => setContentModal(null))} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Dismiss Report</button>
                  <button onClick={() => handleRemoveContent(contentModal.report)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700">Remove Content</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Full user detail (for reported profiles) ────────────────────── */}
      <AnimatePresence>
        {userModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUserModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: brandColors.electricBlue }}>
                    {(userModal.user?.data?.name || 'U')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {userModal.user?.data?.name || 'Unknown'}
                      {userModal.user?.data?.isVerified && <BadgeCheck className="w-4 h-4 text-blue-600" />}
                      {userModal.user?.data?.isFrozen && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">Frozen</span>}
                    </h3>
                    <p className="text-sm text-gray-500">{userModal.user?.data?.email}</p>
                  </div>
                </div>
                <button onClick={() => setUserModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>

              {/* Core account fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {[
                  ['Role', userModal.user?.data?.role],
                  ['All Roles', Array.isArray(userModal.user?.data?.roles) ? userModal.user.data.roles.map((x: any) => x?.role || x?.type || x).join(', ') : userModal.user?.data?.roles],
                  ['Joined', userModal.user?.created_at ? new Date(userModal.user.created_at).toLocaleDateString() : '—'],
                  ['Last Active', userModal.user?.data?.lastActive ? new Date(userModal.user.data.lastActive).toLocaleString() : 'Never'],
                  ['Phone', userModal.user?.data?.phone],
                  ['Location', userModal.user?.data?.profile?.location || userModal.user?.data?.location],
                  ['Founder Plan', userModal.user?.data?.founder_plan || 'free'],
                  ['Expert Plan', userModal.user?.data?.expert_plan || 'free'],
                  ['Investor Plan', userModal.user?.data?.investor_plan || 'free'],
                ].map(([label, val]) => (
                  <div key={String(label)} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">{label}</div>
                    <div className="text-sm font-semibold text-gray-800 break-words capitalize">{prettyVal(val)}</div>
                  </div>
                ))}
              </div>

              {userModal.user?.data?.profile?.bio && (
                <div className="mb-5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Bio</div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100 whitespace-pre-wrap">{userModal.user.data.profile.bio}</p>
                </div>
              )}

              {/* Activity summary — counts of everything linked to this account */}
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Platform Activity</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Object.entries(userModal.related || {})
                  .filter(([, v]: any) => Array.isArray(v))
                  .map(([k, v]: any) => (
                    <div key={k} className="bg-white border border-gray-100 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-gray-900">{v.length}</div>
                      <div className="text-[9px] font-semibold text-gray-400 uppercase leading-tight">{k.replace(/([A-Z])/g, ' $1')}</div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventsMgmtView({ token, isPrimary, setActionMsg }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { title: '', type: 'webinar', description: '', date: '', time: '', durationMinutes: 60, format: 'virtual', locationOrLink: '', presentationUrl: '', tags: '' };
  const [form, setForm] = useState(emptyForm);

  const fetchEvents = async (p = 1) => {
    try {
      setLoading(true);
      const res = await adminFetch(`/admin/events?page=${p}`, { headers: authHeaders(token) });
      const data = await res.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(page); }, [page]);

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.time) { setActionMsg('Title, date and time are required'); setTimeout(() => setActionMsg(''), 3000); return; }
    try {
      setSaving(true);
      const res = await adminFetch('/admin/events', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          description: form.description,
          startAt: `${form.date}T${form.time}`,
          durationMinutes: form.durationMinutes,
          format: form.format,
          locationOrLink: form.locationOrLink,
          presentationUrl: form.presentationUrl,
          tags: form.tags,
        }),
      });
      if (res.ok) {
        setActionMsg('Official event published'); setTimeout(() => setActionMsg(''), 3000);
        setShowCreate(false); setForm(emptyForm); fetchEvents(1); setPage(1);
      } else {
        const d = await res.json().catch(() => ({}));
        setActionMsg(d.message || 'Failed to create event'); setTimeout(() => setActionMsg(''), 3500);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await adminFetch(`/admin/events/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      if (res.ok) { setActionMsg('Event deleted'); setTimeout(() => setActionMsg(''), 3000); fetchEvents(page); }
      else { setActionMsg('Delete failed (Primary Admin only)'); setTimeout(() => setActionMsg(''), 3500); }
    } catch (err) { console.error(err); }
  };

  const inputCls = 'w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-100';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Events & Webinars</h2>
          <p className="text-sm text-gray-500">Publish and manage official NextIgnition events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchEvents(page)} className="text-xs text-blue-600 font-semibold">Refresh</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Official Event
          </button>
        </div>
      </div>

      {loading ? <Skeleton className="h-40 w-full" /> : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
          <Calendar className="w-12 h-12 mb-2" />
          <p className="text-sm">No events yet — publish your first official event.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Event</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Host</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-4">
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      {e.title}
                      {e.isOfficial && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase">Official</span>}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">{e.type}</div>
                  </td>
                  <td className="py-4 text-xs text-gray-600">{e.host?.name}</td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${e.status === 'live' ? 'bg-red-100 text-red-600' : e.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-gray-500">{e.startAt ? new Date(e.startAt).toLocaleString() : '—'}</td>
                  <td className="py-4">
                    {isPrimary && (
                      <button onClick={() => handleDelete(e.id, e.title)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete event">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white"><Calendar className="w-5 h-5" /></div>
                  <h3 className="text-lg font-bold">New Official Event</h3>
                </div>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Event Title</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. NextIgnition Founder Masterclass" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}>
                      <option value="webinar">Webinar</option>
                      <option value="workshop">Workshop</option>
                      <option value="networking">Networking</option>
                      <option value="masterclass">Masterclass</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Format</label>
                    <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} className={inputCls}>
                      <option value="virtual">Virtual</option>
                      <option value="in-person">In-Person</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls + ' resize-none'} placeholder="What attendees will learn..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Time</label>
                    <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Duration (min)</label>
                    <select value={String(form.durationMinutes)} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} className={inputCls}>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Tags</label>
                    <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className={inputCls} placeholder="startup, funding" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Location / Meeting Link</label>
                  <input value={form.locationOrLink} onChange={e => setForm({ ...form, locationOrLink: e.target.value })} className={inputCls} placeholder="Zoom link or address" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Presentation URL (optional)</label>
                  <input value={form.presentationUrl} onChange={e => setForm({ ...form, presentationUrl: e.target.value })} className={inputCls} placeholder="https://..." />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className={`px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {saving ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsView({ token, isPrimary, setActionMsg }: any) {
  const [broadcasting, setBroadcasting] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', targetRole: 'all' });

  const handleBroadcast = async (e: any) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to send this broadcast to all selected users?')) return;
    try {
      setBroadcasting(true);
      const res = await adminFetch('/admin/broadcast', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setActionMsg('Broadcast sent successfully');
        setForm({ title: '', message: '', type: 'info', targetRole: 'all' });
      }
    } catch (err) { console.error(err); }
    finally { setBroadcasting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Bell className="w-6 h-6" /></div>
        <div>
          <h2 className="text-xl font-bold">Platform Broadcast</h2>
          <p className="text-sm text-gray-500">Send a notification to all users or specific roles.</p>
        </div>
      </div>

      <form onSubmit={handleBroadcast} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Target Audience</label>
            <select value={form.targetRole} onChange={e => setForm({...form, targetRole: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm">
              <option value="all">Everyone</option>
              <option value="founder">Founders</option>
              <option value="investor">Investors</option>
              <option value="expert">Experts</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Alert Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm">
              <option value="info">Info (Blue)</option>
              <option value="success">Success (Green)</option>
              <option value="warning">Warning (Yellow)</option>
              <option value="error">Critical (Red)</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Broadcast Title</label>
          <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm" placeholder="e.g. Scheduled Maintenance" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Message Body</label>
          <textarea required value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm resize-none" placeholder="Enter your announcement here..." />
        </div>
        <button disabled={broadcasting} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
          {broadcasting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Broadcast
        </button>
      </form>
    </div>
  );
}

function AIControlView({ token, setActionMsg }: any) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await adminFetch('/admin/settings', { headers: authHeaders(token) });
      const data = await res.json();
      setSettings(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    try {
      const res = await adminFetch('/admin/settings', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(settings)
      });
      if (res.ok) setActionMsg('AI Controls updated');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Bot className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold">AI Intelligence Control</h2>
            <p className="text-sm text-gray-500">Configure Ignisha AI behavior and usage limits.</p>
          </div>
        </div>

        {loading ? <Skeleton className="h-64 w-full" /> : (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-bold">Ignisha GPT-4 Engine</div>
                  <div className="text-xs text-gray-500">Use high-performance model for insights</div>
                </div>
                <input type="checkbox" checked={settings.useGPT4} onChange={e => setSettings({...settings, useGPT4: e.target.checked})} className="w-5 h-5 rounded border-gray-300" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Daily Free Messages per User</label>
                <input type="number" value={settings.dailyLimit || 5} onChange={e => setSettings({...settings, dailyLimit: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">AI Temperature (Creativity)</label>
                <input type="range" min="0" max="1" step="0.1" value={settings.temperature || 0.7} onChange={e => setSettings({...settings, temperature: parseFloat(e.target.value)})} className="w-full" />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase"><span>Precise</span><span>Creative</span></div>
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20">Save Changes</button>
          </form>
        )}
      </div>
    </div>
  );
}

function PlatformSettingsView({ token, setActionMsg }: any) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await adminFetch('/admin/settings', { headers: authHeaders(token) });
      const data = await res.json();
      setSettings(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    try {
      const res = await adminFetch('/admin/settings', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(settings)
      });
      if (res.ok) { setActionMsg('Global settings saved'); setTimeout(() => setActionMsg(''), 3000); }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Settings className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold">Platform Configuration</h2>
            <p className="text-sm text-gray-500">Global variables and system-wide feature flags.</p>
          </div>
        </div>

        {loading ? <Skeleton className="h-64 w-full" /> : (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-bold">Maintenance Mode</div>
                  <div className="text-xs text-gray-500">Lock platform for public access</div>
                </div>
                <input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} className="w-5 h-5 rounded border-gray-300" />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-bold">New User Registration</div>
                  <div className="text-xs text-gray-500">Allow new signups on the platform</div>
                </div>
                <input type="checkbox" checked={settings.allowRegistration} onChange={e => setSettings({...settings, allowRegistration: e.target.checked})} className="w-5 h-5 rounded border-gray-300" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Platform Support Email</label>
                <input type="email" value={settings.supportEmail || ''} onChange={e => setSettings({...settings, supportEmail: e.target.value})} className="w-full px-4 py-2 border border-gray-100 rounded-xl outline-none" placeholder="support@nextignition.io" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">Save Global Settings</button>
          </form>
        )}
      </div>
    </div>
  );
}

function AdminMgmtView({ token, setActionMsg }: any) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'SECONDARY_ADMIN' });
  const [editAdminData, setEditAdminData] = useState({ name: '', role: '' });

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/admin/admins', { headers: authHeaders(token) });
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleAddAdmin = async (e: any) => {
    e.preventDefault();
    try {
      const res = await adminFetch('/admin/admins', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(newAdmin)
      });
      if (res.ok) {
        setActionMsg('Admin created successfully');
        setShowAddModal(false);
        setNewAdmin({ name: '', email: '', password: '', role: 'SECONDARY_ADMIN' });
        fetchAdmins();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to create admin');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAdmin = async (e: any) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      const res = await adminFetch(`/admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(editAdminData)
      });
      if (res.ok) {
        setActionMsg('Admin updated');
        setShowEditModal(false);
        fetchAdmins();
      } else {
        const data = await res.json();
        alert(data.message || 'Update failed');
      }
    } catch (err) { console.error(err); }
  };

  const toggleAdminStatus = async (adm: any) => {
    const isSuspending = adm.status === 'active';
    const action = isSuspending ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${adm.name}?`)) return;
    
    try {
      const endpoint = isSuspending ? `/admin/admins/${adm.id}/suspend` : `/admin/admins/${adm.id}/activate`;
      const res = await adminFetch(endpoint, {
        method: 'POST',
        headers: authHeaders(token)
      });
      if (res.ok) {
        setActionMsg(`Admin ${isSuspending ? 'suspended' : 'activated'}`);
        fetchAdmins();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin account?')) return;
    try {
      const res = await adminFetch(`/admin/admins/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      });
      if (res.ok) {
        setActionMsg('Admin deleted');
        fetchAdmins();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (adm: any) => {
    setSelectedAdmin(adm);
    setEditAdminData({ name: adm.name, role: adm.role });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Admin Management</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-md shadow-blue-500/20"
            style={{ backgroundColor: brandColors.electricBlue }}
          >
            <Plus className="w-4 h-4" /> Add Admin
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Admin</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Last Login</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(adm => (
                  <tr key={adm.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-medium text-sm text-gray-900">{adm.name}</div>
                      <div className="text-xs text-gray-500">{adm.email}</div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${adm.role === 'PRIMARY_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {adm.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 text-xs text-gray-500">{adm.last_login ? new Date(adm.last_login).toLocaleString() : 'Never'}</td>
                    <td className="py-4">
                      <button 
                        onClick={() => toggleAdminStatus(adm)}
                        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${adm.status === 'active' ? 'hover:bg-green-50' : 'hover:bg-red-50'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${adm.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-medium capitalize">{adm.status}</span>
                      </button>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(adm)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit Admin">
                          <Edit className="w-4 h-4" />
                        </button>
                        {adm.role !== 'PRIMARY_ADMIN' && (
                          <button onClick={() => handleDeleteAdmin(adm.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Admin">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: -1 }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Add New Admin</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                  <input type="text" required value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                  <input type="email" required value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none" placeholder="admin@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                  <input type="password" required value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                  <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none bg-white">
                    <option value="SECONDARY_ADMIN">Secondary Admin (Operations)</option>
                    <option value="PRIMARY_ADMIN">Primary Admin (Full Control)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/20" style={{ backgroundColor: brandColors.electricBlue }}>Create Admin</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: -1 }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Edit Admin</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleUpdateAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                  <input type="text" required value={editAdminData.name} onChange={e => setEditAdminData({...editAdminData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                  <select value={editAdminData.role} onChange={e => setEditAdminData({...editAdminData, role: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none bg-white">
                    <option value="SECONDARY_ADMIN">Secondary Admin</option>
                    <option value="PRIMARY_ADMIN">Primary Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/20" style={{ backgroundColor: brandColors.electricBlue }}>Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleApplicationsView({ token, setActionMsg }: any) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'pending', role: '' });
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const query = `status=${filter.status}${filter.role ? `&role=${filter.role}` : ''}`;
      const res = await adminFetch(`/admin/role-applications?${query}`, { headers: authHeaders(token) });
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, [filter]);

  const handleApprove = async (app: any) => {
    if (!confirm(`Approve ${app.userName} for ${app.role.role || app.role.type} role?`)) return;
    try {
      const res = await adminFetch(`/admin/approve-role/${app.userId}`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ role: app.role.role || app.role.type })
      });
      if (res.ok) {
        setActionMsg('Role application approved');
        fetchApplications();
      }
    } catch (err) { console.error(err); }
  };

  const handleReject = async (e: any) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const res = await adminFetch(`/admin/reject-role/${selectedApp.userId}`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ role: selectedApp.role.role || selectedApp.role.type, reason: rejectionReason })
      });
      if (res.ok) {
        setActionMsg('Role application rejected');
        setSelectedApp(null);
        setRejectionReason('');
        fetchApplications();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">Role Applications</h2>
          <div className="flex items-center gap-3">
            <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100">
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filter.role} onChange={e => setFilter({...filter, role: e.target.value})} className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">All Roles</option>
              <option value="investor">Investor</option>
              <option value="expert">Expert</option>
              <option value="founder">Founder</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Applicant</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Requested Role</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Verifications</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Applied Date</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-sm text-gray-900">{app.userName}</div>
                      <div className="text-xs text-gray-500">{app.userEmail}</div>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {app.role.role || app.role.type}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-1">
                        {app.userVerifications.email && <div className="p-1 bg-green-50 text-green-600 rounded" title="Email Verified"><Mail className="w-3 h-3" /></div>}
                        {app.userVerifications.phone && <div className="p-1 bg-green-50 text-green-600 rounded" title="Phone Verified"><Phone className="w-3 h-3" /></div>}
                        {app.userVerifications.linkedIn && <div className="p-1 bg-blue-50 text-blue-600 rounded" title="LinkedIn Linked"><Linkedin className="w-3 h-3" /></div>}
                      </div>
                    </td>
                    <td className="py-4 text-xs text-gray-500">{new Date(app.role.appliedAt || app.userCreatedAt).toLocaleDateString()}</td>
                    <td className="py-4">
                      {filter.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(app)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><Check className="w-4 h-4" /></button>
                          <button onClick={() => { setSelectedApp(app); setRejectionReason(''); }} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedApp(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: -1 }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Reject {selectedApp.role.role || selectedApp.role.type} Application</h3>
              <form onSubmit={handleReject} className="space-y-4">
                <textarea
                  required
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-100 text-sm resize-none"
                  placeholder="Reason for rejection (will be emailed to user)..."
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelectedApp(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-semibold">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold">Confirm Reject</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Permission Denied Component ───────────────────────────────────────────
function PermissionDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-2xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner relative">
          <Lock className="w-8 h-8 text-red-500" />
          <motion.div 
            animate={{ scale: [1, 1.15, 1] }} 
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="absolute inset-0 rounded-2xl border border-red-400/20"
          />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          This module is limited to accounts with <strong>Primary Admin</strong> level authorization. 
          Secondary Admin roles do not have permission to view sensitive system audits, platform controls, or financial records.
        </p>
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs text-left text-gray-400 mb-6 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>If you require primary clearance, please contact the lead administrator to adjust your account role settings.</span>
        </div>
        <button 
          onClick={onBack}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-950/10"
        >
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
}

// ─── Activity Logs View Component ───────────────────────────────────────────
function ActivityLogsView({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState<any | null>(null);

  // Filters
  const [adminFilter, setAdminFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAdmins = async () => {
    try {
      const res = await adminFetch('/admin/admins', { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch (e) {
      console.error('Failed to fetch admins list for audit filters', e);
    }
  };

  const fetchLogs = async (p = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: '20',
      });
      if (adminFilter) params.append('adminId', adminFilter);
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await adminFetch(`/admin/activity-logs?${params}`, { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, adminFilter, moduleFilter, actionFilter, startDate, endDate]);

  const getAdminName = (id: string | null) => {
    if (!id) return 'System / Initializer';
    const adm = admins.find(a => a.id === id);
    return adm ? adm.name : `Admin (${id.substring(0, 8)})`;
  };

  const getAdminEmail = (id: string | null) => {
    if (!id) return 'bootstrap@nextignition.io';
    const adm = admins.find(a => a.id === id);
    return adm ? adm.email : '';
  };

  const getModuleBadgeColor = (mod: string) => {
    switch (mod) {
      case 'DASHBOARD': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'USER_MGMT': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'STARTUP_MGMT': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'INVESTOR_MGMT': return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'PAYMENTS': return 'bg-green-50 text-green-700 border-green-100';
      case 'CONTENT_MOD': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'EVENTS': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'NOTIFICATIONS': return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'AI_CONTROL': return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100';
      case 'PLATFORM_SETTINGS': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'ADMIN_MGMT': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'LOGS_SECURITY': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Security Audit Trail</h2>
            <p className="text-xs text-gray-500 mt-1">Compliance log of all administrator operations and permission events.</p>
          </div>
          <button 
            onClick={() => fetchLogs(1)} 
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors border border-gray-200"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Trail
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Administrator</span>
            <select
              value={adminFilter}
              onChange={e => { setAdminFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">All Admins</option>
              {admins.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Target Module</span>
            <select
              value={moduleFilter}
              onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">All Modules</option>
              <option value="DASHBOARD">Dashboard</option>
              <option value="USER_MGMT">User Management</option>
              <option value="STARTUP_MGMT">Startup Management</option>
              <option value="INVESTOR_MGMT">Investor Management</option>
              <option value="PAYMENTS">Payments</option>
              <option value="CONTENT_MOD">Content Moderation</option>
              <option value="EVENTS">Events & Webinars</option>
              <option value="NOTIFICATIONS">Notifications</option>
              <option value="AI_CONTROL">AI Control</option>
              <option value="PLATFORM_SETTINGS">Platform Settings</option>
              <option value="ADMIN_MGMT">Admin Management</option>
              <option value="LOGS_SECURITY">Logs & Security</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Operation Action</span>
            <input
              type="text"
              placeholder="e.g. SUSPEND"
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value.toUpperCase()); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>

        {/* Results Table */}
        {loading ? (
          <div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <ScrollText className="w-14 h-14 mb-3 text-gray-300" />
            <p className="text-base text-gray-400">No matching security logs recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Operator</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Module</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Action Type</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Target ID</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">IP Address</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-3">Timestamp</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-3 pr-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5">
                      <div className="font-semibold text-sm text-gray-900">{getAdminName(log.admin_id)}</div>
                      <div className="text-xs text-gray-500">{getAdminEmail(log.admin_id)}</div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${getModuleBadgeColor(log.module)}`}>
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {log.target_id ? (
                        <span className="font-mono text-[11px] text-gray-400 bg-gray-50/80 px-1.5 py-0.5 rounded border border-gray-100">
                          {log.target_id.substring(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono text-[11px] text-gray-400">{log.ip_address || 'Internal'}</span>
                    </td>
                    <td className="py-3.5 text-xs text-gray-500">
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      {log.change_summary ? (
                        <button
                          onClick={() => setExpandedLog(log)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="View Changes Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 20 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500 font-medium">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} audit records
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Summary Drawer / Modal */}
      <AnimatePresence>
        {expandedLog && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL_CONTENT }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedLog(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: -1 }} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Operation Change Summary</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Payload payload diff for action: <span className="font-bold text-gray-600">{expandedLog.action}</span></p>
                </div>
                <button onClick={() => setExpandedLog(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                  <div>
                    <span className="font-semibold text-gray-400 block mb-0.5 uppercase tracking-wide text-[9px]">Operator</span>
                    <span className="font-bold text-gray-800">{getAdminName(expandedLog.admin_id)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400 block mb-0.5 uppercase tracking-wide text-[9px]">Timestamp</span>
                    <span className="font-bold text-gray-800">{new Date(expandedLog.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Details rendering */}
                {(() => {
                  const summary = expandedLog.change_summary;
                  if (!summary) return <p className="text-xs text-gray-400">No diff recorded.</p>;

                  return (
                    <div className="space-y-4">
                      {summary.operation && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Operation Decription</h4>
                          <p className="text-sm font-semibold text-gray-800 bg-blue-50/50 border border-blue-100 p-3 rounded-xl">{summary.operation}</p>
                        </div>
                      )}
                      
                      {summary.reason && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Stated Reason</h4>
                          <p className="text-sm text-gray-700 bg-amber-50/50 border border-amber-100 p-3 rounded-xl">{summary.reason}</p>
                        </div>
                      )}

                      {/* Before / After comparisons if present */}
                      {(summary.before || summary.after) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {summary.before && (
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide">Previous State (-)</h4>
                              <pre className="text-[10px] bg-red-50/40 border border-red-100 text-red-900 p-3 rounded-xl font-mono overflow-x-auto max-h-60 max-w-full whitespace-pre-wrap break-all">
                                {typeof summary.before === 'object' ? JSON.stringify(summary.before, null, 2) : String(summary.before)}
                              </pre>
                            </div>
                          )}
                          {summary.after && (
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-green-600 uppercase tracking-wide">Updated State (+)</h4>
                              <pre className="text-[10px] bg-green-50/40 border border-green-100 text-green-900 p-3 rounded-xl font-mono overflow-x-auto max-h-60 max-w-full whitespace-pre-wrap break-all">
                                {typeof summary.after === 'object' ? JSON.stringify(summary.after, null, 2) : String(summary.after)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Logged Payload</h4>
                          <pre className="text-[10px] bg-gray-50 border border-gray-100 text-gray-700 p-3 rounded-xl font-mono overflow-x-auto max-h-60 max-w-full whitespace-pre-wrap break-all">
                            {JSON.stringify(summary, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 shrink-0 flex justify-end">
                <button onClick={() => setExpandedLog(null)} className="px-5 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                  Close Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
