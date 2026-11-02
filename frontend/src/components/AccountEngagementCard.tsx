import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, BarChart3, Search, Users, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar } from './common/Avatar';
import { getMyEngagement, MyEngagement, EngagementMetric } from '../services/engagementService';

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

function Trend({ pct }: { pct: number }) {
  if (!pct) return <span className="text-[11px] text-gray-400">no change</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function Metric({
  icon: Icon, label, metric, color, bg, suffix,
}: {
  icon: any; label: string; metric: EngagementMetric; color: string; bg: string; suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{fmt(metric.count)}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{suffix || 'last 7 days'}</span>
        <Trend pct={metric.trendPct} />
      </div>
    </div>
  );
}

const roleLabel = (r: string) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Member');

const timeAgo = (iso: string | null) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return d === 1 ? '1d ago' : `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h ago`;
  const m = Math.floor(diff / 60000);
  return m >= 1 ? `${m}m ago` : 'just now';
};

interface Props {
  /** Optional outer margin override; defaults to the dashboard gutter. */
  className?: string;
  /** Called when a viewer row is clicked (e.g. to open their profile). */
  onViewProfile?: (userId: string) => void;
}

export function AccountEngagementCard({ className, onViewProfile }: Props) {
  const [data, setData] = useState<MyEngagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await getMyEngagement();
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Always render — fall back to zeros if the endpoint isn't reachable yet
  // (e.g. backend not restarted or migration 014 not run) so the card never
  // silently disappears from the dashboard.
  const ZERO_METRIC = { count: 0, prevCount: 0, trendPct: 0 };
  const e: MyEngagement = data ?? {
    periodDays: 7,
    profileViews: ZERO_METRIC,
    postImpressions: ZERO_METRIC,
    searchAppearances: ZERO_METRIC,
    followers: { total: 0, newThisPeriod: 0, prevPeriod: 0, trendPct: 0 },
    recentViewers: [],
    totalViewers: 0,
  };
  const f = e.followers;
  const viewers = e.recentViewers;

  return (
    <div className={className ?? 'mx-4 lg:mx-[24px] mt-[16px]'}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pb-3 border-b border-gray-50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Your engagement</h2>
            <p className="text-xs text-gray-400">Private to you · last 7 days</p>
          </div>
          {e.totalViewers > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              {expanded ? 'Hide' : `${e.totalViewers} viewer${e.totalViewers === 1 ? '' : 's'}`}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[92px] rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            <Metric icon={Eye} label="Profile views" metric={e.profileViews} color="#2563eb" bg="#dbeafe" />
            <Metric icon={BarChart3} label="Post impressions" metric={e.postImpressions} color="#8b5cf6" bg="#ede9fe" />
            <Metric icon={Search} label="Search appearances" metric={e.searchAppearances} color="#0d9488" bg="#ccfbf1" />
            <Metric
              icon={Users}
              label="Followers"
              metric={{ count: f?.total ?? 0, prevCount: f?.prevPeriod ?? 0, trendPct: f?.trendPct ?? 0 }}
              color="#ea580c"
              bg="#ffedd5"
              suffix={`+${f?.newThisPeriod ?? 0} this week`}
            />
          </div>
        )}

        {/* Who viewed your profile */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-50 overflow-hidden"
            >
              <div className="px-4 lg:px-6 py-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Who viewed your profile</p>
                <div className="space-y-1">
                  {viewers.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onViewProfile?.(v.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <Avatar src={v.avatar ?? undefined} name={v.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                        <p className="text-xs text-gray-400 truncate">{roleLabel(v.role)} · {timeAgo(v.viewedAt)}</p>
                      </div>
                      {onViewProfile && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    </button>
                  ))}
                  {viewers.length === 0 && (
                    <p className="text-sm text-gray-400 py-4 text-center">No profile views yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
