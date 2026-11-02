import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Clock,
  CheckCircle,
  Users,
  Video,
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { brandColors } from '../utils/colors';
import api from '../services/api';

interface Transaction {
  id: string | number;
  type: string;
  client: string;
  amount: number;
  date: string;
  status: string;
}

interface EarningsData {
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  pending: number;
  available: number;
}

// Static Tailwind class maps. Dynamic strings like `bg-${color}-100` get purged
// by Tailwind's JIT at build time (it can only see complete class names), so the
// filter highlights/icons never render. These full strings are detectable.
const FILTER_COLOR_CLASSES: Record<string, { selected: string; iconBg: string; iconText: string; check: string }> = {
  blue:   { selected: 'border-blue-500 bg-blue-50',     iconBg: 'bg-blue-100',   iconText: 'text-blue-700',   check: 'text-blue-500' },
  purple: { selected: 'border-purple-500 bg-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-700', check: 'text-purple-500' },
  green:  { selected: 'border-green-500 bg-green-50',   iconBg: 'bg-green-100',  iconText: 'text-green-700',  check: 'text-green-500' },
  orange: { selected: 'border-orange-500 bg-orange-50', iconBg: 'bg-orange-100', iconText: 'text-orange-700', check: 'text-orange-500' },
  yellow: { selected: 'border-yellow-500 bg-yellow-50', iconBg: 'bg-yellow-100', iconText: 'text-yellow-700', check: 'text-yellow-500' },
};

