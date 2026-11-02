import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Rocket, Users, TrendingUp, Briefcase, DollarSign, Globe, BarChart3, FileText, Sparkles, X, Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { completeStage } from '../services/startupJourneyService';
import { updateStartup } from '../services/startupService';
import { formatWithCommas, parseNumericValue, isValidNumericInput } from '../utils/formatters';
import { getUsersByRole } from '../services/userService';
import { createBooking } from '../services/bookingService';

interface ScalingOperationsFlowProps {
  onBack: () => void;
  onComplete?: () => void;
  profileId?: string;
  onNavigate?: (tab: string, subTab?: string) => void;
}

export function ScalingOperationsFlow({ onBack, onComplete, profileId, onNavigate }: ScalingOperationsFlowProps) {
  const [activeSection, setActiveSection] = useState('diagnostics');

  // Metrics state
  const [teamSize, setTeamSize] = useState('');
  const [arr, setArr] = useState('');
  const [burnRate, setBurnRate] = useState('');
  const [runway, setRunway] = useState('');

  const [showReport, setShowReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bookingService, setBookingService] = useState<string | null>(null);

  // Real experts from DB
  const [experts, setExperts] = useState<any[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(false);

  // Booking modal state
  const [bookingModal, setBookingModal] = useState<{
    open: boolean;
    serviceName: string;
    selectedExpert: any | null;
  }>({ open: false, serviceName: '', selectedExpert: null });
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Fetch real experts when sections load
  useEffect(() => {
    if (activeSection === 'automation' || activeSection === 'expansion') {
      const fetchExperts = async () => {
        setLoadingExperts(true);
        try {
          const data = await getUsersByRole('expert');
          setExperts(data || []);
        } catch (err) {
          console.error('Failed to load experts:', err);
          setExperts([]);
        } finally {
          setLoadingExperts(false);
        }
      };
      fetchExperts();
    }
  }, [activeSection]);

  const openBookingModal = (serviceName: string, expert: any) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingModal({ open: true, serviceName, selectedExpert: expert });
    setBookingTopic(serviceName);
    setBookingNotes('');
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    setBookingTime('10:00');
  };

  const submitBooking = async () => {
    if (!bookingModal.selectedExpert) {
      toast.error('Please select an expert first.');
      return;
    }
    if (!bookingDate) {
      toast.error('Please select a preferred date.');
      return;
    }
    setSubmittingBooking(true);
    try {
      const expert = bookingModal.selectedExpert;
      await createBooking({
        expert: expert.id || expert._id,
        date: bookingDate,
        startTime: bookingTime,
        duration: 60,
        topic: bookingTopic || bookingModal.serviceName,
        notes: bookingNotes || `Service request: ${bookingModal.serviceName}`,
        // @ts-ignore
        isServiceBooking: true
      });
      toast.success(`Booking request sent to ${expert.name}!`, {
        description: `Your session for "${bookingModal.serviceName}" on ${new Date(bookingDate).toLocaleDateString()} at ${bookingTime} is pending confirmation.`,
        duration: 5000,
      });
      setBookingModal({ open: false, serviceName: '', selectedExpert: null });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleProceed = async () => {
    if (profileId) {
      await completeStage(String(profileId), 'scaling');
    }
    if (onComplete) onComplete();
  };



  const handleGenerateReport = async () => {
    setIsSaving(true);
    try {
      if (profileId) {
        const scalingData = {
          scalingMetrics: {
            teamSize,
            arr,
            burnRate,
            runway,
            updatedAt: new Date().toISOString()
          }
        };
        await updateStartup(String(profileId), scalingData);
      }
      setShowReport(true);
    } catch (error) {
      console.error('Failed to save metrics:', error);
      setShowReport(true);
    } finally {
      setIsSaving(false);
    }
  };

  const exportAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export the PDF.');
      return;
    }

    const rows = [
      ['Current Team Size', teamSize || '—'],
      ['Annual Recurring Revenue (ARR)', arr ? `₹${Number(arr).toLocaleString()}` : '—'],
      ['Monthly Burn Rate', burnRate ? `₹${Number(burnRate).toLocaleString()}` : '—'],
      ['Current Runway (months)', runway ? `${runway} months` : '—'],
    ];

    const tableRows = rows.map(([label, value]) => `<tr><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">${label}</td><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;">${value}</td></tr>`).join('');

    const efficiencyHeights = [30, 45, 55, 70, 85, 80, 90];
    const hiringHeights = [15, 25, 35, 40, 55, 70, 85];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const monthsHiring = ['Mon 1', 'Mon 2', 'Mon 3', 'Mon 4', 'Mon 5', 'Mon 6', 'Mon 7'];

    const efficiencyBars = efficiencyHeights.map(h => `<div style="flex:1;background:#3b82f6;height:${h}%;border-radius:2px 2px 0 0;margin:0 2px;"></div>`).join('');
    const hiringBars = hiringHeights.map(h => `<div style="flex:1;background:#a855f7;height:${h}%;border-radius:2px 2px 0 0;margin:0 2px;"></div>`).join('');
    const monthLabels = months.map(m => `<span style="flex:1;text-align:center;font-size:10px;color:#9ca3af;">${m}</span>`).join('');
    const hiringLabels = monthsHiring.map(m => `<span style="flex:1;text-align:center;font-size:10px;color:#9ca3af;">${m}</span>`).join('');

    const statsRow = [
      { label: 'Team Size', value: teamSize ? Number(teamSize).toLocaleString() : '0' },
      { label: 'ARR', value: arr ? `₹${Number(arr).toLocaleString()}` : '₹0' },
      { label: 'Burn Rate', value: burnRate ? `₹${Number(burnRate).toLocaleString()}` : '₹0' },
      { label: 'Runway', value: runway ? `${runway} mo` : '0 mo' }
    ].map(s => `
      <div style="background:#f9fafb;padding:16px;border-radius:12px;border:1px solid #e5e7eb;width:23%;">
        <div style="color:#6b7280;font-size:11px;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${s.label}</div>
        <div style="font-size:18px;font-weight:700;">${s.value}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Scaling & Operations Report</title>
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
          <h1>Scaling & Operations Report</h1>
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
              <h2 style="font-size:14px;margin-bottom:20px;">Capital Efficiency</h2>
              <div class="chart-area">${efficiencyBars}</div>
              <div class="chart-labels">${monthLabels}</div>
            </div>
            <div class="chart-box">
              <h2 style="font-size:14px;margin-bottom:20px;">Hiring Velocity</h2>
              <div class="chart-area">${hiringBars}</div>
              <div class="chart-labels">${hiringLabels}</div>
            </div>
          </div>

          <div class="footer">Generated by NextIgnition Scaling & Operations Portal</div>
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
              <Rocket className="w-5 h-5 text-green-600" />
              <span className="font-bold">Scaling & Operations</span>
              {Capacitor.getPlatform() !== 'ios' && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                  Verified Funding Required
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-sm mb-8">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'diagnostics', label: 'Growth Diagnostics', icon: BarChart3 },
              { id: 'experts', label: 'Expert Network', icon: Users },
              { id: 'automation', label: 'Process Automation', icon: TrendingUp },
              { id: 'expansion', label: 'Market Expansion', icon: Globe }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeSection === tab.id
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

        {/* Growth Diagnostics */}
        {activeSection === 'diagnostics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                  {showReport ? 'Growth Health Report' : 'AI-Powered Growth Health Check'}
                </h2>
                <p className="text-gray-600">
                  {showReport
                    ? 'Visual representation of your scaling diagnostics'
                    : 'Get personalized recommendations for scaling your startup'}
                </p>
              </div>
              {showReport && (
                <button
                  onClick={() => setShowReport(false)}
                  className="px-4 py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                >
                  Edit Metrics
                </button>
              )}
            </div>

            {!showReport ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Metrics */}
                  <div>
                    <h3 className="font-bold text-lg mb-4">Current State</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Current Team Size
                        </label>
                        <input name="input-afbeee"
                          type="text"
                          value={formatWithCommas(teamSize)}
                          onChange={(e) => {
                            const val = parseNumericValue(e.target.value);
                            if (isValidNumericInput(val)) setTeamSize(val);
                          }}
                          placeholder="15"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Annual Recurring Revenue (ARR)
                        </label>
                        <input name="input-75c50b"
                          type="text"
                          value={formatWithCommas(arr)}
                          onChange={(e) => {
                            const val = parseNumericValue(e.target.value);
                            if (isValidNumericInput(val)) setArr(val);
                          }}
                          placeholder="₹ 1,00,00,000"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Monthly Burn Rate
                        </label>
                        <input name="input-88c3b3"
                          type="text"
                          value={formatWithCommas(burnRate)}
                          onChange={(e) => {
                            const val = parseNumericValue(e.target.value);
                            if (isValidNumericInput(val)) setBurnRate(val);
                          }}
                          placeholder="₹ 10,00,000"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Current Runway (months)
                        </label>
                        <input name="input-917c11"
                          type="text"
                          value={formatWithCommas(runway)}
                          onChange={(e) => {
                            const val = parseNumericValue(e.target.value);
                            if (isValidNumericInput(val)) setRunway(val);
                          }}
                          placeholder="18"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations Panel */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                      <h3 className="font-bold text-lg">AI Analysis</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">
                      Enter your metrics to get personalized recommendations
                    </p>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="font-bold text-sm">Runway Analysis</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Your {runway || '18'}-month runway is healthy. Consider strategic hiring.
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          <span className="font-bold text-sm">Hiring Plan</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Recommend 5-7 key hires in next 6 months based on team size of {teamSize || '15'}.
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="font-bold text-sm">Cash Flow</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Optimize payment cycles to improve cash position.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={handleGenerateReport}
                    disabled={isSaving}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate Full Report'
                    )}
                  </button>
                  <button
                    onClick={exportAsPdf}
                    className="px-6 py-4 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Export PDF
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-8">
                {/* Report Dashboard Visualization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Team Size', value: teamSize ? Number(teamSize).toLocaleString() : '0', color: 'blue' },
                    { label: 'ARR', value: arr ? `₹${Number(arr).toLocaleString()}` : '₹0', color: 'green' },
                    { label: 'Burn Rate', value: burnRate ? `₹${Number(burnRate).toLocaleString()}` : '₹0', color: 'red' },
                    { label: 'Runway', value: runway ? `${runway} mo` : '0 mo', color: 'purple' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <div className="text-gray-500 text-sm font-medium mb-1">{stat.label}</div>
                      <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Efficiency Chart */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Capital Efficiency
                    </h3>
                    <div className="h-48 flex items-end gap-2 px-2">
                      {[30, 45, 55, 70, 85, 80, 90].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-blue-500 rounded-t-md opacity-80"
                          style={{ height: `${h}%` }}
                        ></div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                    </div>
                  </div>

                  {/* Hiring Projection */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Hiring Velocity
                    </h3>
                    <div className="h-48 flex items-end gap-2 px-2">
                      {[15, 25, 35, 40, 55, 70, 85].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-purple-500 rounded-t-md opacity-80"
                          style={{ height: `${h}%` }}
                        ></div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      <span>Mon 1</span><span>Mon 2</span><span>Mon 3</span><span>Mon 4</span><span>Mon 5</span><span>Mon 6</span><span>Mon 7</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={exportAsPdf}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Export Full Report (PDF)
                  </button>
                  <button
                    onClick={() => setActiveSection('experts')}
                    className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2"
                  >
                    Hire Fractional Experts
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Expert Network */}
        {activeSection === 'experts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
              Fractional Executive Network
            </h2>
            <p className="text-gray-600 mb-8">
              Access seasoned executives on a part-time basis
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fractional CTO */}
              <div className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">Fractional CTO</h3>
                    <p className="text-sm text-gray-600">Technical leadership & strategy</p>
                  </div>
                  <Briefcase className="w-8 h-8 text-blue-600" />
                </div>
                <div className="mb-4">
                  {Capacitor.getPlatform() === 'ios' ? (
                    <div className="text-sm text-gray-500">Pricing shared on request</div>
                  ) : (<>
                  <div className="text-2xl font-bold text-blue-600 mb-1">₹50,000 - ₹1,00,000</div>
                  <div className="text-sm text-gray-500">per month</div>
                  </>)}
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    Technical architecture review
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    Team hiring & management
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    Technology roadmap
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    10-20 hours/week
                  </li>
                </ul>
                <button
                  onClick={() => onNavigate?.('Discover', 'Experts')}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  View Profiles
                </button>
              </div>

              {/* Fractional CFO */}
              <div className="border-2 border-green-200 rounded-xl p-6 hover:border-green-400 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">Fractional CFO</h3>
                    <p className="text-sm text-gray-600">Financial planning & operations</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <div className="mb-4">
                  {Capacitor.getPlatform() === 'ios' ? (
                    <div className="text-sm text-gray-500">Pricing shared on request</div>
                  ) : (<>
                  <div className="text-2xl font-bold text-green-600 mb-1">₹60,000 - ₹1,20,000</div>
                  <div className="text-sm text-gray-500">per month</div>
                  </>)}
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    Financial modeling & forecasting
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    Investor relations
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    Fundraising support
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    10-20 hours/week
                  </li>
                </ul>
                <button
                  onClick={() => onNavigate?.('Discover', 'Experts')}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                >
                  View Profiles
                </button>
              </div>

              {/* VP Marketing */}
              <div className="border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">VP Marketing</h3>
                    <p className="text-sm text-gray-600">Growth & brand strategy</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <div className="mb-4">
                  {Capacitor.getPlatform() === 'ios' ? (
                    <div className="text-sm text-gray-500">Pricing shared on request</div>
                  ) : (<>
                  <div className="text-2xl font-bold text-purple-600 mb-1">₹40,000 - ₹80,000</div>
                  <div className="text-sm text-gray-500">per month</div>
                  </>)}
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                    Growth marketing strategy
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                    Team building & execution
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                    Brand positioning
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                    10-20 hours/week
                  </li>
                </ul>
                <button
                  onClick={() => onNavigate?.('Discover', 'Experts')}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700"
                >
                  View Profiles
                </button>
              </div>

              {/* Head of Sales */}
              <div className="border-2 border-orange-200 rounded-xl p-6 hover:border-orange-400 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">Head of Sales</h3>
                    <p className="text-sm text-gray-600">Revenue & sales operations</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <div className="mb-4">
                  {Capacitor.getPlatform() === 'ios' ? (
                    <div className="text-sm text-gray-500">Pricing shared on request</div>
                  ) : (<>
                  <div className="text-2xl font-bold text-orange-600 mb-1">₹50,000 - ₹90,000</div>
                  <div className="text-sm text-gray-500">per month</div>
                  </>)}
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                    Sales process & playbook
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                    Team hiring & training
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                    Pipeline management
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                    10-20 hours/week
                  </li>
                </ul>
                <button
                  onClick={() => onNavigate?.('Discover', 'Experts')}
                  className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700"
                >
                  View Profiles
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Process Automation */}
        {activeSection === 'automation' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
              Process Automation Workshops
            </h2>
            <p className="text-gray-600 mb-8">
              Pick an expert and book a workshop or strategy session
            </p>

            {/* Expert Selection */}
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Available Experts
              </h3>
              {loadingExperts ? (
                <div className="flex items-center justify-center py-12">
                  <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : experts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No experts available at the moment</p>
                  <p className="text-sm">Please check back later</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {experts.map((expert: any) => (
                    <motion.div
                      key={expert.id || expert._id}
                      whileHover={{ scale: 1.02 }}
                      className="border-2 border-gray-100 rounded-2xl p-5 hover:border-blue-400 transition-all hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-white shadow-sm relative">
                          {expert.avatar && expert.avatar.startsWith('http') ? (
                            <>
                              <img
                                src={expert.avatar}
                                alt={expert.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                                    e.currentTarget.nextElementSibling.classList.add('flex');
                                  }
                                }}
                              />
                              <div className="hidden items-center justify-center w-full h-full text-white text-[10px]">
                                {expert.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'EX'}
                              </div>
                            </>
                          ) : (
                            expert.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'EX'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{expert.name}</p>
                          <p className="text-xs text-gray-500">{expert.profile?.skills?.slice(0, 2).join(', ') || 'Expert'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <button
                          onClick={() => openBookingModal('Automation Workshop', expert)}
                          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Book Workshop
                        </button>
                        <button
                          onClick={() => openBookingModal('Automation Strategy Session', expert)}
                          className="w-full py-2.5 border-2 border-blue-200 text-blue-700 rounded-lg font-bold hover:bg-blue-50 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Book Strategy Session
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => onNavigate?.('Discover', 'Experts')}
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                View All Experts →
              </button>
            </div>
          </motion.div>
        )}

        {/* Market Expansion */}
        {activeSection === 'expansion' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
              Market Expansion Services
            </h2>
            <p className="text-gray-600 mb-8">
              Pick an expert to help you expand into new markets
            </p>

            {/* Expert Selection */}
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-600" />
                Available Experts
              </h3>
              {loadingExperts ? (
                <div className="flex items-center justify-center py-12">
                  <span className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                </div>
              ) : experts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No experts available at the moment</p>
                  <p className="text-sm">Please check back later</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {experts.map((expert: any) => (
                    <motion.div
                      key={expert.id || expert._id}
                      whileHover={{ scale: 1.02 }}
                      className="border-2 border-gray-100 rounded-2xl p-5 hover:border-orange-400 transition-all hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-white shadow-sm">
                          {expert.avatar && expert.avatar.startsWith('http') ? (
                            <img src={expert.avatar} alt={expert.name} className="w-full h-full object-cover" />
                          ) : (
                            expert.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'EX'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{expert.name}</p>
                          <p className="text-xs text-gray-500">{expert.profile?.skills?.slice(0, 2).join(', ') || 'Expert'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <button
                          onClick={() => openBookingModal('Market Expansion Consultation', expert)}
                          className="w-full py-2.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <Globe className="w-4 h-4" />
                          Book Consultation
                        </button>
                        <button
                          onClick={() => openBookingModal('Market Expansion Strategy Session', expert)}
                          className="w-full py-2.5 border-2 border-orange-200 text-orange-700 rounded-lg font-bold hover:bg-orange-50 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Book Strategy Session
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => onNavigate?.('Discover', 'Experts')}
                className="text-sm font-bold text-orange-600 hover:underline"
              >
                View All Experts →
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingModal.open && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBookingModal({ open: false, serviceName: '', selectedExpert: null })}
              className="absolute inset-0 bg-black/50 z-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full z-10 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-left"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: brandColors.electricBlue + '20' }}>
                    <Calendar className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Book Session</h2>
                    <p className="text-xs text-gray-500">{bookingModal.serviceName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setBookingModal({ open: false, serviceName: '', selectedExpert: null })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto">
                {/* Expert Info */}
                {bookingModal.selectedExpert && (
                  <div className="px-6 pt-5">
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-white shadow-sm">
                        {bookingModal.selectedExpert.avatar && bookingModal.selectedExpert.avatar.startsWith('http') ? (
                          <img src={bookingModal.selectedExpert.avatar} alt={bookingModal.selectedExpert.name} className="w-full h-full object-cover" />
                        ) : (
                          bookingModal.selectedExpert.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'EX'
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Booking with</p>
                        <p className="font-bold text-gray-900">{bookingModal.selectedExpert.name}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                    </div>
                  </div>
                )}

                {/* Form */}
                <div className="px-6 py-5 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Session Topic</label>
                    <input name="input-8e6310"
                      type="text"
                      value={bookingTopic}
                      onChange={(e) => setBookingTopic(e.target.value)}
                      placeholder="e.g., Sales Automation Setup, Market Entry Strategy"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Additional Notes (optional)</label>
                    <textarea name="textarea-f148e4"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Describe what you'd like to cover, any specific challenges, tools you already use..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 px-1 pb-2">
                    <div>
                      <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Preferred Date
                      </label>
                      <input name="input-4ec9b3"
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-500" />
                        Preferred Time
                      </label>
                      <input name="input-0ac0ba"
                        type="time"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end rounded-b-2xl flex-shrink-0">
                <button
                  onClick={() => setBookingModal({ open: false, serviceName: '', selectedExpert: null })}
                  className="px-5 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBooking}
                  disabled={submittingBooking}
                  className="px-6 py-2.5 rounded-lg font-bold text-white transition disabled:opacity-50 flex items-center gap-2 text-sm"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  {submittingBooking ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
