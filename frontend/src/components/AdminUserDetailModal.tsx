import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Activity,
  FileText,
  CreditCard,
  LogIn,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Snowflake,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  DollarSign,
  Files,
  Zap,
} from 'lucide-react';
import { getSingletonApiBase } from '../utils/apiResolution';

const getApiBase = () => getSingletonApiBase(import.meta.env.VITE_API_URL);

const adminFetch = async (path: string, token: string): Promise<Response> => {
  const base = getApiBase();
  const raw = token?.startsWith('Bearer ') ? token.split(' ')[1] : token;
  return fetch(`${base}${path.startsWith('/') ? path : '/' + path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${raw}`,
    },
  });
};

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const fmtDateShort = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtAmount = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

const ACTION_ICONS: Record<string, { label: string; color: string }> = {
  LOGIN:               { label: 'Email Login',        color: 'text-blue-600 bg-blue-50' },
  GOOGLE_LOGIN:        { label: 'Google Login',       color: 'text-red-500 bg-red-50' },
  REGISTER:            { label: 'Registration',       color: 'text-green-600 bg-green-50' },
  DOCUMENT_UPLOAD:     { label: 'Document Upload',    color: 'text-purple-600 bg-purple-50' },
  PITCH_DECK_UPLOAD:   { label: 'Pitch Deck Upload',  color: 'text-orange-600 bg-orange-50' },
  PROFILE_UPDATE:      { label: 'Profile Update',     color: 'text-teal-600 bg-teal-50' },
  PAYMENT_INITIATED:   { label: 'Payment Initiated',  color: 'text-yellow-600 bg-yellow-50' },
  PAYMENT_SUCCESS:     { label: 'Payment Success',    color: 'text-emerald-600 bg-emerald-50' },
  ROLE_SWITCH:         { label: 'Role Switch',        color: 'text-indigo-600 bg-indigo-50' },
  PASSWORD_CHANGE:     { label: 'Password Changed',   color: 'text-slate-600 bg-slate-100' },
  PROFILE_VIEW:        { label: 'Profile View',       color: 'text-gray-500 bg-gray-50' },
};

const STATUS_COLORS: Record<string, string> = {
  paid:      'bg-emerald-100 text-emerald-700',
  captured:  'bg-emerald-100 text-emerald-700',
  created:   'bg-yellow-100 text-yellow-700',
  failed:    'bg-red-100 text-red-700',
  refunded:  'bg-gray-100 text-gray-600',
  unknown:   'bg-gray-100 text-gray-500',
};

// ── Types ──────────────────────────────────────────────────────────────────
interface UserStats {
  loginCount: number;
  lastLoginAt: string | null;
  totalPayments: number;
  totalSpent: number;
  totalDocuments: number;
  totalActivityEvents: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  avatar?: string | null;
  isVerified?: boolean;
  isFrozen?: boolean;
  createdAt?: string;
  loginCount?: number;
  lastLoginAt?: string;
  phoneVerified?: boolean;
  linkedInVerified?: boolean;
  subscriptionTier?: string;
  bio?: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface Document {
  id: string;
  type: string;
  label: string;
  name: string;
  fileUrl: string | null;
  fileType: string | null;
  uploadedAt: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  purpose: string;
  orderId?: string;
  paymentId?: string;
  date: string;
}

interface Props {
  userId: string;
  token: string;
  onClose: () => void;
}

type Tab = 'overview' | 'activity' | 'documents' | 'payments';

// ── Stat Pill ──────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${accent}`}>
      <div className="p-2 rounded-lg bg-white/70 shadow-sm">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs font-medium opacity-70">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────
export default function AdminUserDetailModal({ userId, token, onClose }: Props) {
  const getAdminRole = (t: string): string => {
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      return payload.role || 'SECONDARY_ADMIN';
    } catch { return 'SECONDARY_ADMIN'; }
  };
  const adminRole = getAdminRole(token);
  const isPrimary = adminRole === 'PRIMARY_ADMIN';

  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalSpent, setPaymentsTotalSpent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const LIMIT = 20;

