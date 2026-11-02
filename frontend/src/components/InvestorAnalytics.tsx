import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

import {
  TrendingUp,
  TrendingDown,
  Download,
  Settings,
  FileText,
  Users,
  Target,
  MessageCircle,
  Calendar,
  Lock,
  X,
  Eye,
  Plus,
  Sparkles,
  AlertCircle,
  Activity,
  Clock,
  CheckCircle,
  ArrowRight,
  Filter,
  ChevronDown,
  Zap,
  BarChart3,
  PieChart,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { brandColors } from '../utils/colors';
import { getInvestorPipeline, getInvestorPortfolio, getInvestorDiscovery } from '../services/investorService';
import { getNotifications } from '../services/notificationService';
import { getCurrentUser } from '../services/authService';

export function InvestorAnalytics({ onNavigateToAI, onBack }: { onNavigateToAI?: () => void; onBack?: () => void }) {
  const [dateRange, setDateRange] = useState('last30days');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showCreateSearchModal, setShowCreateSearchModal] = useState(false);
  const [portfolioView, setPortfolioView] = useState('investments');
  const [selectedSearchForView, setSelectedSearchForView] = useState<any | null>(null);
  const [editingSearchId, setEditingSearchId] = useState<string | null>(null);
  const [editingSearchName, setEditingSearchName] = useState('');
  const [savedStartupIds, setSavedStartupIds] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState('all');
  const [activeIntelligenceTab, setActiveIntelligenceTab] = useState('trends');

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, any[]>>({});
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [discoveredStartups, setDiscoveredStartups] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);

  // Modal States
  const [searchForm, setSearchForm] = useState({
    name: '',
    icon: '📁',
    industries: [] as string[],
    stages: [] as string[],
    minAmount: '',
    maxAmount: '',
    minAiScore: 75,
    location: [] as string[],
    notifications: true
  });

  const [exportConfig, setExportConfig] = useState({
    type: 'summary',
    formats: ['pdf'] as string[],
    include: ['charts', 'tables', 'ai'] as string[]
  });

  const handleCreateSearch = () => {
    if (!searchForm.name) {
      alert('Please enter a search name');
      return;
    }
    // Actually add it to the list (was previously discarded with a fake toast).
    setSavedSearches((prev) => [
      ...prev,
      { id: `${prev.length + 1}-${searchForm.name}`, ...searchForm },
    ]);
    setShowCreateSearchModal(false);
    setSearchForm({
      name: '', icon: '📁', industries: [], stages: [],
      minAmount: '', maxAmount: '', minAiScore: 75, location: [], notifications: true,
    });
  };

  const startEditingSearch = (search: any) => {
    setEditingSearchId(String(search.id));
    setEditingSearchName(search.name || '');
  };

  const commitEditingSearch = () => {
    if (!editingSearchId) return;
    const trimmed = editingSearchName.trim();
    if (trimmed) {
      setSavedSearches((prev) =>
        prev.map((s) => (String(s.id) === editingSearchId ? { ...s, name: trimmed } : s))
      );
    }
    setEditingSearchId(null);
    setEditingSearchName('');
  };

  const cancelEditingSearch = () => {
    setEditingSearchId(null);
    setEditingSearchName('');
  };

  const handleExport = async () => {
    console.log('Exporting report:', exportConfig);
    
    try {
      const element = document.getElementById('analytics-content');
      if (!element) {
        throw new Error('Could not find analytics content element');
      }

      if (exportConfig.formats.includes('pdf')) {
        // Simple alert to show progress
        console.log('Canvas generation started...');
        
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#F9FAFB',
          logging: true, // Enable logging for debugging
          onclone: (clonedDoc: Document) => {
            // Ensure any modals/overlays are hidden in the export
            const modals = clonedDoc.querySelectorAll('.fixed.inset-0');
            modals.forEach((m: any) => m.style.display = 'none');
          }
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`investor-analytics-${exportConfig.type}-${new Date().toISOString().split('T')[0]}.pdf`);
      }

      if (exportConfig.formats.includes('csv')) {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Metric,Value\n";
        csvContent += `Total Deals Reviewed,${totalDealsReviewed}\n`;
        csvContent += `Active Pipeline,${activePipelineCount}\n`;
        csvContent += `Invested,${investedCount}\n`;
        csvContent += `Conversion Rate,${overallConversionRate.toFixed(2)}%\n`;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `investor-analytics-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShowExportModal(false);
      alert('Report generated and downloaded successfully!');
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`Report Generation Failed: ${error.message || 'Unknown error'}. Please try selecting CSV if PDF continues to fail.`);
    }
  };

  const toggleListItem = (list: string[], item: string) => {
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);

        const user = getCurrentUser();
        if (user?.role !== 'investor') {
          console.log('Skipping investor API calls for role:', user?.role);
          setAnalyticsLoading(false);
          return;
        }

        const [pipelineData, portfolioData, discoveryData, notificationData] = await Promise.all([
          getInvestorPipeline(),
          getInvestorPortfolio(),
          getInvestorDiscovery(),
          getNotifications().catch(() => []) // fail gracefully
        ]);
        if (cancelled) return;
        setPipeline(pipelineData || {});
        setPortfolio(Array.isArray(portfolioData) ? portfolioData : []);
        setDiscoveredStartups(Array.isArray(discoveryData) ? discoveryData : []);
        setNotifications(Array.isArray(notificationData) ? notificationData : []);
      } catch (e: any) {
        if (cancelled) return;
        // Suppress "Not Authorized" error for demo purposes when accessed by other roles
        if (e?.response?.status === 403) {
          console.warn('Backend returned 403 - using demo data fallback');
          setAnalyticsLoading(false);
          return;
        }
        setAnalyticsError(e?.response?.data?.message || e?.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [dateRange, refreshKey]);

  const allPipelineStartups = useMemo(() => {
    const entries = Object.values(pipeline || {}).flat();
    const byId = new Map<string, any>();
    entries.forEach((s: any) => {
      const id = String(s?.id || s?._id || '');
      if (!id) return;
      if (!byId.has(id)) byId.set(id, s);
    });
    return Array.from(byId.values());
  }, [pipeline]);

  const allStartupsForScoring = useMemo(() => {
    const byId = new Map<string, any>();
    [...allPipelineStartups, ...(portfolio || [])].forEach((s: any) => {
      const id = String(s?.id || s?._id || '');
      if (!id) return;
      if (!byId.has(id)) byId.set(id, s);
    });
    return Array.from(byId.values());
  }, [allPipelineStartups, portfolio]);

  const avgAiScore = useMemo(() => {
    const scores = allStartupsForScoring
      .map((s: any) => Number(s?.aiScore ?? s?.ai_score ?? 0))
      .filter((n: number) => Number.isFinite(n));
    if (!scores.length) return 0;
    return scores.reduce((acc: number, n: number) => acc + n, 0) / scores.length;
  }, [allStartupsForScoring]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '0-20', min: 0, max: 20, color: 'bg-red-500' },
      { range: '21-40', min: 21, max: 40, color: 'bg-orange-500' },
      { range: '41-60', min: 41, max: 60, color: 'bg-yellow-500' },
      { range: '61-80', min: 61, max: 80, color: 'bg-lime-500' },
      { range: '81-100', min: 81, max: 100, color: 'bg-green-500' }
    ];
    const counts = buckets.map((b) => ({ range: b.range, count: 0, color: b.color }));
    allStartupsForScoring.forEach((s: any) => {
      const raw = Number(s?.aiScore ?? s?.ai_score ?? 0);
      const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      const idx = score <= 20 ? 0 : score <= 40 ? 1 : score <= 60 ? 2 : score <= 80 ? 3 : 4;
      counts[idx].count += 1;
    });
    return counts;
  }, [allStartupsForScoring]);

  const funnelData = useMemo(() => {
    const interestedNum = (pipeline?.interested || []).length;
    const underReviewNum = (pipeline?.underReview || []).length;
    const negotiatingNum = (pipeline?.negotiating || []).length;
    const investedNum = (pipeline?.invested || []).length;

    const interested = interestedNum;
    const underReview = underReviewNum;
    const negotiating = negotiatingNum;
    const invested = investedNum;

    const stages = [
      { stage: 'Interested', count: interested },
      { stage: 'Under Review', count: underReview },
      { stage: 'Negotiating', count: negotiating },
      { stage: 'Invested', count: invested }
    ];

    const max = Math.max(...stages.map((s) => s.count), 1);
    return stages
      .filter((s) => s.count > 0)
      .map((s, idx) => {
        const prev = idx > 0 ? stages[idx - 1].count : null;
        const conversion = prev ? Math.round((s.count / prev) * 1000) / 10 : null;
        return {
          ...s,
          percentage: Math.max(20, Math.round((s.count / max) * 100)),
          conversion
        };
      });
  }, [pipeline]);

  const conversionMetrics = [
    { from: 'Review to Meeting', rate: 0, trend: 0, color: 'bg-blue-500' },
    { from: 'Meeting to Term Sheet', rate: 0, trend: 0, color: 'bg-orange-500' },
    { from: 'Term Sheet to Invested', rate: 0, trend: 0, color: 'bg-green-500' },
  ];
  const activities = notifications.length > 0 ? notifications.slice(0, 5).map(n => ({
    id: n.id || n._id,
    title: n.title,
    subtitle: n.message,
    time: new Date(n.createdAt).toLocaleDateString(),
    icon: n.type === 'message' ? MessageCircle : (n.type === 'meeting' ? Calendar : Activity),
    color: 'text-blue-500'
  })) : [
    { id: 'empty', title: 'No recent activity', subtitle: 'You will see new updates here.', time: '', icon: Activity, color: 'text-gray-400' }
  ];
  // Build AI insights dynamically from real pipeline data
  const aiInsights = useMemo(() => {
    const interested = pipeline?.interested || [];
    const negotiating = pipeline?.negotiating || [];
    const insights: any[] = [];

    // Insight 1: top pipeline startups by AI score
    const topStartups = [...allPipelineStartups]
      .filter(s => s.aiScore)
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
      .slice(0, 3);
    if (topStartups.length > 0) {
      insights.push({
        title: 'Top Scored Startups',
        description: `Your ${topStartups.length} highest-scoring startups by Ignisha AI.`,
        icon: '🔍',
        borderColor: 'border-blue-500',
        action: 'View Comparison',
        actionTarget: 'discovery',
        startups: topStartups.map(s => ({ name: s.name, score: s.aiScore, id: s.id || s._id, founderId: s.founder?._id || s.founder?.id || s.founder }))
      });
    }

    // Insight 2: Negotiating startups needing follow-up
    if (negotiating.length > 0) {
      insights.push({
        title: 'Action Required',
        description: `${negotiating.length} startup${negotiating.length > 1 ? 's' : ''} in negotiation stage need${negotiating.length === 1 ? 's' : ''} your attention.`,
        icon: '⚠️',
        borderColor: 'border-orange-500',
        action: 'Follow Up',
        actionTarget: 'messages',
        stats: negotiating.slice(0, 3).map(s => `${s.name} — ${s.investorStage || 'Negotiating'}`)
      });
    }

    // Insight 3: Startups in interested bucket to review
    if (interested.length > 0) {
      insights.push({
        title: 'Pending Review',
        description: `${interested.length} startup${interested.length > 1 ? 's are' : ' is'} waiting for your review.`,
        icon: '📈',
        borderColor: 'border-green-500',
        action: 'Explore Startups',
        actionTarget: 'discovery',
        items: interested.slice(0, 3).map(s => `${s.name} — ${(s.industry || []).join(', ') || 'Various'}`)
      });
    }

    // Fallback if no real data yet
    if (insights.length === 0) {
      insights.push({
        title: 'No Insights Yet',
        description: 'Add startups to your pipeline to see AI-powered insights here.',
        icon: '✨',
        borderColor: 'border-gray-300',
        action: 'Explore Startups',
        actionTarget: 'discovery',
        items: ['Discover startups on the Funding Portal', 'Add them to your pipeline', 'Get AI insights instantly']
      });
    }

    return insights;
  }, [pipeline, allPipelineStartups]);
  const industryTrends: any[] = [];

  const totalDealsReviewed = allPipelineStartups.length;
  const activePipelineNum = (pipeline?.interested || []).length + (pipeline?.underReview || []).length + (pipeline?.negotiating || []).length;
  const activePipelineCount = activePipelineNum;
  const investedNum = (pipeline?.invested || []).length;
  const investedCount = investedNum;
  const overallConversionRate = activePipelineCount > 0 ? (investedCount / (activePipelineCount + investedCount)) * 100 : 0;

  const totalScoredStartups = Math.max(allStartupsForScoring.length, 1);

  const sparklineHeights = useMemo(() => {
    const series = [
      (pipeline?.interested || []).length,
      (pipeline?.underReview || []).length,
      (pipeline?.negotiating || []).length,
      (pipeline?.invested || []).length
    ];
    const padded = [...series, 0, 0, 0].slice(0, 7);
    const max = Math.max(...padded, 1);
    return padded.map((n) => Math.round((n / max) * 100));
  }, [pipeline]);

  const kpiData = {
    dealsReviewed: { value: totalDealsReviewed, trend: 0, previous: 0 },
    activePipeline: {
      value: activePipelineCount + investedCount,
      interested: (pipeline?.interested || []).length,
      underReview: (pipeline?.underReview || []).length,
      negotiating: (pipeline?.negotiating || []).length
    },
    connections: { value: 0, messages: 0, meetings: 0 },
    qualityScore: { value: Math.max(Math.round((avgAiScore / 10) * 10) / 10, 0), max: 10 }
  };

  return (
    <div id="analytics-content" className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Left Section */}
            <div>
              <button
                type="button"
                onClick={() => { if (onBack) onBack(); else window.location.hash = '#investor-dashboard'; }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 mb-3 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                  style={{ background: `${brandColors.electricBlue}15` }}>
                  📊
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Investment Analytics</h1>
                </div>
              </div>
              <p className="text-gray-600">Track your deal flow, portfolio performance, and platform activity</p>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="relative">
                <select name="select-869919"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                  <option value="lastquarter">Last Quarter</option>
                  <option value="lastyear">Last Year</option>
                  <option value="alltime">All Time</option>
                  <option value="custom">Custom Range</option>
                </select>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Export Button — hidden on iOS: file export/download is not
                  supported in the iOS WebView and would do nothing (Apple 2.1). */}
              {Capacitor.getPlatform() !== 'ios' && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-4 py-2.5 border-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
                  style={{ borderColor: brandColors.electricBlue, color: brandColors.electricBlue }}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export Report</span>
                </button>
              )}

              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>

                {showSettingsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-30"
                  >
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-gray-700 pb-2 border-b">Analytics Preferences</div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input name="input-cc4437" type="checkbox" className="rounded" defaultChecked />
                        <span>Show KPI Cards</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input name="input-3aa052" type="checkbox" className="rounded" defaultChecked />
                        <span>Show Deal Flow Funnel</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input name="input-c84bc5" type="checkbox" className="rounded" defaultChecked />
                        <span>Show AI Insights</span>
                      </label>
                      <div className="pt-2 border-t">
                        <div className="text-xs text-gray-500 mb-2">Email Digest</div>
                        <select name="select-3098e7" className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                          <option>Daily</option>
                          <option>Weekly</option>
                          <option>Monthly</option>
                          <option>Never</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {analyticsError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {analyticsError}
          </div>
        )}
        {analyticsLoading && (
          <div className="p-4 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 text-sm">
            Loading analytics...
          </div>
        )}

        {/* Section 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Deals Reviewed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: `${brandColors.electricBlue}15` }}>
                <FileText className="w-6 h-6" style={{ color: brandColors.electricBlue }} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{kpiData.dealsReviewed.value}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-3">Startups Reviewed</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="font-bold">+{kpiData.dealsReviewed.trend}%</span>
              </div>
              <div className="text-xs text-gray-500">vs last period</div>
            </div>
            <div className="mt-3 h-8 flex items-end gap-0.5">
              {sparklineHeights.map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{ height: `${height}%`, background: brandColors.electricBlue }}
                />
              ))}
            </div>
          </motion.div>

          {/* Card 2: Active Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: `${brandColors.atomicOrange}15` }}>
                <Target className="w-6 h-6" style={{ color: brandColors.atomicOrange }} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{kpiData.activePipeline.value}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-3">In Active Pipeline</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Interested: {kpiData.activePipeline.interested}</span>
                <span className="text-gray-600">Review: {kpiData.activePipeline.underReview}</span>
                <span className="text-gray-600">Nego: {kpiData.activePipeline.negotiating}</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-blue-500" style={{ width: `${kpiData.activePipeline.value > 0 ? (kpiData.activePipeline.interested / kpiData.activePipeline.value) * 100 : 0}%` }} />
                <div className="bg-yellow-500" style={{ width: `${kpiData.activePipeline.value > 0 ? (kpiData.activePipeline.underReview / kpiData.activePipeline.value) * 100 : 0}%` }} />
                <div className="bg-green-500" style={{ width: `${kpiData.activePipeline.value > 0 ? (kpiData.activePipeline.negotiating / kpiData.activePipeline.value) * 100 : 0}%` }} />
              </div>
            </div>
          </motion.div>

          {/* Card 3: Connections Made */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-900/10">
                <Users className="w-6 h-6 text-blue-900" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{kpiData.connections.value}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-3">Founder Connections</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Messages sent:</span>
                <span className="font-bold">{kpiData.connections.messages}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Meetings scheduled:</span>
                <span className="font-bold">{kpiData.connections.meetings}</span>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Investment Readiness Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{kpiData.qualityScore.value}<span className="text-lg text-gray-500">/10</span></div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">Avg Deal Quality Score</div>
            {/* Circular progress */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="transform -rotate-90 w-16 h-16">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#10b981"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(kpiData.qualityScore.value / kpiData.qualityScore.max) * 175.93} 175.93`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-600">
                  {Math.round((kpiData.qualityScore.value / kpiData.qualityScore.max) * 100)}%
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Quality improving</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Section 2: Deal Flow Analytics */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Deal Flow Funnel (2 columns) */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Deal Flow Funnel</h2>
                <p className="text-sm text-gray-500 mt-1">Last 30 Days</p>
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <Filter className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Funnel Visualization */}
            <div className="space-y-3">
              {funnelData.map((stage, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-lg py-4 px-6 transition-all hover:opacity-90 flex items-center justify-between"
                      style={{
                        width: `${stage.percentage}%`,
                        background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`,
                        minWidth: '200px'
                      }}
                    >
                      <span className="text-white font-bold">{stage.stage}</span>
                      <span className="text-white text-xl font-bold">{stage.count}</span>
                    </div>
                    {stage.conversion && (
                      <div className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        {stage.conversion}% →
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Overall Conversion Rate</div>
                  <div className="text-2xl font-bold text-gray-900">{overallConversionRate.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Industry Benchmark</div>
                  <div className="text-2xl font-bold text-gray-500">--</div>
                </div>
                <button className="px-4 py-2 rounded-lg font-medium text-white"
                  style={{ background: brandColors.electricBlue }}
                  onClick={onNavigateToAI}>
                  Improve Funnel
                </button>
              </div>
            </div>
          </div>

          {/* Conversion Metrics (1 column) */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Conversion Rates</h2>
            <div className="space-y-4">
              {conversionMetrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{metric.from}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">{metric.rate}%</span>
                      {metric.trend !== 0 && (
                        <span className={`text-xs flex items-center gap-0.5 ${metric.trend > 0 ? 'text-green-600' : metric.trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {metric.trend > 0 ? <TrendingUp className="w-3 h-3" /> : metric.trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          {Math.abs(metric.trend)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${metric.color} rounded-full transition-all`}
                      style={{ width: `${metric.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Portfolio Performance & Activity Timeline */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activity Timeline (2 columns) */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              <select name="select-6f7fdb"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Activity</option>
                <option value="dealflow">Deal Flow</option>
                <option value="meetings">Meetings</option>
                <option value="messages">Messages</option>
              </select>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 ${activity.color}`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{activity.title}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{activity.subtitle}</div>
                    <div className="text-xs text-gray-500 mt-1">{activity.time}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.hash = '#investor-dashboard'}
                    className="opacity-100 transition-opacity px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-white border border-gray-300 active:scale-95"
                  >
                    View
                  </button>
                </motion.div>
              ))}
            </div>

            <button 
              type="button"
              disabled={loadingMoreActivity}
              onClick={async () => {
                setLoadingMoreActivity(true);
                try {
                  const data = await getNotifications();
                  if (Array.isArray(data)) setNotifications(data);
                } catch (error) {
                  console.error('Failed to load more activity:', error);
                }
                setLoadingMoreActivity(false);
              }}
              className="w-full mt-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMoreActivity ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Activity'
              )}
            </button>
          </div>

          {/* AI Insights Panel (1 column) */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                Ignisha AI Insights
              </h2>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh insights"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {aiInsights.map((insight: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 border-l-4 ${insight.borderColor} bg-gray-50 rounded-lg`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">{insight.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{insight.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    </div>
                  </div>

                  {insight.startups && (
                    <div className="space-y-2 mt-3">
                      {insight.startups.map((startup: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                          <span className="font-medium text-gray-900">{startup.name}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                            {startup.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {insight.items && (
                    <ul className="space-y-1.5 mt-3">
                      {insight.items.map((item: any, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {insight.stats && (
                    <ul className="space-y-1.5 mt-3">
                      {insight.stats.map((stat: any, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{stat}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button 
                    type="button"
                    className="mt-3 w-full py-2 px-4 rounded-lg font-medium text-white text-sm active:scale-95 transition-all"
                    style={{ background: brandColors.electricBlue }}
                    onClick={() => {
                      // 'messages' had a broken querySelector hack ([data-nav] doesn't
                      // exist). Route AI insights via the parent callback; others to the
                      // funding portal hash.
                      if (insight.actionTarget === 'ai') {
                        onNavigateToAI?.();
                      } else {
                        window.location.hash = '#funding-portal-investor';
                      }
                    }}
                  >
                    {insight.action}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Deal Quality Analysis */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Deal Quality Distribution</h2>
            <p className="text-sm text-gray-500 mt-1">Based on Ignisha AI Scoring</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Score Distribution Chart */}
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 rounded-full">
                  <span className="text-sm text-gray-600">Average Score:</span>
                  <span className="text-3xl font-bold" style={{ color: brandColors.electricBlue }}>{Math.round(avgAiScore)}/100</span>
                </div>
              </div>

              <div className="space-y-3">
                {scoreDistribution.map((range, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{range.range}</span>
                      <span className="text-gray-900 font-bold">{range.count} startups</span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(range.count / totalScoredStartups) * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={`h-full ${range.color} flex items-center justify-end pr-3`}
                      >
                        {range.count > 5 && (
                          <span className="text-xs font-bold text-white">{range.count}</span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span>Low (0-40)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span>Medium (41-60)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-lime-500 rounded-full" />
                    <span>Good (61-80)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span>Excellent (81-100)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Components Radar Chart Placeholder */}
            <div className="flex items-center justify-center">
              <div className="relative w-80 h-80">
                {/* Simplified radar chart representation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Center point */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full z-10" />
                    
                    {/* Axes */}
                    {['Team Quality', 'Market Size', 'Traction', 'PMF', 'Financial', 'Growth'].map((label, i) => {
                      const angle = (i * 60 - 90) * (Math.PI / 180);
                      // Labels sit just inside the 45% axis tips so wide labels
                      // (e.g. "Market Size") don't overflow/clip the chart box.
                      const x = 50 + 38 * Math.cos(angle);
                      const y = 50 + 38 * Math.sin(angle);
                      
                      return (
                        <div key={i}>
                          {/* Axis line */}
                          <div
                            className="absolute top-1/2 left-1/2 w-0.5 bg-gray-200 origin-left"
                            style={{
                              height: '45%',
                              transform: `rotate(${i * 60}deg)`,
                              transformOrigin: '0 0'
                            }}
                          />
                          {/* Label */}
                          <div
                            className="absolute text-xs font-medium text-gray-700 whitespace-nowrap"
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    })}

                    {/* Data polygon - Portfolio Average */}
                    <svg className="absolute inset-0 w-full h-full">
                      <polygon
                        points="160,60 220,120 200,200 160,220 100,200 80,120"
                        fill={brandColors.electricBlue}
                        fillOpacity="0.2"
                        stroke={brandColors.electricBlue}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Engagement Metrics */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Response Rate */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">92%</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">Response Rate</div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Avg response time:</span>
                <span className="font-bold">4.2h</span>
              </div>
              <div className="flex justify-between">
                <span>Messages sent:</span>
                <span className="font-bold">128</span>
              </div>
              <div className="flex justify-between">
                <span>Replies received:</span>
                <span className="font-bold">118</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>No data yet</span>
              </div>
            </div>
          </div>

          {/* Meeting Conversion */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">18.5%</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">Meeting → Investment</div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Meetings held:</span>
                <span className="font-bold">42</span>
              </div>
              <div className="flex justify-between">
                <span>Led to investments:</span>
                <span className="font-bold">8</span>
              </div>
              <div className="flex justify-between">
                <span>Avg meetings per deal:</span>
                <span className="font-bold">3.5</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Requested:</span>
                  <span className="font-bold">0</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Held:</span>
                  <span className="font-bold">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">452</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">Platform Actions This Month</div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Profile views:</span>
                <span className="font-bold">284</span>
              </div>
              <div className="flex justify-between">
                <span>Messages:</span>
                <span className="font-bold">128</span>
              </div>
              <div className="flex justify-between">
                <span>Pipeline updates:</span>
                <span className="font-bold">40</span>
              </div>
            </div>
            <div className="mt-4 h-16">
              <div className="flex items-end gap-1 h-full">
                {[40, 25, 45, 30, 60, 55, 70, 65, 80, 75, 90, 85, 95, 100].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-green-500 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Industry Intelligence */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Market Intelligence</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  Powered by Ignisha AI
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveIntelligenceTab('trends')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeIntelligenceTab === 'trends'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Industry Trends
              </button>
              {Capacitor.getPlatform() !== 'ios' && (
                <button
                  onClick={() => setActiveIntelligenceTab('funding')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeIntelligenceTab === 'funding'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Funding Activity
                </button>
              )}
              {Capacitor.getPlatform() !== 'ios' && (
                <button
                  onClick={() => setActiveIntelligenceTab('competitor')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeIntelligenceTab === 'competitor'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Competitor Analysis
                </button>
              )}
            </div>
          </div>

          {activeIntelligenceTab === 'trends' && (
            <div className="grid lg:grid-cols-2 gap-8 py-6">
              {/* Trends List */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 mb-2">High Growth Industries</h3>
                {industryTrends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{trend.name}</span>
                        <span className="text-green-600 font-bold">+{trend.growth}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(trend.value / 1000) * 100}%` }}
                          className={`h-full ${trend.color} rounded-full`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* AI Market Sentiment */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  AI Market Outlook
                </h3>
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-xs text-gray-500 mb-1">Sentiment Score</div>
                    <div className="text-xl font-bold text-blue-600">Neutral (50/100)</div>
                  </div>
                  <p className="text-sm text-gray-600 italic">
                    "Add startups to your pipeline to see AI-powered market insights and sentiment analysis based on your portfolio focus."
                  </p>
                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700">
                    Read Full Market Insight →
                  </button>
                </div>
              </div>
            </div>
          )}

          {Capacitor.getPlatform() !== 'ios' && activeIntelligenceTab === 'funding' && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Funding activity heatmap and analysis coming soon</p>
            </div>
          )}

          {Capacitor.getPlatform() !== 'ios' && activeIntelligenceTab === 'competitor' && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Competitor analysis and co-investment insights coming soon</p>
            </div>
          )}
        </div>

        {/* Section 7: Saved Lists & Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Saved Searches & Lists</h2>
            <button 
              onClick={() => setShowCreateSearchModal(true)}
              className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2"
              style={{ background: brandColors.electricBlue }}>
              <Plus className="w-4 h-4" />
              Create New Search
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {savedSearches.map((search) => (
              <motion.div
                key={search.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{search.icon}</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                    {search.count}
                  </span>
                </div>
                {editingSearchId === String(search.id) ? (
                  <input
                    name={`edit-search-${search.id}`}
                    type="text"
                    autoFocus
                    value={editingSearchName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingSearchName(e.target.value)}
                    onBlur={commitEditingSearch}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') commitEditingSearch();
                      if (e.key === 'Escape') cancelEditingSearch();
                    }}
                    className="w-full mb-1 px-2 py-1 border border-blue-400 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <h3 className="font-bold text-gray-900 mb-1">{search.name}</h3>
                )}
                <p className="text-xs text-gray-500 mb-2">Last updated: {search.updated}</p>
                <p className="text-xs text-gray-600 mb-3">{search.filters}</p>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSearchForView(search);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
                    style={{ background: brandColors.electricBlue }}>
                    View
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editingSearchId === String(search.id)) {
                        commitEditingSearch();
                      } else {
                        startEditingSearch(search);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-95">
                    {editingSearchId === String(search.id) ? 'Save' : 'Edit'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Export Analytics Report</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Report Type</label>
                <div className="space-y-2">
                  <label 
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      exportConfig.type === 'summary' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setExportConfig({ ...exportConfig, type: 'summary' })}
                  >
                    <input 
                      type="radio" 
                      name="reportType" 
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                      checked={exportConfig.type === 'summary'} 
                      readOnly
                    />
                    <div>
                      <div className="font-bold text-gray-900">Summary Report</div>
                      <div className="text-xs text-gray-600">1-page overview of key metrics</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="reportType" 
                      checked={exportConfig.type === 'detailed'} 
                      onChange={() => setExportConfig({ ...exportConfig, type: 'detailed' })}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Detailed Report</div>
                      <div className="text-xs text-gray-600">All sections with full data</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="reportType" 
                      checked={exportConfig.type === 'custom'} 
                      onChange={() => setExportConfig({ ...exportConfig, type: 'custom' })}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Custom Report</div>
                      <div className="text-xs text-gray-600">Select specific sections</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Export Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {['pdf', 'excel', 'csv'].map((format) => (
                    <label key={format} className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input name="input-bbfe05" 
                        type="checkbox" 
                        checked={exportConfig.formats.includes(format)}
                        onChange={() => setExportConfig({ ...exportConfig, formats: toggleListItem(exportConfig.formats, format) })}
                      />
                      <span className="text-sm font-medium uppercase">{format}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Include Options */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Include in Report</label>
                <div className="space-y-2">
                  {[
                    { id: 'charts', label: 'Charts & visualizations' },
                    { id: 'tables', label: 'Raw data tables' },
                    { id: 'ai', label: 'AI insights' },
                    { id: 'portfolio', label: 'Portfolio details' },
                    { id: 'activity', label: 'Activity log' }
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input name="input-2f0d18" 
                        type="checkbox" 
                        checked={exportConfig.include.includes(option.id)}
                        onChange={() => setExportConfig({ ...exportConfig, include: toggleListItem(exportConfig.include, option.id) })}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Generating report...');
                  handleExport();
                }}
                className="flex-[2] py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: brandColors.electricBlue }}
              >
                <Zap className="w-5 h-5" />
                Generate Report
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Search Modal */}
      {showCreateSearchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create New Saved Search</h2>
              <p className="text-sm text-gray-600 mt-1">Define your criteria to quickly find relevant startups</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Search Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Search Name <span className="text-red-500">*</span>
                </label>
                <input name="input-c83749"
                  type="text"
                  placeholder="e.g., FinTech Seed Deals"
                  value={searchForm.name}
                  onChange={(e) => setSearchForm({ ...searchForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Choose Icon</label>
                <div className="grid grid-cols-8 gap-2">
                  {['📁', '⭐', '🎯', '🔥', '💼', '🚀', '💎', '⚡'].map((icon, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchForm({ ...searchForm, icon })}
                      className={`aspect-square text-2xl border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                        searchForm.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Industry</label>
                <div className="flex flex-wrap gap-2">
                  {['AI/ML', 'FinTech', 'HealthTech', 'SaaS', 'E-commerce', 'EdTech', 'ClimateTech', 'Web3'].map((industry, i) => (
                    <label key={i} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input name="input-96cf98" 
                        type="checkbox" 
                        className="rounded" 
                        checked={searchForm.industries.includes(industry)}
                        onChange={() => setSearchForm({ ...searchForm, industries: toggleListItem(searchForm.industries, industry) })}
                      />
                      <span className="text-sm">{industry}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Funding Stage Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Funding Stage</label>
                <div className="flex flex-wrap gap-2">
                  {['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'].map((stage, i) => (
                    <label key={i} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input name="input-68b114" 
                        type="checkbox" 
                        className="rounded" 
                        checked={searchForm.stages.includes(stage)}
                        onChange={() => setSearchForm({ ...searchForm, stages: toggleListItem(searchForm.stages, stage) })}
                      />
                      <span className="text-sm">{stage}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Funding Amount Range */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Funding Amount Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min Amount</label>
                    <input name="input-eb7522"
                      type="text"
                      placeholder="₹1 Cr"
                      value={searchForm.minAmount}
                      onChange={(e) => setSearchForm({ ...searchForm, minAmount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Max Amount</label>
                    <input name="input-071741"
                      type="text"
                      placeholder="₹5 Cr"
                      value={searchForm.maxAmount}
                      onChange={(e) => setSearchForm({ ...searchForm, maxAmount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* AI Score Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Minimum AI Score</label>
                <div className="flex items-center gap-4">
                  <input name="input-484e49"
                    type="range"
                    min="0"
                    max="100"
                    value={searchForm.minAiScore}
                    onChange={(e) => setSearchForm({ ...searchForm, minAiScore: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-gray-900 min-w-[60px] text-center">{searchForm.minAiScore}</span>
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                <div className="flex flex-wrap gap-2">
                  {['Mumbai', 'Bangalore', 'Delhi', 'Remote', 'US', 'Singapore'].map((location, i) => (
                    <label key={i} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input name="input-753070" 
                        type="checkbox" 
                        className="rounded" 
                        checked={searchForm.location.includes(location)}
                        onChange={() => setSearchForm({ ...searchForm, location: toggleListItem(searchForm.location, location) })}
                      />
                      <span className="text-sm">{location}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="border-t border-gray-200 pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input name="input-7da300" 
                    type="checkbox" 
                    className="rounded" 
                    checked={searchForm.notifications}
                    onChange={() => setSearchForm({ ...searchForm, notifications: !searchForm.notifications })}
                  />
                  <div>
                    <div className="font-bold text-sm text-gray-900">Enable notifications</div>
                    <div className="text-xs text-gray-600">Get alerted when new startups match this search</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setShowCreateSearchModal(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSearch}
                className="px-6 py-2.5 rounded-lg font-bold text-white"
                style={{ background: brandColors.electricBlue }}
              >
                Create Search
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Search Results Modal */}
      {selectedSearchForView && (
        <div className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-3xl"
          >
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{selectedSearchForView.icon}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSearchForView.name}</h2>
                  <p className="text-sm text-gray-500">{selectedSearchForView.filters}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSearchForView(null)}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
              <div className="grid md:grid-cols-2 gap-6">
                {discoveredStartups.length > 0 ? discoveredStartups.map((startup, i) => (
                  <motion.div 
                    key={startup.id || i}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                          {startup.logo ? <img src={startup.logo} alt={startup.name} className="w-full h-full object-cover" /> : (startup.name?.substring(0, 1).toUpperCase() || 'S')}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{startup.name || 'Unknown Startup'}</h4>
                          <span className="text-xs text-gray-500 uppercase font-black tracking-widest">
                            {(startup.industry || []).join(' • ') || 'Various'} • {startup.stage || 'Any Stage'}
                          </span>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">
                        {startup.aiScore ? `${startup.aiScore}% Match` : 'New Match'}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {startup.tagline || startup.description || 'No description provided.'}
                    </p>
                    <div className="flex gap-2">
                       <button 
                         type="button"
                         onClick={() => {
                           setSelectedSearchForView(null);
                           window.location.hash = `#startup/${startup.id || startup._id}`;
                         }}
                         className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
                         style={{ background: brandColors.electricBlue }}
                       >
                         View Profile
                       </button>
                       <button 
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           const sid = `s-${selectedSearchForView.id}-${startup.id || i}`;
                           setSavedStartupIds(prev => 
                             prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
                           );
                         }}
                         className={`flex-1 py-1.5 border-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                           savedStartupIds.includes(`s-${selectedSearchForView.id}-${startup.id || i}`)
                             ? 'bg-green-50 border-green-200 text-green-700'
                             : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                         }`}
                       >
                         {savedStartupIds.includes(`s-${selectedSearchForView.id}-${startup.id || i}`) ? '✓ Saved' : 'Save'}
                       </button>
                    </div>
                  </motion.div>
                )) : (
                  <div className="col-span-2 py-12 text-center text-gray-500">
                     No matching startups found in the database.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
               <button 
                 onClick={() => setSelectedSearchForView(null)}
                 className="px-10 py-3 rounded-xl font-bold bg-gray-900 text-white hover:bg-black transition-all active:scale-95 shadow-lg"
               >
                 Close List
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}