import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, DollarSign, Users, FileText, Award, Sparkles, Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { Capacitor } from '@capacitor/core';
import { completeStage } from '../services/startupJourneyService';
import { updateStartup } from '../services/startupService';
import { analyzePitchDeck } from '../services/aiService';

interface GrowthFundraisingFlowProps {
  onBack: () => void;
  onComplete?: () => void;
  profileId?: string;
}

export function GrowthFundraisingFlow({ onBack, onComplete, profileId }: GrowthFundraisingFlowProps) {
  const [activeSection, setActiveSection] = useState('traction');

  // Traction metrics state
  const [totalUsers, setTotalUsers] = useState('');
  const [mau, setMau] = useState('');
  const [userGrowth, setUserGrowth] = useState('');
  const [churnRate, setChurnRate] = useState('');
  const [mrr, setMrr] = useState('');
  const [revenueGrowth, setRevenueGrowth] = useState('');
  const [cac, setCac] = useState('');
  const [ltv, setLtv] = useState('');

  const [showDashboard, setShowDashboard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pitch deck upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Service request modal state
  const [serviceModal, setServiceModal] = useState<{ open: boolean; service: string; price: string }>({ open: false, service: '', price: '' });
  const [serviceForm, setServiceForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceSubmitted, setServiceSubmitted] = useState(false);

  // Helper to format numbers with commas (Indian style)
  const formatWithCommas = (value: string) => {
    if (!value) return '';
    const cleanValue = value.replace(/,/g, '');
    if (isNaN(Number(cleanValue))) return value;
    return new Intl.NumberFormat('en-IN').format(Number(cleanValue));
  };

  // Helper to handle numeric input changes
  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (value === '' || /^\d+$/.test(value)) {
      setter(value);
    }
  };

  const handleProceed = async () => {
    if (profileId) {
      await completeStage(String(profileId), 'growth');
    }
    if (onComplete) onComplete();
  };

  const handleGenerateDashboard = async () => {
    setIsSaving(true);
    try {
      if (profileId) {
        const metricsData = {
          tractionMetrics: {
            totalUsers,
            mau,
            userGrowth,
            churnRate,
            mrr,
            revenueGrowth,
            cac,
            ltv,
            updatedAt: new Date().toISOString()
          }
        };
        await updateStartup(String(profileId), metricsData);
      }
      setShowDashboard(true);
    } catch (error) {
      console.error('Failed to save metrics:', error);
      setShowDashboard(true); // Still show it even if save fails locally
    } finally {
      setIsSaving(false);
    }
  };

  // Pitch deck file upload handler
  const handlePitchDeckUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);
    try {
      const result = await analyzePitchDeck(file);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Pitch deck analysis failed:', err);
      setAnalysisError(err?.response?.data?.message || err?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      // Reset file input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Service request modal handlers
  const openServiceModal = (service: string, price: string) => {
    setServiceModal({ open: true, service, price });
    setServiceForm({ name: '', email: '', phone: '', notes: '' });
    setServiceSubmitted(false);
  };

  const handleServiceSubmit = async () => {
    if (!serviceForm.name || !serviceForm.email) return;
    setServiceSubmitting(true);
    // Simulate request submission (replace with real API when available)
    await new Promise(resolve => setTimeout(resolve, 1200));
    setServiceSubmitting(false);
    setServiceSubmitted(true);
  };

  const exportAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export the PDF.');
      return;
    }

    const rows = [
      ['Total Users/Customers', totalUsers || '—'],
      ['Monthly Active Users (MAU)', mau || '—'],
      ['User Growth Rate (%)', userGrowth ? `${userGrowth}%` : '—'],
      ['Churn Rate (%)', churnRate ? `${churnRate}%` : '—'],
      ['Monthly Recurring Revenue (MRR)', mrr ? `₹${Number(mrr).toLocaleString()}` : '—'],
      ['Revenue Growth (MoM %)', revenueGrowth ? `${revenueGrowth}%` : '—'],
      ['Customer Acquisition Cost (CAC)', cac ? `₹${Number(cac).toLocaleString()}` : '—'],
      ['Lifetime Value (LTV)', ltv ? `₹${Number(ltv).toLocaleString()}` : '—'],
    ];

    const tableRows = rows.map(([label, value]) => `<tr><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">${label}</td><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;">${value}</td></tr>`).join('');

    const statsRow = [
      { label: 'Total Users', value: totalUsers ? Number(totalUsers).toLocaleString() : '0' },
      { label: 'MRR', value: mrr ? `₹${Number(mrr).toLocaleString()}` : '₹0' },
      { label: 'Avg MRR/User', value: (mrr && mau) ? `₹${Math.round(Number(mrr) / Number(mau)).toLocaleString()}` : '₹0' },
      { label: 'LTV/CAC Ratio', value: (ltv && cac) ? (Number(ltv) / Number(cac)).toFixed(1) + 'x' : '0.0x' }
    ].map(s => `
      <div style="background:#f9fafb;padding:16px;border-radius:12px;border:1px solid #e5e7eb;width:23%;">
        <div style="color:#6b7280;font-size:11px;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${s.label}</div>
        <div style="font-size:18px;font-weight:700;">${s.value}</div>
      </div>
    `).join('');

    const userHeights = [40, 55, 48, 65, 80, 75, 95];
    const revenueHeights = [30, 45, 60, 55, 75, 90, 100];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

    const userBars = userHeights.map(h => `<div style="flex:1;background:#3b82f6;height:${h}%;border-radius:2px 2px 0 0;margin:0 2px;"></div>`).join('');
    const revenueBars = revenueHeights.map(h => `<div style="flex:1;background:#10b981;height:${h}%;border-radius:2px 2px 0 0;margin:0 2px;"></div>`).join('');
    const monthLabels = months.map(m => `<span style="flex:1;text-align:center;font-size:10px;color:#9ca3af;">${m}</span>`).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Traction Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111827; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            h1 { font-size: 28px; margin-bottom: 4px; }
            h2 { font-size: 18px; margin-bottom: 16px; }
            .subtitle { color: #6b7280; margin-bottom: 32px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 32px; }
            th { text-align: left; padding: 12px 16px; background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            th:last-child { text-align: right; }
            .stats-container { display: flex; justify-content: space-between; margin-bottom: 32px; }
            .charts-container { display: flex; justify-content: space-between; gap: 24px; }
            .chart-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; width: 48%; }
            .chart-area { height: 120px; display: flex; align-items: flex-end; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
            .chart-labels { display: flex; padding-top: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
            @media print { body { padding: 20px; } .stats-container, .charts-container { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <h1>Startup Traction Report</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • NextIgnition</p>
          
          <div class="stats-container">
            ${statsRow}
          </div>

          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div class="charts-container">
            <div class="chart-box">
              <h2 style="font-size:14px;margin-bottom:20px;">User Growth Trend</h2>
              <div class="chart-area">${userBars}</div>
              <div class="chart-labels">${monthLabels}</div>
            </div>
            <div class="chart-box">
              <h2 style="font-size:14px;margin-bottom:20px;">Revenue Growth (MRR)</h2>
              <div class="chart-area">${revenueBars}</div>
              <div class="chart-labels">${monthLabels}</div>
            </div>
          </div>

          <div class="footer">Generated by NextIgnition Growth & Fundraising Portal</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Stage Selection</span>
            </button>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: brandColors.navyBlue }} />
              <span className="font-bold">Growth & Fundraising Portal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-sm mb-8">
          <div className="flex gap-2">
            {[
              { id: 'traction', label: 'Traction Metrics', icon: TrendingUp },
              { id: 'pitch', label: 'Pitch Deck', icon: FileText },
              { id: 'investors', label: 'Investor Matching', icon: Users },
              { id: 'featured', label: 'Featured Listing', icon: Award }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${activeSection === tab.id
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
                style={
                  activeSection === tab.id
                    ? { background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }
                    : {}
                }
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Traction Dashboard */}
        {activeSection === 'traction' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                  {showDashboard ? 'Your Traction Dashboard' : 'Startup Traction Dashboard'}
                </h2>
                <p className="text-gray-600">
                  {showDashboard
                    ? 'Visual representation of your key performance indicators'
                    : 'Input your key metrics to showcase growth to investors'}
                </p>
              </div>
              {showDashboard && (
                <button
                  onClick={() => setShowDashboard(false)}
                  className="px-4 py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                >
                  Edit Metrics
                </button>
              )}
            </div>

            {!showDashboard ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Metrics */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg mb-4">User Metrics</h3>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Total Users/Customers
                      </label>
                      <input name="input-f0ccdd"
                        type="text"
                        value={formatWithCommas(totalUsers)}
                        onChange={handleNumericChange(setTotalUsers)}
                        placeholder="10,000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Monthly Active Users (MAU)
                      </label>
                      <input name="input-dcc447"
                        type="text"
                        value={formatWithCommas(mau)}
                        onChange={handleNumericChange(setMau)}
                        placeholder="5,000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        User Growth Rate (%)
                      </label>
                      <input name="input-84055a"
                        type="text"
                        value={formatWithCommas(userGrowth)}
                        onChange={handleNumericChange(setUserGrowth)}
                        placeholder="25"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Churn Rate (%)
                      </label>
                      <input name="input-299708"
                        type="text"
                        value={formatWithCommas(churnRate)}
                        onChange={handleNumericChange(setChurnRate)}
                        placeholder="5"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Revenue Metrics */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg mb-4">Revenue Metrics</h3>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Monthly Recurring Revenue (MRR)
                      </label>
                      <input name="input-506485"
                        type="text"
                        value={formatWithCommas(mrr)}
                        onChange={handleNumericChange(setMrr)}
                        placeholder="₹ 500,000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Revenue Growth (MoM %)
                      </label>
                      <input name="input-62646d"
                        type="text"
                        value={formatWithCommas(revenueGrowth)}
                        onChange={handleNumericChange(setRevenueGrowth)}
                        placeholder="15"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Customer Acquisition Cost (CAC)
                      </label>
                      <input name="input-eb081f"
                        type="text"
                        value={formatWithCommas(cac)}
                        onChange={handleNumericChange(setCac)}
                        placeholder="₹ 500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Lifetime Value (LTV)
                      </label>
                      <input name="input-6c2f9a"
                        type="text"
                        value={formatWithCommas(ltv)}
                        onChange={handleNumericChange(setLtv)}
                        placeholder="₹ 5,000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={handleGenerateDashboard}
                    disabled={isSaving}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate Dashboard'
                    )}
                  </button>
                  <button
                    onClick={exportAsPdf}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Export as PDF
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: totalUsers ? Number(totalUsers).toLocaleString() : '0', color: 'blue' },
                    { label: 'MRR', value: mrr ? `₹${Number(mrr).toLocaleString()}` : '₹0', color: 'green' },
                    { label: 'Avg MRR/User', value: (mrr && mau) ? `₹${Math.round(Number(mrr) / Number(mau)).toLocaleString()}` : '₹0', color: 'purple' },
                    { label: 'LTV/CAC Ratio', value: (ltv && cac) ? (Number(ltv) / Number(cac)).toFixed(1) + 'x' : '0.0x', color: 'orange' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <div className="text-gray-500 text-sm font-medium mb-1">{stat.label}</div>
                      <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      User Growth Trend
                    </h3>
                    <div className="h-48 flex items-center justify-center px-2 text-sm text-gray-500">
                      No trend data yet. Add updates over time to see your growth curve.
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Revenue Growth (MRR)
                    </h3>
                    <div className="h-48 flex items-center justify-center px-2 text-sm text-gray-500">
                      No revenue trend data yet. Update MRR periodically to visualize progress.
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4 no-print">
                  <button
                    onClick={exportAsPdf}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Export Full Report (PDF)
                  </button>
                  <button
                    onClick={() => setActiveSection('investors')}
                    className="px-8 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2"
                  >
                    Match with Investors
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Pitch Deck Section */}
        {activeSection === 'pitch' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                Pitch Deck Services
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hidden file input for pitch deck upload */}
                <input name="input-74172e"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* AI Review */}
                <div className="border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 transition-all">
                  <Sparkles className="w-12 h-12 text-purple-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">AI Pitch Deck Review</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload your deck and get AI-powered feedback on structure, content, and investor readiness
                  </p>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                      Structure analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                      Content quality check
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                      Investor readiness score
                    </li>
                  </ul>
                  <button
                    onClick={handlePitchDeckUpload}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload & Review (Free)
                      </>
                    )}
                  </button>
                </div>

                {/* Professional Design */}
                <div className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 transition-all">
                  <FileText className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">Professional Redesign</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Our designers will rebuild your deck with stunning visuals
                  </p>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Custom design
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      3-day turnaround
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      2 revision rounds
                    </li>
                  </ul>
                  <div className="mb-4">
                    {Capacitor.getPlatform() === 'ios' ? (
                      <div className="text-sm text-gray-500">Pricing shared on request</div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-blue-600">₹15,000 - ₹35,000</div>
                        <div className="text-xs text-gray-500">Based on complexity</div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => openServiceModal('Professional Pitch Deck Redesign', '₹15,000 - ₹35,000')}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
                  >
                    Get Started
                  </button>
                </div>

                {/* Video Pitch */}
                <div className="border-2 border-orange-200 rounded-xl p-6 hover:border-orange-400 transition-all">
                  <Award className="w-12 h-12 text-orange-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">Pitch Video Production</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create a compelling video pitch for investors
                  </p>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                      Teleprompter recording
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                      Professional editing
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                      5-day delivery
                    </li>
                  </ul>
                  <div className="mb-4">
                    {Capacitor.getPlatform() === 'ios' ? (
                      <div className="text-sm text-gray-500">Pricing shared on request</div>
                    ) : (
                      <div className="text-2xl font-bold text-orange-600">₹8,000</div>
                    )}
                  </div>
                  <button
                    onClick={() => openServiceModal('Pitch Video Production', '₹8,000')}
                    className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-all"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>

              {/* Analysis Results */}
              {(isAnalyzing || analysisResult || analysisError) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-8 shadow-sm mt-6"
                >
                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                      <h3 className="font-bold text-lg mb-2">Analyzing your pitch deck...</h3>
                      <p className="text-gray-500 text-sm">Reviewing "{uploadedFileName}"</p>
                    </div>
                  )}

                  {analysisError && !isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <X className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-red-700">Analysis Failed</h3>
                      <p className="text-gray-600 text-sm mb-4 text-center max-w-md">{analysisError}</p>
                      <button
                        onClick={handlePitchDeckUpload}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Try Again
                      </button>
                    </div>
                  )}

                  {analysisResult && !isAnalyzing && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">Analysis Complete</h3>
                            <p className="text-gray-500 text-sm">{uploadedFileName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setAnalysisResult(null); setAnalysisError(''); setUploadedFileName(''); }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Investor Readiness Score */}
                      {analysisResult.investorReadinessScore != null && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-700">Investor Readiness Score</span>
                            <span className="text-3xl font-bold" style={{ color: analysisResult.investorReadinessScore >= 70 ? '#16a34a' : analysisResult.investorReadinessScore >= 40 ? '#d97706' : '#dc2626' }}>
                              {analysisResult.investorReadinessScore}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                            <div
                              className="h-2.5 rounded-full transition-all duration-1000"
                              style={{
                                width: `${analysisResult.investorReadinessScore}%`,
                                background: analysisResult.investorReadinessScore >= 70 ? '#16a34a' : analysisResult.investorReadinessScore >= 40 ? '#d97706' : '#dc2626'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {(analysisResult.summary || analysisResult.executiveSummary) && (
                        <div className="mb-6">
                          <h4 className="font-bold text-gray-700 mb-2">Executive Summary</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {analysisResult.summary || analysisResult.executiveSummary}
                          </p>
                        </div>
                      )}

                      {/* Strengths */}
                      {analysisResult.strengths && analysisResult.strengths.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-bold text-green-700 mb-2">✅ Strengths</h4>
                          <ul className="space-y-1.5">
                            {analysisResult.strengths.map((s: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Gaps */}
                      {analysisResult.gaps && analysisResult.gaps.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-bold text-amber-700 mb-2">⚠️ Areas for Improvement</h4>
                          <ul className="space-y-1.5">
                            {analysisResult.gaps.map((g: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Highlights */}
                      {analysisResult.highlights && analysisResult.highlights.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-bold text-blue-700 mb-2">💡 Highlights</h4>
                          <ul className="space-y-1.5">
                            {analysisResult.highlights.map((h: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                          onClick={handlePitchDeckUpload}
                          className="px-5 py-2.5 border border-purple-300 text-purple-700 rounded-lg font-bold hover:bg-purple-50 flex items-center gap-2 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Another Deck
                        </button>
                        <button
                          onClick={() => openServiceModal('Professional Pitch Deck Redesign', '₹15,000 - ₹35,000')}
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
                        >
                          Get Professional Redesign
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
          </motion.div>
        )}

        {/* Investor Matching */}
        {activeSection === 'investors' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
              AI-Powered Investor Matching
            </h2>
            <p className="text-gray-600 mb-8">
              Get matched with investors based on your industry, stage, and funding needs
            </p>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-8 border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h3 className="font-bold text-lg">10 Investors Matched</h3>
              </div>
              <p className="text-sm text-gray-600">
                Based on your SaaS, Seed stage, and ₹2Cr funding requirement
              </p>
            </div>

            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="mb-4">Complete your traction metrics to unlock investor matching</p>
              <button
                onClick={() => setActiveSection('traction')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                Complete Metrics
              </button>
            </div>
          </motion.div>
        )}

        {/* Featured Listing */}
        {activeSection === 'featured' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
              Get Featured to Investors
            </h2>
            <p className="text-gray-600 mb-8">
              Increase your visibility with featured placement
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic */}
              <div className="border border-gray-300 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-2">Basic Listing</h3>
                {/* No "Free" price / tier framing on iOS (Apple Guideline 3.1.1) */}
                {Capacitor.getPlatform() !== 'ios' && <div className="text-3xl font-bold mb-4">Free</div>}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-sm">
                    <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-gray-600 rounded-full" />
                    </div>
                    Appears in investor search
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-gray-600 rounded-full" />
                    </div>
                    Standard placement
                  </li>
                </ul>
                <button onClick={handleProceed} className="w-full py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50">
                  {Capacitor.getPlatform() === 'ios' ? 'Continue' : 'Current Plan'}
                </button>
              </div>

              {/* Featured — paid subscription plan, hidden on iOS (Apple Guideline 3.1.1) */}
              {Capacitor.getPlatform() !== 'ios' && (
              <div className="border-2 border-blue-500 rounded-xl p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  POPULAR
                </div>
                <h3 className="font-bold text-lg mb-2">Featured Listing</h3>
                {/* Price hidden on iOS (Apple Guideline 3.1.1: no digital-subscription prices) */}
                {Capacitor.getPlatform() !== 'ios' && (
                  <div className="text-3xl font-bold mb-4">₹2,999<span className="text-sm font-normal text-gray-600">/mo</span></div>
                )}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-sm">
                    <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    Top placement in search
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    AI-matched to 50+ investors
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Award className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    Highlighted badge
                  </li>
                </ul>
                <button
                  onClick={handleProceed}
                  className="w-full py-3 rounded-lg font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  Upgrade Now
                </button>
              </div>
              )}

              {/* Investor Direct — paid subscription plan, hidden on iOS (Apple Guideline 3.1.1) */}
              {Capacitor.getPlatform() !== 'ios' && (
              <div className="border border-purple-500 rounded-xl p-6 bg-gradient-to-br from-purple-50 to-transparent">
                <h3 className="font-bold text-lg mb-2">Investor Direct</h3>
                {/* Price hidden on iOS (Apple Guideline 3.1.1: no digital-subscription prices) */}
                {Capacitor.getPlatform() !== 'ios' && (
                  <div className="text-3xl font-bold mb-4">₹4,999<span className="text-sm font-normal text-gray-600">/mo</span></div>
                )}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-sm">
                    <DollarSign className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    All featured benefits
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Users className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    Email to 100+ investors
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Award className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    10+ guaranteed views
                  </li>
                </ul>
                <button onClick={handleProceed} className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">
                  Get Started
                </button>
              </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Service Request Modal */}
      <AnimatePresence>
        {serviceModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setServiceModal({ open: false, service: '', price: '' })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {!serviceSubmitted ? (
                <>
                  <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">{serviceModal.service}</h3>
                      <button
                        onClick={() => setServiceModal({ open: false, service: '', price: '' })}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {Capacitor.getPlatform() !== 'ios' && (
                      <p className="text-sm text-gray-500 mt-1">Price: <span className="font-bold text-gray-700">{serviceModal.price}</span></p>
                    )}
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name *</label>
                      <input name="input-d4abbc"
                        type="text"
                        value={serviceForm.name}
                        onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your full name"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Email *</label>
                      <input name="input-0ddd7c"
                        type="email"
                        value={serviceForm.email}
                        onChange={e => setServiceForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@company.com"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone (optional)</label>
                      <input name="input-f4d2f4"
                        type="tel"
                        value={serviceForm.phone}
                        onChange={e => setServiceForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Additional Notes</label>
                      <textarea name="textarea-e4c9d2"
                        value={serviceForm.notes}
                        onChange={e => setServiceForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Tell us about your startup and what you need..."
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      />
                    </div>
                  </div>
                  <div className="px-6 pb-6 flex gap-3">
                    <button
                      onClick={() => setServiceModal({ open: false, service: '', price: '' })}
                      className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleServiceSubmit}
                      disabled={serviceSubmitting || !serviceForm.name || !serviceForm.email}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                      {serviceSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Request Submitted!</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    We've received your request for <strong>{serviceModal.service}</strong>. Our team will reach out to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setServiceModal({ open: false, service: '', price: '' })}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
