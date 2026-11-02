import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  TrendingUp,
  LogOut,
  Search,
  Snowflake,
  Trash2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Activity,
  UserCheck,
  Briefcase,
  DollarSign,
  BadgeCheck,
  Calendar,
  Upload,
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import AdminUserDetailModal from './AdminUserDetailModal';

import { getSingletonApiBase } from '../utils/apiResolution';

// --- NUCLEAR ADMIN FIX LOADED ---
console.log('--- NUCLEAR ADMIN FIX LOADED ---');

// --- SINGLETON API SYNC ---
const getApiBase = () => getSingletonApiBase(import.meta.env.VITE_API_URL);

/** Unified fetch with automatic Singleton API resolution and auth headers */
const adminFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const base = getApiBase();
  const rawToken = localStorage.getItem('adminToken');
  const token = rawToken?.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${fullPath}`;

  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  return fetch(url, { ...init, headers });
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  createdAt: string | null;
  lastActive: string | null;
  isVerified: boolean;
  isFrozen: boolean;
  avatar: string | null;
  totalSessions: number;
  lastTransaction: string | null;
  founder_plan?: 'free' | 'pro' | 'elite';
  expert_plan?: 'free' | 'pro' | 'elite';
  investor_plan?: 'free' | 'pro' | 'elite';
}

interface AdminEvent {
  id: string;
  title: string;
  type: string;
  status: string;
  startAt: string;
  presentationUrl?: string;
  host: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  founders: number;
  experts: number;
  investors: number;
  frozen: number;
  activeToday: number;
  totalRevenue?: number;
}

interface AdminTransaction {
  id: string;
  userName: string;
  userId: string;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
  orderId: string;
  paymentId?: string;
  date: string;
}

interface PublicLead {
  id: string;
  fullName?: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  city?: string;
  linkedinUrl?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

/** Decode the admin role from the JWT payload without a library. */
const getAdminRoleFromToken = (token: string): string => {
  try {
    return JSON.parse(atob(token.split('.')[1]))?.role || 'SECONDARY_ADMIN';
  } catch { return 'SECONDARY_ADMIN'; }
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtRelative = (iso: string | null) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const roleColor = (role: string) => {
  if (role === 'founder') return 'bg-blue-100 text-blue-700';
  if (role === 'expert') return 'bg-orange-100 text-orange-700';
  if (role === 'investor') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
};

// ─── Login Page ──────────────────────────────────────────────────────────────
function AdminLogin({ 
  onLogin 
}: { 
  onLogin: (token: string, name: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await adminFetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.message || 'Login failed'); return; }
      // Persist the refresh token so the dashboard can silently renew the
      // 30-min access token instead of forcing re-login (spec §4).
      if (data.refreshToken) localStorage.setItem('adminRefreshToken', data.refreshToken);
      onLogin(data.token, data.displayName || data.name || 'Admin');
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 lg:p-10 border border-gray-100 overflow-hidden"
      >
        {/* Decorative Background Orb */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundColor: brandColors.atomicOrange }}
        />
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{ 
              background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.navyBlue})` 
            }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">NextIgnition · Operations Center</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
            <input name="input-fe0c66"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@nextignition.io"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative" style={{ position: 'relative' }}>
              <input name="input-7049e4"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                className="text-gray-400 hover:text-gray-600"
                style={{ position: 'absolute', top: 0, bottom: 0, right: '12px', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: brandColors.atomicOrange }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6 font-medium">
          This panel is restricted to authorized administrators only.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-100 shadow-inner`}>
          <Icon className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </motion.div>
  );
}

// ─── Confirmation modal ───────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel, confirmClass, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h3 className="font-bold text-lg text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ token, adminName, onLogout }: { token: string; adminName: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'users' | 'upgrade' | 'transactions' | 'leads' | 'events'>('users');
  const [mode, setMode] = useState<'access' | 'ops'>('ops');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [leads, setLeads] = useState<PublicLead[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; confirmLabel: string; confirmClass: string; action: () => void }>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [upgradeUserId, setUpgradeUserId] = useState<string>('');
  const [upgradeRole, setUpgradeRole] = useState<'founder' | 'expert' | 'investor'>('founder');
  const [upgradePlan, setUpgradePlan] = useState<'free' | 'pro' | 'elite'>('elite');
  const LIMIT = 20;

  const isPrimary = getAdminRoleFromToken(token) === 'PRIMARY_ADMIN';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /** Log out on an expired admin session (401). Returns true if it handled it. */
  const handleUnauthorized = (status: number): boolean => {
    if (status === 401) { onLogout(); return true; }
    return false;
  };

  const fetchStats = useCallback(async () => {
    try {
      const r = await adminFetch('/admin/stats', { headers: authHeaders(token) });
      if (r.ok) setStats(await r.json());
    } catch { }
  }, [token]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search change
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const path = `/admin/users?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(debouncedSearch)}`;
      const r = await adminFetch(path, { headers: authHeaders(token) });
      if (!r.ok) { showToast('Failed to load users', 'error'); return; }
      const data = await r.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const path = `/admin/transactions?page=${page}&limit=${LIMIT}`;
      const r = await adminFetch(path, { headers: authHeaders(token) });
      if (!r.ok) { showToast('Failed to load transactions', 'error'); return; }
      const data = await r.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const path = `/admin/public-leads?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(debouncedSearch)}`;
      const r = await adminFetch(path, { headers: authHeaders(token) });
      if (!r.ok) { showToast('Failed to load leads', 'error'); return; }
      const data = await r.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const path = `/admin/events?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(debouncedSearch)}`;
      const r = await adminFetch(path, { headers: authHeaders(token) });
      if (!r.ok) { showToast('Failed to load events', 'error'); return; }
      const data = await r.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  const updateLeadStatus = async (id: string, newStatus: string) => {
    try {
      const r = await adminFetch(`/admin/public-leads/${id}/status`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ status: newStatus })
      });
      if (!r.ok) throw new Error();
      showToast('Status updated');
      fetchLeads();
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'upgrade') fetchUsers();
    else if (activeTab === 'transactions') fetchTransactions();
    else if (activeTab === 'leads') fetchLeads();
    else if (activeTab === 'events') fetchEvents();
  }, [activeTab, fetchUsers, fetchTransactions, fetchLeads, fetchEvents]);

  const selectedUpgradeUser = users.find(u => u.id === upgradeUserId) || null;

  const planForRole = (u: AdminUser | null, role: 'founder' | 'expert' | 'investor') => {
    if (!u) return '—';
    const key = `${role}_plan` as 'founder_plan' | 'expert_plan' | 'investor_plan';
    return (u[key] || 'free');
  };

  const setUserPlan = async () => {
    if (!upgradeUserId) { showToast('Select a user first', 'error'); return; }
    try {
      const r = await adminFetch(`/admin/users/${upgradeUserId}/set-plan`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ role: upgradeRole, plan: upgradePlan })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(data?.message || 'Failed to upgrade user', 'error');
        return;
      }
      showToast(`Updated ${selectedUpgradeUser?.name || 'user'}: ${upgradeRole} → ${upgradePlan.toUpperCase()}`, 'success');
      fetchUsers();
    } catch {
      showToast('Network error', 'error');
    }
  };

  const doFreeze = async (id: string, name: string, frozen: boolean) => {
    const action = frozen ? 'unfreeze' : 'freeze';
    setConfirm({
      title: frozen ? 'Unfreeze Account' : 'Freeze Account',
      message: `Are you sure you want to ${action} ${name}'s account?`,
      confirmLabel: frozen ? 'Unfreeze' : 'Freeze',
      confirmClass: frozen ? 'bg-blue-600' : 'bg-amber-500',
      action: async () => {
        setConfirm(null);
        try {
          const r = await adminFetch(`/admin/${action}/${id}`, {
            method: 'POST',
            headers: authHeaders(token),
          });
          if (r.ok) {
            showToast(`Account ${frozen ? 'unfrozen' : 'frozen'} successfully`);
            fetchUsers(); fetchStats();
          } else if (!handleUnauthorized(r.status)) {
            const data = await r.json().catch(() => ({} as any));
            showToast(data?.message || (r.status === 403 ? 'You do not have permission to perform this action' : `Failed to ${action} account`), 'error');
          }
        } catch { showToast('Network error', 'error'); }
      },
    });
  };

  const doDelete = (id: string, name: string) => {
    setConfirm({
      title: 'Delete Account',
      message: `This will permanently delete ${name}'s account and all their data. This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmClass: 'bg-red-600',
      action: async () => {
        setConfirm(null);
        try {
          const r = await adminFetch(`/admin/delete/${id}`, {
            method: 'DELETE',
            headers: authHeaders(token),
          });
          if (r.ok) {
            showToast(`${name}'s account deleted`);
            fetchUsers(); fetchStats();
          } else if (!handleUnauthorized(r.status)) {
            const data = await r.json().catch(() => ({} as any));
            showToast(data?.message || (r.status === 403 ? 'You do not have permission to delete users' : 'Failed to delete account'), 'error');
          }
        } catch { showToast('Network error', 'error'); }
      },
    });
  };

  const doVerify = async (id: string, name: string) => {
    setConfirm({
      title: 'Verify Profile',
      message: `Are you sure you want to verify ${name}'s profile? Verified users can make payments and access premium features.`,
      confirmLabel: 'Verify',
      confirmClass: 'bg-emerald-600',
      action: async () => {
        setConfirm(null);
        try {
          const r = await adminFetch(`/admin/verify/${id}`, {
            method: 'POST',
            headers: authHeaders(token),
          });
          if (r.ok) {
            showToast('User verified successfully');
            fetchUsers(); fetchStats();
          } else if (!handleUnauthorized(r.status)) {
            const data = await r.json().catch(() => ({} as any));
            showToast(data?.message || (r.status === 403 ? 'You do not have permission to verify users' : 'Failed to verify user'), 'error');
          }
        } catch { showToast('Network error', 'error'); }
      },
    });
  };

  const totalPages = Math.ceil(total / LIMIT);

  const NAVY = '#182B63';
  const ORANGE = '#F78405';

  const AccessSection = ({ number, title, children }: { number: string; title: string; children: any }) => (
    <div className="mt-7">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-white flex items-center justify-center border" style={{ borderColor: NAVY }}>
          <div className="w-2.5 h-2.5" style={{ backgroundColor: NAVY }} />
        </div>
        <div className="flex-1 h-10 flex items-center px-4 text-white font-black uppercase tracking-wider" style={{ backgroundColor: NAVY }}>
          {number}. {title}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );

  const AccessTable = ({ title, rows }: { title: string; rows: { feature: string; primary: boolean; secondary: boolean }[] }) => (
    <div className="mt-6">
      <div className="text-[15px] font-black" style={{ color: NAVY }}>{title}</div>
      <div className="mt-2 border border-gray-300">
        <div className="grid grid-cols-[1fr_110px_110px] text-white font-black text-xs" style={{ backgroundColor: NAVY }}>
          <div className="px-3 py-2">Feature</div>
          <div className="px-3 py-2 text-center">Primary Admin</div>
          <div className="px-3 py-2 text-center">Secondary Admin</div>
        </div>
        {rows.map((r, idx) => (
          <div key={idx} className={`grid grid-cols-[1fr_110px_110px] text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="px-3 py-2 border-t border-gray-300">{r.feature}</div>
            <div className="px-3 py-2 border-t border-l border-gray-300 text-center font-black" style={{ color: r.primary ? '#16a34a' : '#dc2626' }}>
              {r.primary ? '✓' : '✕'}
            </div>
            <div className="px-3 py-2 border-t border-l border-gray-300 text-center font-black" style={{ color: r.secondary ? '#16a34a' : '#dc2626' }}>
              {r.secondary ? '✓' : '✕'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AccessDoc = () => {
    const moduleTables: { title: string; rows: { feature: string; primary: boolean; secondary: boolean }[] }[] = [
      {
        title: '3.1 Dashboard',
        rows: [
          { feature: 'View overall stats', primary: true, secondary: true },
          { feature: 'Revenue stats', primary: true, secondary: false },
          { feature: 'AI usage stats', primary: true, secondary: false },
        ],
      },
      {
        title: '3.2 User Management',
        rows: [
          { feature: 'View users', primary: true, secondary: true },
          { feature: 'Approve / Reject users', primary: true, secondary: true },
          { feature: 'Edit user details', primary: true, secondary: true },
          { feature: 'Suspend user', primary: true, secondary: true },
          { feature: 'Permanently delete user', primary: true, secondary: false },
          { feature: 'KYC verification', primary: true, secondary: true },
        ],
      },
      {
        title: '3.3 Startup / Platform Management',
        rows: [
          { feature: 'View startups', primary: true, secondary: true },
          { feature: 'Approve startups', primary: true, secondary: true },
          { feature: 'Edit startup info', primary: true, secondary: true },
          { feature: 'Delete startup', primary: true, secondary: false },
          { feature: 'Feature startup (promoted listing)', primary: true, secondary: false },
        ],
      },
      {
        title: '3.4 Investor Management',
        rows: [
          { feature: 'View investors', primary: true, secondary: true },
          { feature: 'Approve investors', primary: true, secondary: false },
          { feature: 'Edit investor info', primary: true, secondary: false },
        ],
      },
      {
        title: '3.5 Payments & Finance',
        rows: [
          { feature: 'View transactions', primary: true, secondary: false },
          { feature: 'Manage payouts', primary: true, secondary: false },
          { feature: 'Refund control', primary: true, secondary: false },
          { feature: 'Revenue dashboard', primary: true, secondary: false },
        ],
      },
      {
        title: '3.6 Content Moderation',
        rows: [
          { feature: 'View posts', primary: true, secondary: true },
          { feature: 'Delete / Report posts', primary: true, secondary: true },
        ],
      },
      {
        title: '3.7 Events & Webinars',
        rows: [
          { feature: 'Create events', primary: true, secondary: true },
          { feature: 'Approve events', primary: true, secondary: true },
          { feature: 'Delete events', primary: true, secondary: false },
        ],
      },
      {
        title: '3.8 Notifications',
        rows: [
          { feature: 'Send notifications', primary: true, secondary: true },
          { feature: 'Manage notification templates', primary: true, secondary: false },
        ],
      },
      {
        title: '3.9 AI Control Panel (Ignisha AI)',
        rows: [
          { feature: 'View AI usage metrics', primary: true, secondary: false },
          { feature: 'Enable / Disable AI features', primary: true, secondary: false },
          { feature: 'View prompt logs', primary: true, secondary: false },
        ],
      },
      {
        title: '3.10 Platform Settings',
        rows: [
          { feature: 'Platform configuration', primary: true, secondary: false },
          { feature: 'Pricing & commission management', primary: true, secondary: false },
          { feature: 'API keys management', primary: true, secondary: false },
        ],
      },
      {
        title: '3.11 Admin Management',
        rows: [
          { feature: 'Create secondary admin', primary: true, secondary: false },
          { feature: 'Edit admin details', primary: true, secondary: false },
          { feature: 'Delete admin', primary: true, secondary: false },
        ],
      },
      {
        title: '3.12 Logs & Security',
        rows: [
          { feature: 'View admin activity logs', primary: true, secondary: false },
          { feature: 'View login activity', primary: true, secondary: false },
        ],
      },
    ];

    return (
      <div className="bg-white">
        <div className="w-full text-white" style={{ backgroundColor: NAVY }}>
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="text-xs font-black tracking-widest">NEXT IGNITION</div>
            <div className="text-xs font-bold opacity-90">Admin Panel Access Control — CONFIDENTIAL</div>
          </div>
          <div className="h-1" style={{ backgroundColor: ORANGE }} />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center justify-center">
            <div className="text-4xl font-black tracking-tight" style={{ color: NAVY }}>
              NEXT <span style={{ color: ORANGE }}>IGNITION</span>
            </div>
          </div>

          <div className="mt-8">
            <div className="text-3xl font-black uppercase tracking-wide" style={{ color: NAVY }}>
              Admin Panel Access Control Document
            </div>
            <div className="mt-2 text-xs text-gray-600 font-medium">
              2-Level Admin System — Internal Technical Specification
            </div>
            <div className="text-xs text-gray-600 font-medium">
              Version: V1 | Project: Next Ignition Platform | Classification: CONFIDENTIAL
            </div>
            <div className="mt-4 h-1" style={{ backgroundColor: ORANGE }} />
          </div>

          <div className="mt-6 border-2 rounded" style={{ borderColor: ORANGE }}>
            <div className="p-4 text-xs leading-relaxed" style={{ color: NAVY }}>
              <span className="font-black">About Next Ignition:</span> Next Ignition is an AI-powered startup acceleration platform built for India's startup ecosystem with global expansion ambitions. The platform bridges the critical gap between 'building' and 'fundable' stages — powered by Ignisha AI (our intelligent co-pilot), a verified community of founders, co-founders, experts, and investors, and a structured growth framework. Our core mission: <span className="italic font-black">We don't let startups die.</span>
            </div>
          </div>

          <AccessSection number="1" title="Objective">
            <div className="text-sm text-gray-700 leading-relaxed">
              Build a secure and scalable admin panel with 2-level access control supporting full system governance for the Next Ignition platform. The system enforces role-based access across all platform modules covering founders, investors, startups, AI features, finance, and community — with a clear upgrade path to full multi-role RBAC.
              <div className="mt-4 pl-6">
                <ul className="list-disc space-y-1 text-sm">
                  <li><span className="font-bold">Primary Admin (Super Admin)</span> — Full unrestricted system access</li>
                  <li><span className="font-bold">Secondary Admin (Limited Access)</span> — Restricted to predefined permitted operations</li>
                  <li>Future-ready architecture for RBAC with custom roles (Support, Finance, Ops)</li>
                </ul>
              </div>
            </div>
          </AccessSection>

          <AccessSection number="2" title="Admin Types">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-300 overflow-hidden">
              <div className="p-0">
                <div className="px-4 py-3 text-white font-black text-sm text-center" style={{ backgroundColor: NAVY }}>
                  PRIMARY ADMIN (Super Admin)
                </div>
                <div className="p-4 text-xs text-gray-700 leading-relaxed">
                  Full system access with zero restrictions. Manages all modules, settings, finances, AI controls, and secondary admin accounts.
                </div>
              </div>
              <div className="p-0">
                <div className="px-4 py-3 text-black font-black text-sm text-center" style={{ backgroundColor: ORANGE }}>
                  SECONDARY ADMIN (Limited Access)
                </div>
                <div className="p-4 text-xs text-gray-700 leading-relaxed">
                  Restricted to operational tasks only. Cannot access sensitive system controls, finance data, AI internals, or admin management.
                </div>
              </div>
            </div>
          </AccessSection>

          <AccessSection number="3" title="Modules & Access Control">
            <div className="text-xs text-gray-600 italic">
              The following tables define per-module feature access. Green ✓ = Access Granted. Red ✕ = Access Denied.
            </div>
            {moduleTables.map((t) => (
              <AccessTable key={t.title} title={t.title} rows={t.rows} />
            ))}
          </AccessSection>

          <AccessSection number="4" title="Authentication Requirements">
            <div className="pl-6">
              <ul className="list-disc space-y-1 text-sm text-gray-700">
                <li>Email + Password login (no OAuth in V1)</li>
                <li>JWT-based authentication — role embedded in token payload</li>
                <li>Secure password hashing using bcrypt</li>
                <li>Token expiry + refresh token flow</li>
                <li>2FA support planned for future version (TOTP/OTP)</li>
              </ul>
            </div>
          </AccessSection>

          <AccessSection number="5" title="Security Features">
            <div className="border border-gray-300">
              <div className="grid grid-cols-[220px_1fr] text-white font-black text-xs" style={{ backgroundColor: NAVY }}>
                <div className="px-3 py-2">Feature</div>
                <div className="px-3 py-2">Details</div>
              </div>
              {[
                { f: 'Role-based middleware', d: 'Backend enforces role checks on every protected route' },
                { f: 'Route protection', d: 'Frontend hides modules + Backend blocks API calls' },
                { f: 'Admin activity logs', d: 'Every action logged with admin_id, module, target, timestamp' },
                { f: 'Session timeout', d: 'Auto logout after inactivity (configurable, default 30 min)' },
                { f: '2FA (Future)', d: 'TOTP/OTP ready — pluggable into current auth flow' },
                { f: 'Rate limiting', d: 'API rate limiting to prevent brute force on login endpoints' },
              ].map((r, idx) => (
                <div key={idx} className={`grid grid-cols-[220px_1fr] text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="px-3 py-2 border-t border-gray-300 font-bold">{r.f}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300 text-gray-700">{r.d}</div>
                </div>
              ))}
            </div>
          </AccessSection>

          <AccessSection number="6" title="Database Structure">
            <div className="text-sm font-black" style={{ color: NAVY }}>Admin Table</div>
            <div className="mt-2 border border-gray-300">
              <div className="grid grid-cols-[160px_160px_1fr] text-white font-black text-xs" style={{ backgroundColor: ORANGE }}>
                <div className="px-3 py-2">Column</div>
                <div className="px-3 py-2">Type</div>
                <div className="px-3 py-2">Notes</div>
              </div>
              {[
                { c: 'id', t: 'UUID / INT', n: 'Primary key' },
                { c: 'name', t: 'VARCHAR', n: 'Admin full name' },
                { c: 'email', t: 'VARCHAR', n: 'Unique, login identifier' },
                { c: 'password_hash', t: 'VARCHAR', n: 'bcrypt hashed' },
                { c: 'role', t: 'ENUM', n: 'PRIMARY | SECONDARY' },
                { c: 'status', t: 'ENUM', n: 'active | suspended' },
                { c: 'created_at', t: 'TIMESTAMP', n: 'Auto-generated' },
              ].map((r, idx) => (
                <div key={idx} className={`grid grid-cols-[160px_160px_1fr] text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="px-3 py-2 border-t border-gray-300">{r.c}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300">{r.t}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300">{r.n}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-sm font-black" style={{ color: NAVY }}>Admin Logs Table</div>
            <div className="mt-2 border border-gray-300">
              <div className="grid grid-cols-[160px_160px_1fr] text-white font-black text-xs" style={{ backgroundColor: ORANGE }}>
                <div className="px-3 py-2">Column</div>
                <div className="px-3 py-2">Type</div>
                <div className="px-3 py-2">Notes</div>
              </div>
              {[
                { c: 'id', t: 'UUID / INT', n: 'Primary key' },
                { c: 'admin_id', t: 'FK → admins.id', n: 'Which admin performed the action' },
                { c: 'action', t: 'VARCHAR', n: 'e.g. DELETE_USER, APPROVE_STARTUP' },
                { c: 'module', t: 'VARCHAR', n: 'e.g. USER_MGMT, INVESTOR_MGMT' },
                { c: 'target_id', t: 'VARCHAR', n: 'ID of the affected entity' },
                { c: 'timestamp', t: 'TIMESTAMP', n: 'Auto-generated on log insert' },
              ].map((r, idx) => (
                <div key={idx} className={`grid grid-cols-[160px_160px_1fr] text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="px-3 py-2 border-t border-gray-300">{r.c}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300">{r.t}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300">{r.n}</div>
                </div>
              ))}
            </div>
          </AccessSection>

          <AccessSection number="7" title="API Permission Flow">
            <div className="border border-gray-300">
              <div className="grid grid-cols-[70px_1fr_1fr] text-white font-black text-xs" style={{ backgroundColor: NAVY }}>
                <div className="px-3 py-2">Step</div>
                <div className="px-3 py-2">Action</div>
                <div className="px-3 py-2">Outcome</div>
              </div>
              {[
                { s: '1', a: 'Client sends request with Bearer JWT token', o: 'Token present → proceed' },
                { s: '2', a: 'Backend middleware decodes and validates token', o: 'Invalid/expired → 401 Unauthorized' },
                { s: '3', a: 'Role extracted from token payload', o: 'role: PRIMARY or SECONDARY' },
                { s: '4', a: "Permission check against route's required role", o: 'Insufficient role → 403 Forbidden' },
                { s: '5', a: 'Action executed + logged in admin_logs table', o: '200 OK + log entry created' },
              ].map((r, idx) => (
                <div key={idx} className={`grid grid-cols-[70px_1fr_1fr] text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="px-3 py-2 border-t border-gray-300 font-black" style={{ color: ORANGE }}>{r.s}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300">{r.a}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300 text-gray-700">{r.o}</div>
                </div>
              ))}
            </div>
          </AccessSection>

          <AccessSection number="8" title="Frontend Behavior">
            <div className="pl-6">
              <ul className="list-disc space-y-1 text-sm text-gray-700">
                <li>Secondary Admin sees only permitted modules in the sidebar — restricted modules are hidden</li>
                <li>Buttons for restricted actions are disabled or hidden (extra safety layer beyond backend)</li>
                <li>Role decoded from JWT on login and stored in global auth context</li>
                <li>Route guards redirect unauthorized access attempts to a 403 page</li>
                <li>Primary Admin sees all modules with full access</li>
                <li>Switch Profile feature (future): users with multiple roles see context-aware dashboards</li>
              </ul>
            </div>
          </AccessSection>

          <AccessSection number="9" title="Future Scalability — RBAC Roadmap">
            <div className="border border-gray-300">
              <div className="grid grid-cols-[90px_160px_1fr] text-white font-black text-xs" style={{ backgroundColor: NAVY }}>
                <div className="px-3 py-2">Phase</div>
                <div className="px-3 py-2">Milestone</div>
                <div className="px-3 py-2">Description</div>
              </div>
              {[
                { p: 'V1 (Now)', m: '2-Level Admin', d: 'PRIMARY + SECONDARY roles, per-module access tables' },
                { p: 'V2', m: 'Custom Roles', d: 'Support, Finance, Ops roles with configurable permission sets' },
                { p: 'V3', m: 'Granular Permissions', d: 'Permission-level control (not just role-level) per endpoint' },
                { p: 'V4', m: 'Admin Marketplace', d: 'Invite-based team admin with approval flows and audit trails' },
              ].map((r, idx) => (
                <div key={idx} className={`grid grid-cols-[90px_160px_1fr] text-xs ${idx % 2 === 0 ? 'bg-emerald-50' : 'bg-white'}`}>
                  <div className="px-3 py-2 border-t border-gray-300 font-bold" style={{ color: r.p.includes('V1') ? ORANGE : NAVY }}>{r.p}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300 font-bold">{r.m}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300 text-gray-700">{r.d}</div>
                </div>
              ))}
            </div>
          </AccessSection>

          <AccessSection number="10" title="Delivery Expectations">
            <div className="border border-gray-300">
              <div className="grid grid-cols-[1fr_110px_1fr] text-white font-black text-xs" style={{ backgroundColor: NAVY }}>
                <div className="px-3 py-2">Deliverable</div>
                <div className="px-3 py-2">Priority</div>
                <div className="px-3 py-2">Notes</div>
              </div>
              {[
                { d: 'Fully functional admin panel (V1)', p: 'Critical', n: 'All 12 modules implemented', c: 'text-emerald-600' },
                { d: 'Role-based access enforcement (backend)', p: 'Critical', n: 'Middleware on every protected route', c: 'text-emerald-600' },
                { d: 'Clean UI with restricted visibility', p: 'High', n: 'Secondary Admin sees only permitted sections', c: 'text-amber-600' },
                { d: 'Secure auth system (JWT + bcrypt)', p: 'Critical', n: 'Session timeout included', c: 'text-emerald-600' },
                { d: 'Admin activity logging', p: 'High', n: 'Mandatory — all actions logged', c: 'text-amber-600' },
                { d: 'API documentation (Postman/Swagger)', p: 'Medium', n: 'For developer handoff', c: 'text-orange-600' },
                { d: 'RBAC-ready schema design', p: 'Medium', n: 'V2-forward upgrade path', c: 'text-orange-600' },
              ].map((r, idx) => (
                <div key={idx} className={`grid grid-cols-[1fr_110px_1fr] text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="px-3 py-2 border-t border-gray-300">{r.d}</div>
                  <div className={`px-3 py-2 border-t border-l border-gray-300 font-black ${r.c}`}>{r.p}</div>
                  <div className="px-3 py-2 border-t border-l border-gray-300 text-gray-700">{r.n}</div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <div className="text-white text-center py-6 px-6" style={{ backgroundColor: NAVY }}>
                <div className="text-sm font-black">Next Ignition — AI-powered startup acceleration platform</div>
                <div className="text-xs font-bold opacity-90 mt-1">Ignisha AI · Verified Community · Investor Access · nextignition.com</div>
                <div className="text-xs font-black mt-2" style={{ color: ORANGE }}>We don't let startups die.</div>
              </div>
            </div>
          </AccessSection>
        </div>
      </div>
    );
  };

  return (
    <div className={mode === 'access' ? 'min-h-screen bg-white' : 'min-h-screen bg-gray-50'}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {toast.type === 'success' ? <BadgeCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          confirmClass={confirm.confirmClass}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUserId && (
          <AdminUserDetailModal
            userId={selectedUserId}
            token={token}
            onClose={() => setSelectedUserId(null)}
          />
        )}
      </AnimatePresence>

      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md"
              style={{ background: brandColors.atomicOrange }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-none tracking-tight">Portal</h1>
              <p className="text-[10px] text-gray-400 font-medium">NextIgnition Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setMode('access')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${mode === 'access' ? 'bg-white text-[#182B63] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Access Control
              </button>
              <button
                onClick={() => setMode('ops')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${mode === 'ops' ? 'bg-white text-[#182B63] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Operations
              </button>
            </div>
            <span className="text-xs text-gray-500 hidden sm:block">Signed in as <strong>{adminName}</strong></span>
            <button
              onClick={() => {
                fetchStats();
                if (activeTab === 'users' || activeTab === 'upgrade') fetchUsers();
                else if (activeTab === 'transactions') fetchTransactions();
                else if (activeTab === 'leads') fetchLeads();
                else if (activeTab === 'events') fetchEvents();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {mode === 'access' ? (
        <main>
          <AccessDoc />
        </main>
      ) : (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-indigo-100 text-indigo-600" />
            <StatCard icon={Activity} label="Active Today" value={stats.activeToday} color="bg-emerald-100 text-emerald-600" />
            <StatCard icon={Briefcase} label="Founders" value={stats.founders} color="bg-blue-100 text-blue-600" />
            <StatCard icon={TrendingUp} label="Experts" value={stats.experts} color="bg-orange-100 text-orange-600" />
            <StatCard icon={DollarSign} label="Revenue" value={`₹${stats.totalRevenue?.toLocaleString('en-IN') || 0}`} color="bg-purple-100 text-purple-600" />
            <StatCard icon={Snowflake} label="Frozen" value={stats.frozen} color="bg-sky-100 text-sky-600" />
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-gray-200/50 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab('users'); setPage(1); setSearch(''); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-[#f78405] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Users
          </button>
          <button
            onClick={() => { setActiveTab('upgrade'); setPage(1); setSearch(''); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'upgrade' ? 'bg-white text-[#f78405] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Upgrade Users
          </button>
          <button
            onClick={() => { setActiveTab('leads'); setPage(1); setSearch(''); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-white text-[#f78405] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Public Leads
          </button>
          <button
            onClick={() => { setActiveTab('events'); setPage(1); setSearch(''); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'events' ? 'bg-white text-[#f78405] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Events & PPTs
          </button>
          <button
            onClick={() => { setActiveTab('transactions'); setPage(1); setSearch(''); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-white text-[#f78405] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Transactions
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeTab === 'users' || activeTab === 'upgrade' ? (
                <>
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-gray-900">{activeTab === 'upgrade' ? 'Upgrade Users' : 'All Users'}</h2>
                </>
              ) : activeTab === 'transactions' ? (
                <>
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-gray-900">All Transactions</h2>
                </>
              ) : activeTab === 'leads' ? (
                <>
                  <Users className="w-5 h-5 text-[#f78405]" />
                  <h2 className="font-bold text-gray-900">Public Registration Leads</h2>
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <h2 className="font-bold text-gray-900">Event PPT Submissions</h2>
                </>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${debouncedSearch ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                {debouncedSearch ? `${total} matches` : `${total} total`}
              </span>
            </div>
            {activeTab !== 'transactions' && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input name="input-b46bb3"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, role…"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            {activeTab === 'users' || activeTab === 'upgrade' ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Active</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading users…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.isFrozen ? 'bg-sky-50/50' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                              {(u.name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{u.name || '—'}</div>
                              <div className="text-xs text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtRelative(u.lastActive)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          {u.isFrozen ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-sky-600">
                              <Snowflake className="w-3 h-3" /> Frozen
                            </span>
                          ) : u.isVerified ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                              <BadgeCheck className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <XCircle className="w-3 h-3" /> Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedUserId(u.id)}
                              title="View full details"
                              className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                              id={`admin-view-user-${u.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => doFreeze(u.id, u.name, u.isFrozen)}
                              title={u.isFrozen ? 'Unfreeze' : 'Freeze'}
                              className={`p-1.5 rounded-lg transition-colors ${u.isFrozen ? 'text-blue-600 hover:bg-blue-50' : 'text-sky-600 hover:bg-sky-50'}`}
                            >
                              <Snowflake className="w-4 h-4" />
                            </button>
                            {!u.isVerified && (
                              <button
                                onClick={() => doVerify(u.id, u.name)}
                                title="Verify profile"
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </button>
                            )}
                            {isPrimary && (
                              <button
                                onClick={() => doDelete(u.id, u.name)}
                                title="Delete user"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'transactions' ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Payment ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading transactions…
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{t.userName}</td>
                        <td className="px-4 py-3 uppercase tracking-wider text-xs font-bold text-gray-500">{t.purpose.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">₹{t.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(t.date).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-400">{t.paymentId || t.orderId}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'leads' ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">City</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading leads…
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                        No public leads found
                      </td>
                    </tr>
                  ) : (
                    leads.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900 text-sm">{l.fullName || '—'}</div>
                          <div className="text-xs text-gray-400">{l.email}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{l.phone || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor(l.role || '')}`}>
                            {l.role || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{l.city || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(l.createdAt)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={l.status || 'new'}
                            onChange={(e) => updateLeadStatus(l.id, e.target.value)}
                            className="bg-white border border-gray-200 text-sm rounded focus:ring-indigo-500 focus:border-indigo-500 p-1 font-medium"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="onboarded">Onboarded</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Host</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PPT / Presentation</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading events…
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                        No events found with presentations
                      </td>
                    </tr>
                  ) : (
                    events.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-bold text-gray-900 text-sm">{e.title}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-tighter">{e.type}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{e.host.name}</div>
                          <div className="text-xs text-gray-400">{e.host.email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(e.startAt)}</td>
                        <td className="px-4 py-3">
                          {e.presentationUrl ? (
                            <a 
                              href={e.presentationUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              View PPT
                            </a>
                          ) : (
                            <span className="text-xs text-red-500 font-medium italic">Missing PPT</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            e.status === 'upcoming' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs self-center text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      )}
    </div>
  );
}

// ─── Root Component ────────────────────────────────────────────────────────────
// AdminPanel is ONLY the login gate. After login, App.tsx renders AdminDashboard.tsx.
export default function AdminPanel({
  onLogin,
}: {
  onLogin?: (token: string, name: string) => void;
}) {
  const handleLogin = (t: string, name: string) => {
    if (onLogin) {
      onLogin(t, name);
      return;
    }

    localStorage.setItem('adminToken', t);
    localStorage.setItem('adminName', name);
    window.location.hash = 'admin-dashboard';
  };

  return <AdminLogin onLogin={handleLogin} />;
}