  // Load overview on mount
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminFetch(`/admin/users/${userId}/profile`, token);
      if (!r.ok) throw new Error('Failed to load user profile');
      const data = await r.json();
      setProfile(data.profile);
      setStats(data.stats);
    } catch (e: any) {
      setError(e.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  const loadActivity = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const r = await adminFetch(`/admin/users/${userId}/activity?page=${page}&limit=${LIMIT}`, token);
      const data = await r.json();
      setActivityLogs(data.logs || []);
      setActivityTotal(data.total || 0);
    } catch { }
    finally { setLoading(false); }
  }, [userId, token]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch(`/admin/users/${userId}/documents`, token);
      const data = await r.json();
      setDocuments(data.documents || []);
    } catch { }
    finally { setLoading(false); }
  }, [userId, token]);

  const loadPayments = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const r = await adminFetch(`/admin/users/${userId}/payments?page=${page}&limit=${LIMIT}`, token);
      const data = await r.json();
      setPayments(data.payments || []);
      setPaymentsTotal(data.total || 0);
      setPaymentsTotalSpent(data.totalSpent || 0);
    } catch { }
    finally { setLoading(false); }
  }, [userId, token]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (tab === 'activity') loadActivity(activityPage);
    else if (tab === 'documents') loadDocuments();
    else if (tab === 'payments') loadPayments(paymentsPage);
  }, [tab, activityPage, paymentsPage, loadActivity, loadDocuments, loadPayments]);

  const TABS = ([
    { id: 'overview',  label: 'Overview',    icon: User },
    { id: 'activity',  label: 'Activity Log', icon: Activity },
    { id: 'documents', label: 'Documents',    icon: FileText },
    { id: 'payments',  label: 'Payments',     icon: CreditCard },
  ] as const).filter(t => t.id !== 'payments' || isPrimary);

  const roleColor = (r: string) => {
    if (r === 'founder') return 'bg-blue-100 text-blue-700';
    if (r === 'expert') return 'bg-orange-100 text-orange-700';
    if (r === 'investor') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-slate-800">
          {profile?.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center ring-2 ring-white/20">
              <span className="text-white font-bold text-lg">{profile?.name?.[0]?.toUpperCase() || '?'}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg truncate">{profile?.name || 'Loading...'}</h2>
              {profile?.isVerified && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              {profile?.isFrozen && <Snowflake className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            </div>
            <p className="text-slate-400 text-sm truncate">{profile?.email || ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleColor(profile.role)}`}>
                {profile.role}
              </span>
            )}
            <button
              id="admin-user-detail-close"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`admin-user-tab-${id}`}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && (
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >

                {/* ── OVERVIEW TAB ── */}
                {tab === 'overview' && profile && stats && (
                  <div className="space-y-6">
                    {/* Stat Pills */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <StatPill icon={LogIn}     label="Total Logins"       value={stats.loginCount}         accent="border-blue-200 bg-blue-50 text-blue-800" />
                      {isPrimary && <StatPill icon={DollarSign} label="Total Spent"        value={fmtAmount(stats.totalSpent)} accent="border-emerald-200 bg-emerald-50 text-emerald-800" />}
                      <StatPill icon={Files}     label="Documents"           value={stats.totalDocuments}     accent="border-purple-200 bg-purple-50 text-purple-800" />
                      {isPrimary && <StatPill icon={CreditCard} label="Payments Made"      value={stats.totalPayments}      accent="border-orange-200 bg-orange-50 text-orange-800" />}
                      <StatPill icon={Zap}       label="Activity Events"     value={stats.totalActivityEvents} accent="border-teal-200 bg-teal-50 text-teal-800" />
                      <StatPill icon={Clock}     label="Last Login"          value={stats.lastLoginAt ? fmtDateShort(stats.lastLoginAt) : 'Never'} accent="border-slate-200 bg-slate-50 text-slate-800" />
                    </div>

                    {/* Profile Fields */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Profile Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {[
                          { label: 'User ID',           value: profile.id },
                          { label: 'Email',             value: profile.email },
                          { label: 'Primary Role',      value: profile.role },
                          { label: 'All Roles',         value: (profile.roles || [profile.role]).join(', ') },
                          { label: 'Member Since',      value: fmtDateShort(profile.createdAt) },
                          { label: 'Last Login',        value: fmtDate(stats.lastLoginAt) },
                          { label: 'Subscription Tier', value: profile.subscriptionTier || 'Free' },
                          { label: 'Phone Verified',    value: profile.phoneVerified ? '✓ Yes' : '✗ No' },
                          { label: 'LinkedIn Verified', value: profile.linkedInVerified ? '✓ Yes' : '✗ No' },
                          { label: 'Account Status',    value: profile.isFrozen ? '❄ Frozen' : profile.isVerified ? '✓ Verified' : 'Unverified' },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex flex-col gap-0.5 bg-white rounded-lg p-3 border border-gray-100">
                            <span className="text-xs text-gray-400 font-medium">{label}</span>
                            <span className="text-gray-800 font-semibold break-all">{value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {profile.bio && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Bio</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ACTIVITY TAB ── */}
                {tab === 'activity' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{activityTotal} total events</p>
                    </div>

                    {activityLogs.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No activity recorded yet</p>
                        <p className="text-xs mt-1">Activity will appear here once the user logs in or takes actions</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                        <div className="space-y-3">
                          {activityLogs.map((log) => {
                            const info = ACTION_ICONS[log.action_type] || { label: log.action_type, color: 'text-gray-600 bg-gray-100' };
                            return (
                              <div key={log.id} className="flex gap-4 items-start pl-12 relative">
                                <div className={`absolute left-3 w-4 h-4 rounded-full border-2 border-white ${info.color.split(' ')[1]} top-1`} />
                                <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(log.created_at)}</span>
                                  </div>
                                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 rounded p-2">
                                      {Object.entries(log.metadata).map(([k, v]) => (
                                        <div key={k}><span className="text-gray-400">{k}:</span> <span className="text-gray-700">{String(v)}</span></div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Activity Pagination */}
                    {activityTotal > LIMIT && (
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          disabled={activityPage <= 1}
                          onClick={() => setActivityPage(p => p - 1)}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600">Page {activityPage} of {Math.ceil(activityTotal / LIMIT)}</span>
                        <button
                          disabled={activityPage >= Math.ceil(activityTotal / LIMIT)}
                          onClick={() => setActivityPage(p => p + 1)}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── DOCUMENTS TAB ── */}
                {tab === 'documents' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">{documents.length} document(s) uploaded</p>
                    {documents.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No documents found</p>
                        <p className="text-xs mt-1">Documents uploaded by this user will appear here</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{doc.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">{doc.label}</span>
                                {doc.fileType && <span className="text-xs text-gray-400">{doc.fileType.toUpperCase()}</span>}
                                <span className="text-xs text-gray-400">{fmtDateShort(doc.uploadedAt)}</span>
                              </div>
                            </div>
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Open document"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── PAYMENTS TAB ── */}
                {tab === 'payments' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{paymentsTotal} transaction(s)</p>
                      {paymentsTotalSpent > 0 && (
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                          Total Spent: {fmtAmount(paymentsTotalSpent)}
                        </span>
                      )}
                    </div>

                    {payments.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No payment history</p>
                        <p className="text-xs mt-1">Transactions made by this user will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((pmt) => (
                          <div key={pmt.id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                              <DollarSign className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{pmt.purpose}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {pmt.orderId && <span className="text-xs text-gray-400 font-mono">#{pmt.orderId.slice(-8)}</span>}
                                <span className="text-xs text-gray-400">{fmtDate(pmt.date)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[pmt.status] || STATUS_COLORS.unknown}`}>
                                {pmt.status}
                              </span>
                              <span className="font-bold text-gray-900">{fmtAmount(pmt.amount, pmt.currency)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Payments Pagination */}
                    {paymentsTotal > LIMIT && (
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          disabled={paymentsPage <= 1}
                          onClick={() => setPaymentsPage(p => p - 1)}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600">Page {paymentsPage} of {Math.ceil(paymentsTotal / LIMIT)}</span>
                        <button
                          disabled={paymentsPage >= Math.ceil(paymentsTotal / LIMIT)}
                          onClick={() => setPaymentsPage(p => p + 1)}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