export function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EarningsData>({
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    pending: 0,
    available: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [breakdowns, setBreakdowns] = useState<{ week: {month: string, amount: number}[]; month: {month: string, amount: number}[]; year: {month: string, amount: number}[] }>({ week: [], month: [], year: [] });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    type: [] as string[],
    status: [] as string[],
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month' | 'year'
  });

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await api.get('/earnings/expert');
        const { stats: s = {}, monthlyBreakdown: mb = [], breakdowns: bd, transactions: tx = [] } = resp.data || {};
        setStats({
          thisMonth: s.thisMonth ?? 0,
          lastMonth: s.lastMonth ?? 0,
          thisYear: s.total ?? 0,
          pending: s.pending ?? 0,
          available: s.available ?? 0
        });
        const monthArr = Array.isArray(mb) ? mb : [];
        setBreakdowns({
          week: Array.isArray(bd?.week) ? bd.week : [],
          month: Array.isArray(bd?.month) ? bd.month : monthArr,
          year: Array.isArray(bd?.year) ? bd.year : monthArr,
        });
        setTransactions(Array.isArray(tx) ? tx : []);
      } catch (err) {
        console.error('Failed to fetch earnings', err);
        setError('Could not load your earnings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  const handleExport = () => {
    const dataToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;
    const headers = ['Date', 'Client', 'Type', 'Amount', 'Status'];
    // Escape each field for CSV: wrap in quotes and double any embedded quotes,
    // so values like "Acme, Inc." don't break column alignment.
    const escapeCsv = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = dataToExport.map(tx => [
      tx.date,
      tx.client,
      tx.type,
      tx.amount,
      tx.status
    ].map(escapeCsv));

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.map(escapeCsv).join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `earnings_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWithdraw = () => {
    if (stats.available <= 0) {
      alert("No funds available for withdrawal.");
      return;
    }
    alert(`Withdrawal request for $${stats.available.toLocaleString()} has been submitted. Funds will be transferred to your registered account within 3-5 business days.`);
  };

  const percentageChange = stats.lastMonth > 0
    ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
    : (stats.thisMonth > 0 ? 100 : 0);

  const isWithinDateRange = (dateStr: string, range: typeof selectedFilters.dateRange) => {
    if (range === 'all') return true;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return true; // don't hide rows with unparseable dates
    const now = new Date();
    switch (range) {
      case 'today':
        return d.toDateString() === now.toDateString();
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      case 'month':
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      case 'year':
        return d.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const typeMatch = selectedFilters.type.length === 0 || selectedFilters.type.includes(tx.type);
    const statusMatch = selectedFilters.status.length === 0 || selectedFilters.status.includes(tx.status);
    const dateMatch = isWithinDateRange(tx.date, selectedFilters.dateRange);
    return typeMatch && statusMatch && dateMatch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return Video;
      case 'course': return FileText;
      case 'content': return FileText;
      case 'live-event': return Users;
      default: return DollarSign;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'bg-blue-100 text-blue-700';
      case 'course': return 'bg-purple-100 text-purple-700';
      case 'content': return 'bg-green-100 text-green-700';
      case 'live-event': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-yellow-100 text-yellow-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleFilter = (category: 'type' | 'status', value: string) => {
    setSelectedFilters(prev => {
      const currentValues = prev[category];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [category]: newValues };
    });
  };

  const clearFilters = () => {
    setSelectedFilters({
      type: [],
      status: [],
      dateRange: 'all'
    });
  };

  const hasActiveFilters = selectedFilters.type.length > 0 || selectedFilters.status.length > 0 || selectedFilters.dateRange !== 'all';

  const chartData = breakdowns[selectedPeriod] || [];
  // Tallest bar drives the scale. Guard with a floor of 1 so an all-zero (or
  // empty) dataset never divides by zero.
  const maxChartAmount = Math.max(...chartData.map(m => m.amount), 1);
  const CHART_BODY_PX = 224; // fixed pixel height of the bar track
  // Only show the bar chart once there's real revenue; otherwise the "chart" is
  // just an empty track. In that case we fill the space with a month calendar.
  const hasEarnings = chartData.some(m => m.amount > 0);
  const calNow = new Date();
  const calYear = calNow.getFullYear();
  const calMonth = calNow.getMonth();
  const calToday = calNow.getDate();
  const calFirstWeekday = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calLabel = calNow.toLocaleString('default', { month: 'long', year: 'numeric' });
  const calCells: (number | null)[] = [
    ...Array(calFirstWeekday).fill(null),
    ...Array.from({ length: calDaysInMonth }, (_, i) => i + 1),
  ];

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <DollarSign className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-700 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // iOS ships fully free with no in-app monetization, so there are no earnings or
  // payouts/withdrawals here — show a neutral state instead of any money surface
  // (Apple Guideline 3.1.1).
  if (Capacitor.getPlatform() === 'ios') {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-md mx-auto mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings</h2>
          <p className="text-gray-500">Earnings and payouts aren't available in the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            Earnings
          </h1>
          <p className="text-gray-600 mt-1">Track your revenue and transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`relative px-4 py-2 border rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 ${
              hasActiveFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {hasActiveFilters && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {selectedFilters.type.length + selectedFilters.status.length + (selectedFilters.dateRange !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filter Modal/Dropdown */}
      {isFilterOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setIsFilterOpen(false)}
          />
          
          {/* Filter Panel - Mobile: Full screen modal, Desktop: Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed lg:absolute top-0 lg:top-auto right-0 lg:right-4 lg:left-auto left-0 bottom-0 lg:bottom-auto lg:mt-2 bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl z-50 lg:w-96 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">Filter Transactions</h3>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-6 space-y-6 max-h-[calc(100vh-140px)] lg:max-h-96 overflow-y-auto">
              {/* Transaction Type */}
              <div>
                <h4 className="font-bold text-sm text-gray-900 mb-3">Transaction Type</h4>
                <div className="space-y-2">
                  {[
                    { value: 'consultation', label: 'Consultation', icon: Video, color: 'blue' },
                    { value: 'course', label: 'Course', icon: FileText, color: 'purple' },
                    { value: 'content', label: 'Content', icon: FileText, color: 'green' },
                    { value: 'live-event', label: 'Live Event', icon: Users, color: 'orange' }
                  ].map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      onClick={() => toggleFilter('type', value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        selectedFilters.type.includes(value)
                          ? FILTER_COLOR_CLASSES[color].selected
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${FILTER_COLOR_CLASSES[color].iconBg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${FILTER_COLOR_CLASSES[color].iconText}`} />
                      </div>
                      <span className="flex-1 text-left font-medium">{label}</span>
                      {selectedFilters.type.includes(value) && (
                        <CheckCircle className={`w-5 h-5 ${FILTER_COLOR_CLASSES[color].check}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="font-bold text-sm text-gray-900 mb-3">Status</h4>
                <div className="space-y-2">
                  {[
                    { value: 'completed', label: 'Completed', color: 'green' },
                    { value: 'processing', label: 'Processing', color: 'yellow' },
                    { value: 'pending', label: 'Pending', color: 'orange' }
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => toggleFilter('status', value)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        selectedFilters.status.includes(value)
                          ? FILTER_COLOR_CLASSES[color].selected
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      {selectedFilters.status.includes(value) && (
                        <CheckCircle className={`w-5 h-5 ${FILTER_COLOR_CLASSES[color].check}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <h4 className="font-bold text-sm text-gray-900 mb-3">Date Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                    { value: 'year', label: 'This Year' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedFilters(prev => ({ ...prev, dateRange: value as any }))}
                      className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                        selectedFilters.dateRange === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-white transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 px-4 py-3 rounded-lg font-bold text-white transition-colors"
                style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm mb-1">This Month</p>
              <h2 className="text-3xl font-bold">${stats.thisMonth.toLocaleString()}</h2>
            </div>
            <DollarSign className="w-12 h-12 text-white/40" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            {percentageChange >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>+{percentageChange}% from last month</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4" />
                <span>{percentageChange}% from last month</span>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-blue-500" />
            <ArrowUpRight className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold mb-1 text-gray-900">${stats.lastMonth.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Last Month</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <div className="text-2xl font-bold mb-1 text-gray-900">${stats.pending.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-2xl font-bold mb-1 text-gray-900">${stats.available.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Available to Withdraw</div>
        </motion.div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Earnings Overview</h2>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === 'year' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Year
            </button>
          </div>
        </div>

        {/* Simple Bar Chart */}
        {hasEarnings ? (
          <div className="flex items-end justify-between gap-1 sm:gap-4 mt-6">
            {chartData.map((item, idx) => {
              // Explicit pixel height against a fixed-height track — percentage
              // heights don't resolve reliably inside a flex parent, which left
              // the bars collapsed to zero. Give any non-zero amount a 4px floor
              // so tiny values still show a sliver.
              const barPx = item.amount > 0
                ? Math.max(Math.round((item.amount / maxChartAmount) * CHART_BODY_PX), 4)
                : 0;
              return (
                <div key={idx} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: CHART_BODY_PX }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: barPx }}
                      transition={{ delay: idx * 0.05, duration: 0.5 }}
                      className="w-full max-w-[48px] bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg relative group cursor-pointer hover:from-green-600 hover:to-emerald-500 transition-colors"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        ${item.amount.toLocaleString()}
                      </div>
                    </motion.div>
                  </div>
                  <span className="text-[10px] sm:text-sm text-gray-600 font-medium truncate max-w-full">{item.month}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Month calendar */}
            <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-5 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900">{calLabel}</h3>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-[11px] font-bold text-gray-400 uppercase py-1">{d}</div>
                ))}
                {calCells.map((day, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg ${
                      day === null ? ''
                        : day === calToday
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white font-bold shadow-sm'
                          : 'text-gray-700 hover:bg-white'
                    }`}
                  >
                    {day || ''}
                  </div>
                ))}
              </div>
            </div>
            {/* Empty-state note */}
            <div className="border border-gray-100 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="font-bold text-gray-800">No earnings yet</p>
              <p className="text-sm text-gray-500 mt-1">Your revenue will chart here once you complete paid sessions or events.</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredTransactions.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>{transactions.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}</p>
            </div>
          )}
          {filteredTransactions.map((transaction, idx) => {
            const Icon = getTypeIcon(transaction.type);
            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl ${getTypeColor(transaction.type)} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1 truncate">{transaction.client}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm text-gray-500">{transaction.date}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">+${Number(transaction.amount || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-500 capitalize">{transaction.type}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Payout Section */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold mb-2">Ready to withdraw?</h3>
            <p className="text-white/80 text-sm">You have ${stats.available.toLocaleString()} available in your account</p>
          </div>
          <button 
            onClick={handleWithdraw}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Withdraw Funds
          </button>
        </div>
      </div>
    </div>
  );
}