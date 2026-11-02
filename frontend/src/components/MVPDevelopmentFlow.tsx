import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Upload,
  Calendar,
  DollarSign,
  Shield,
  Clock,
  Users,
  Wrench,
  Sparkles,
  TrendingUp,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { brandColors } from '../utils/colors';
import { completeStage } from '../services/startupJourneyService';
import { updateStartup } from '../services/startupService';

const MVP_DRAFT_KEY = 'mvp-flow-draft';

interface MVPDevelopmentFlowProps {
  onBack: () => void;
  onComplete?: () => void;
  profileId?: string;
}

export function MVPDevelopmentFlow({ onBack, onComplete, profileId }: MVPDevelopmentFlowProps) {

  // Form State
  const [businessType, setBusinessType] = useState<'service' | 'product' | ''>('');
  const [startupName, setStartupName] = useState('');
  const [productType, setProductType] = useState<string[]>([]);
  const [productDescription, setProductDescription] = useState('');
  const [coreFeatures, setCoreFeatures] = useState<Array<{ name: string; description: string; priority: string }>>([
    { name: '', description: '', priority: 'critical' }
  ]);
  const [designPreference, setDesignPreference] = useState<string[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [databaseComplexity, setDatabaseComplexity] = useState('simple');
  const [expectedUserLoad, setExpectedUserLoad] = useState('small');
  const [timeline, setTimeline] = useState('2-months');
  const [budgetRange, setBudgetRange] = useState('100k-250k');
  const [fundingStatus, setFundingStatus] = useState('bootstrapped');
  const [postLaunchSupport, setPostLaunchSupport] = useState<string[]>(['1-month-free']);
  const [trainingNeeded, setTrainingNeeded] = useState<string[]>([]);
  const [referenceProducts, setReferenceProducts] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [preferredComm, setPreferredComm] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Restore draft on mount (scoped per profile so drafts don't bleed across startups)
  const draftKey = profileId ? `${MVP_DRAFT_KEY}:${profileId}` : MVP_DRAFT_KEY;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.businessType !== undefined) setBusinessType(d.businessType);
      if (d.startupName !== undefined) setStartupName(d.startupName);
      if (Array.isArray(d.productType)) setProductType(d.productType);
      if (d.productDescription !== undefined) setProductDescription(d.productDescription);
      if (Array.isArray(d.coreFeatures) && d.coreFeatures.length) setCoreFeatures(d.coreFeatures);
      if (Array.isArray(d.designPreference)) setDesignPreference(d.designPreference);
      if (Array.isArray(d.techStack)) setTechStack(d.techStack);
      if (Array.isArray(d.integrations)) setIntegrations(d.integrations);
      if (d.databaseComplexity !== undefined) setDatabaseComplexity(d.databaseComplexity);
      if (d.expectedUserLoad !== undefined) setExpectedUserLoad(d.expectedUserLoad);
      if (d.timeline !== undefined) setTimeline(d.timeline);
      if (d.budgetRange !== undefined) setBudgetRange(d.budgetRange);
      if (d.fundingStatus !== undefined) setFundingStatus(d.fundingStatus);
      if (Array.isArray(d.postLaunchSupport)) setPostLaunchSupport(d.postLaunchSupport);
      if (Array.isArray(d.trainingNeeded)) setTrainingNeeded(d.trainingNeeded);
      if (d.referenceProducts !== undefined) setReferenceProducts(d.referenceProducts);
      if (d.specialRequirements !== undefined) setSpecialRequirements(d.specialRequirements);
      if (Array.isArray(d.preferredComm)) setPreferredComm(d.preferredComm);
    } catch (err) {
      console.error('Failed to load MVP draft:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const saveDraft = () => {
    try {
      const draft = {
        businessType,
        startupName,
        productType,
        productDescription,
        coreFeatures,
        designPreference,
        techStack,
        integrations,
        databaseComplexity,
        expectedUserLoad,
        timeline,
        budgetRange,
        fundingStatus,
        postLaunchSupport,
        trainingNeeded,
        referenceProducts,
        specialRequirements,
        preferredComm,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      toast.success('Draft saved', { description: 'Your MVP request was saved on this device.' });
    } catch (err) {
      console.error('Failed to save MVP draft:', err);
      toast.error('Could not save draft. Please try again.');
    }
  };

  const goToConsultation = () => {
    // Persist progress, then deep-link into the founder dashboard's Discover > Experts
    // tab where consultations are booked (matches the navigateDashboard convention).
    saveDraft();
    window.dispatchEvent(new CustomEvent('navigateDashboard', { detail: { tab: 'Discover', subTab: 'Experts' } }));
    window.location.hash = '#founder-dashboard';
  };

  // Pricing Calculation
  const calculatePricing = () => {
    let basePrice = 75000;
    let additionalCosts = 0;

    // Product type additions
    if (productType.includes('mobile-both')) additionalCosts += 40000;
    else if (productType.includes('mobile-ios') || productType.includes('mobile-android')) additionalCosts += 20000;

    // Integrations
    if (integrations.includes('payment')) additionalCosts += 10000;
    if (integrations.includes('auth')) additionalCosts += 5000;
    if (integrations.includes('email')) additionalCosts += 3000;
    if (integrations.includes('sms')) additionalCosts += 3000;

    // Design
    if (designPreference.includes('need-design')) additionalCosts += 25000;

    // Timeline premium
    if (timeline === 'asap') additionalCosts += 15000;

    // Support
    if (postLaunchSupport.includes('3-month')) additionalCosts += 45000;
    else if (postLaunchSupport.includes('6-month')) additionalCosts += 72000;

    // Database complexity
    if (databaseComplexity === 'complex') additionalCosts += 15000;
    else if (databaseComplexity === 'moderate') additionalCosts += 8000;

    const subtotal = basePrice + additionalCosts;

    // Discounts
    let discount = 0;
    // Elite tier discount (mock)
    discount += subtotal * 0.1; // 10% discount

    const total = subtotal - discount;

    return {
      base: basePrice,
      additional: additionalCosts,
      subtotal,
      discount,
      total
    };
  };

  const pricing = calculatePricing();

  const addFeature = () => {
    setCoreFeatures([...coreFeatures, { name: '', description: '', priority: 'important' }]);
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = [...coreFeatures];
    updated[index] = { ...updated[index], [field]: value };
    setCoreFeatures(updated);
  };

  const exportAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export the PDF.');
      return;
    }

    const rows = [
      ['Startup Name', startupName || '—'],
      ['Business Type', businessType || '—'],
      ['Product Category', productType.join(', ') || '—'],
      ['Timeline', timeline || '—'],
      ['Budget Range', budgetRange || '—'],
      ['Estimated Total', `₹${pricing.total.toLocaleString()}`],
    ];

    const tableRows = rows.map(([label, value]) => `<tr><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">${label}</td><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;">${value}</td></tr>`).join('');

    const complexityHeights = [40, 60, 85, 55, 75];
    const complexityLabels = ['Backend', 'Frontend', 'Database', 'API', 'DevOps'];
    const compBars = complexityHeights.map(h => `<div style="flex:1;background:#3b82f6;height:${h}%;border-radius:2px 2px 0 0;margin:0 2px;"></div>`).join('');
    const compLabels = complexityLabels.map(l => `<span style="flex:1;text-align:center;font-size:10px;color:#9ca3af;">${l}</span>`).join('');

    const featureWeights = [50, 30, 20];
    const featureLabels = ['MVP Critical', 'Desired', 'Future'];
    const featureBars = featureWeights.map((w, i) => `<div style="flex:1;background:${i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : '#3b82f6'};height:${w}%;border-radius:2px 2px 0 0;margin:0 2px;"></div>`).join('');
    const featureLabelRow = featureLabels.map(l => `<span style="flex:1;text-align:center;font-size:10px;color:#9ca3af;">${l}</span>`).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>MVP Development Roadmap</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111827; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            h1 { font-size: 28px; margin-bottom: 4px; }
            .subtitle { color: #6b7280; margin-bottom: 32px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 32px; }
            th { text-align: left; padding: 12px 16px; background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            .charts-container { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; }
            .chart-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; width: 48%; }
            .chart-area { height: 100px; display: flex; align-items: flex-end; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
            .chart-labels { display: flex; padding-top: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <h1>MVP Development Roadmap</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • NextIgnition</p>
          
          <table>
            <thead><tr><th>Configuration</th><th>Value</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div class="charts-container">
            <div class="chart-box">
              <h2 style="font-size:14px;margin-bottom:16px;">Technical Complexity</h2>
              <div class="chart-area">${compBars}</div>
              <div class="chart-labels">${compLabels}</div>
            </div>
            <div class="chart-box">
              <h2 style="font-size:14px;margin-bottom:16px;">Feature Prioritization</h2>
              <div class="chart-area">${featureBars}</div>
              <div class="chart-labels">${featureLabelRow}</div>
            </div>
          </div>

          <div class="footer">Generated by NextIgnition MVP Development Studio</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  const toggleArrayValue = (arr: string[], value: string, setter: (arr: string[]) => void) => {
    if (arr.includes(value)) {
      setter(arr.filter(v => v !== value));
    } else {
      setter([...arr, value]);
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const mvpRequestData = {
        mvpRequest: {
          businessType,
          startupName,
          productType,
          productDescription,
          coreFeatures,
          designPreference,
          techStack,
          integrations,
          databaseComplexity,
          expectedUserLoad,
          timeline,
          budgetRange,
          fundingStatus,
          postLaunchSupport,
          trainingNeeded,
          referenceProducts,
          specialRequirements,
          preferredComm,
          pricing,
          submittedAt: new Date().toISOString(),
        },
      };

      if (profileId) {
        const pid = String(profileId);
        const isLocalProfile = pid.startsWith('profile-');

        if (isLocalProfile) {
          // Save to localStorage for local-only profiles
          const profiles = JSON.parse(localStorage.getItem('createdProfiles') || '[]');
          const idx = profiles.findIndex((p: any) => String(p?.id) === pid);
          if (idx >= 0) {
            profiles[idx] = { ...profiles[idx], ...mvpRequestData };
            localStorage.setItem('createdProfiles', JSON.stringify(profiles));
          }
        } else {
          // Save to backend for real DB profiles
          await updateStartup(pid, mvpRequestData);
        }

        await completeStage(pid, 'mvp');
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error('MVP submit failed:', err);
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to submit MVP request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation / Thank You Page
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10 text-center border border-gray-100"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
            MVP Request Submitted!
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Thank you for submitting your MVP development request. Our team will review it and get back to you shortly.
          </p>

          {/* Request Summary */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4">Request Summary</h3>
            <div className="space-y-3">
              {startupName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Startup</span>
                  <span className="font-semibold text-gray-900">{startupName}</span>
                </div>
              )}
              {businessType && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Business Type</span>
                  <span className="font-semibold text-gray-900 capitalize">{businessType}</span>
                </div>
              )}
              {productType.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Product Type</span>
                  <span className="font-semibold text-gray-900">{productType.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Timeline</span>
                <span className="font-semibold text-gray-900 capitalize">{timeline.replace(/-/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Features</span>
                <span className="font-semibold text-gray-900">{coreFeatures.filter(f => f.name).length} core feature(s)</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-bold text-gray-900">Estimated Total</span>
                <span className="font-bold text-lg" style={{ color: brandColors.electricBlue }}>{Capacitor.getPlatform() === 'ios' ? 'Custom quote' : `₹${Math.round(pricing.total).toLocaleString()}`}</span>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left border border-blue-100">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              What Happens Next
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <span className="text-gray-700">Our team reviews your request within <strong>24 hours</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <span className="text-gray-700">You'll be matched with the right <strong>tech experts</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <span className="text-gray-700">A <strong>30-minute requirements discussion</strong> will be scheduled</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                <span className="text-gray-700">You'll receive a <strong>final quote with timeline</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { if (onComplete) onComplete(); }}
              className="flex-1 py-4 rounded-xl font-bold text-white text-lg transition-all hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
            >
              View My Startup Profile
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-4 rounded-xl font-bold text-gray-700 text-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              Back to Stages
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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
              <Wrench className="w-5 h-5 text-orange-600" />
              <span className="font-bold">MVP Development Service</span>
              {Capacitor.getPlatform() !== 'ios' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                  Elite Tier Exclusive
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Form + Pricing Sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Form (60%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Project Overview */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                Project Overview
              </h2>

              <div className="space-y-6">
                {/* Business Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Business Type
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'service', label: 'Service' },
                      { value: 'product', label: 'Product' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="businessType"
                          checked={businessType === option.value}
                          onChange={() => setBusinessType(option.value as 'service' | 'product')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Startup Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Startup Name
                  </label>
                  <input name="input-b812fc"
                    type="text"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    placeholder="Your startup name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Product Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    {businessType === 'service' ? 'Service Type' : businessType === 'product' ? 'Product Type' : 'Product/Service Type'}
                  </label>
                  {!businessType && (
                    <p className="text-sm text-gray-500 mb-3">Please select business type first</p>
                  )}
                  {businessType === 'service' && (
                    <div className="space-y-2">
                      {[
                        { value: 'web-app', label: 'Web App' },
                        { value: 'mobile-ios', label: 'Mobile App (iOS)' },
                        { value: 'mobile-android', label: 'Mobile App (Android)' },
                        { value: 'mobile-both', label: 'Mobile App (Both)' },
                        { value: 'chrome-ext', label: 'Chrome Extension' },
                        { value: 'desktop', label: 'Desktop App' },
                        { value: 'api', label: 'API/Backend Service' },
                        { value: 'saas-platform', label: 'SaaS Platform' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="productType"
                            checked={productType.includes(option.value)}
                            onChange={() => setProductType([option.value])}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {businessType === 'product' && (
                    <div className="space-y-2">
                      {[
                        { value: 'physical-product', label: 'Physical Product' },
                        { value: 'consumer-goods', label: 'Consumer Goods' },
                        { value: 'hardware-device', label: 'Hardware Device' },
                        { value: 'iot-device', label: 'IoT Device' },
                        { value: 'electronics', label: 'Electronics' },
                        { value: 'wearable', label: 'Wearable Technology' },
                        { value: 'smart-home', label: 'Smart Home Product' },
                        { value: 'other-product', label: 'Other Physical Product' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="productType"
                            checked={productType.includes(option.value)}
                            onChange={() => setProductType([option.value])}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Product Description
                  </label>
                  <textarea name="textarea-479b1c"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="What does your MVP do? Who is it for? What problem does it solve?"
                    rows={6}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {productDescription.length}/500 words
                  </div>
                </div>

                {/* Core Features */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Core Features (Must-Have)
                  </label>
                  <div className="space-y-4">
                    {coreFeatures.map((feature, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <input name="input-c0db32"
                          type="text"
                          value={feature.name}
                          onChange={(e) => updateFeature(idx, 'name', e.target.value)}
                          placeholder="Feature name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <textarea name="textarea-bc91d6"
                          value={feature.description}
                          onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                          placeholder="Description (200 chars)"
                          maxLength={200}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <select name="select-713373"
                          value={feature.priority}
                          onChange={(e) => updateFeature(idx, 'priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="critical">Critical</option>
                          <option value="important">Important</option>
                          <option value="nice-to-have">Nice-to-have</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addFeature}
                    className="mt-3 px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    + Add Feature
                  </button>
                </div>

                {/* Design Preferences */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Design Preferences
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'have-designs', label: 'I have designs (upload Figma/Adobe link)' },
                      { value: 'need-design', label: 'I need UI/UX design (additional cost)' },
                      { value: 'templates', label: 'Use pre-built templates (cost-effective)' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-344042"
                          type="checkbox"
                          checked={designPreference.includes(option.value)}
                          onChange={() => toggleArrayValue(designPreference, option.value, setDesignPreference)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {designPreference.includes('have-designs') && (
                    <div className="mt-3">
                      <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        Upload Design Files
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Technical Requirements */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                Technical Requirements
              </h2>

              <div className="space-y-6">
                {/* Tech Stack */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Preferred Tech Stack (Optional)
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'react', label: 'React/Next.js' },
                      { value: 'flutter', label: 'Flutter/React Native' },
                      { value: 'backend', label: 'Node.js/Python backend' },
                      { value: 'firebase', label: 'Firebase/Supabase' },
                      { value: 'no-pref', label: 'No preference (let experts decide)' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-a1619f"
                          type="checkbox"
                          checked={techStack.includes(option.value)}
                          onChange={() => toggleArrayValue(techStack, option.value, setTechStack)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Integrations */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Integrations Needed
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'payment', label: 'Payment (Stripe/Razorpay)' },
                      { value: 'auth', label: 'Authentication (OAuth)' },
                      { value: 'email', label: 'Email (SendGrid)' },
                      { value: 'sms', label: 'SMS (Twilio)' },
                      { value: 'analytics', label: 'Analytics (GA)' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-cdfed6"
                          type="checkbox"
                          checked={integrations.includes(option.value)}
                          onChange={() => toggleArrayValue(integrations, option.value, setIntegrations)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Database Requirements */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Database Requirements
                  </label>
                  <select name="select-5c3a6e"
                    value={databaseComplexity}
                    onChange={(e) => setDatabaseComplexity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="simple">Simple (user data, content)</option>
                    <option value="moderate">Moderate (relational data, reports)</option>
                    <option value="complex">Complex (real-time, high volume)</option>
                  </select>
                </div>

                {/* User Load */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Expected User Load
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'small', label: '< 1,000 users (MVP testing)' },
                      { value: 'medium', label: '1,000 - 10,000 users' },
                      { value: 'large', label: '10,000+ users (scalable architecture)' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="userLoad"
                          value={option.value}
                          checked={expectedUserLoad === option.value}
                          onChange={(e) => setExpectedUserLoad(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Timeline & Budget */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                Timeline & Budget
              </h2>

              <div className="space-y-6">
                {/* Timeline */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Desired Launch Timeline
                  </label>
                  <select name="select-a5b68e"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="asap">ASAP (4-6 weeks)</option>
                    <option value="2-months">2 months</option>
                    <option value="3-months">3 months</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                {/* Funding Status */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Funding Status
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'bootstrapped', label: 'Bootstrapped' },
                      { value: 'pre-seed', label: 'Pre-seed raised' },
                      { value: 'seed', label: 'Seed funded' },
                      { value: 'looking', label: 'Looking for funding (deferred payment option)' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="funding"
                          value={option.value}
                          checked={fundingStatus === option.value}
                          onChange={(e) => setFundingStatus(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Support & Training */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                Support & Maintenance
              </h2>

              <div className="space-y-6">
                {/* Post-Launch Support */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Post-Launch Support
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: '1-month-free', label: '1-month free support (included)' },
                      { value: '3-month', label: `3-month support plan${Capacitor.getPlatform() === 'ios' ? '' : ' (₹15,000/month)'}` },
                      { value: '6-month', label: `6-month support plan${Capacitor.getPlatform() === 'ios' ? '' : ' (₹12,000/month)'}` },
                      { value: 'on-demand', label: 'On-demand support only' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="support"
                          checked={postLaunchSupport.includes(option.value)}
                          onChange={() => setPostLaunchSupport([option.value])}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Training */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Training Needed
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'admin', label: 'Admin panel training' },
                      { value: 'docs', label: 'Technical documentation' },
                      { value: 'videos', label: 'Video tutorials' },
                      { value: 'onboarding', label: 'Live onboarding session' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input name="input-5b50f9"
                          type="checkbox"
                          checked={trainingNeeded.includes(option.value)}
                          onChange={() => toggleArrayValue(trainingNeeded, option.value, setTrainingNeeded)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Additional Info */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                Additional Information
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Reference Products
                  </label>
                  <input name="input-e8801f"
                    type="text"
                    value={referenceProducts}
                    onChange={(e) => setReferenceProducts(e.target.value)}
                    placeholder="Products you admire (URLs or names)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Special Requirements
                  </label>
                  <textarea name="textarea-d207b4"
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    placeholder="Any other details we should know?"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Pricing Calculator (40%) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Pricing Widget */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-100">
                <h3 className="text-xl font-bold mb-4">Your Estimated Quote</h3>
                <p className="text-sm text-gray-600 mb-6">Final pricing after expert review</p>

                {Capacitor.getPlatform() === 'ios' ? (
                  <div className="text-sm text-gray-600 mb-6 p-4 bg-gray-50 rounded-xl">
                    Final pricing is shared after our team reviews your request.
                  </div>
                ) : (<>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span>Base MVP Development</span>
                    <span className="font-bold">₹{pricing.base.toLocaleString()}</span>
                  </div>

                  {pricing.additional > 0 && (
                    <>
                      <div className="border-t border-gray-200 pt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Additional Features:</div>
                        {integrations.includes('payment') && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Payment integration</span>
                            <span>+₹10,000</span>
                          </div>
                        )}
                        {productType.includes('mobile-both') && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Mobile app (both platforms)</span>
                            <span>+₹40,000</span>
                          </div>
                        )}
                        {designPreference.includes('need-design') && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Custom UI/UX design</span>
                            <span>+₹25,000</span>
                          </div>
                        )}
                        {timeline === 'asap' && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Timeline Premium (ASAP)</span>
                            <span>+₹15,000</span>
                          </div>
                        )}
                        {postLaunchSupport.includes('3-month') && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Post-launch support (3 months)</span>
                            <span>+₹45,000</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>₹{pricing.subtotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {pricing.discount > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Discounts:</div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Elite Tier discount (10%)</span>
                        <span>-₹{Math.round(pricing.discount).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t-2 border-gray-300 pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Estimate</span>
                      <span className="text-blue-600">₹{Math.round(pricing.total).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h4 className="font-bold text-sm mb-3">Payment Options:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Upfront (5% discount)</span>
                      <span className="font-medium">₹{Math.round(pricing.total * 0.95).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>50-50 milestone</span>
                      <span className="font-medium">₹{Math.round(pricing.total / 2).toLocaleString()} × 2</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3 installments</span>
                      <span className="font-medium">₹{Math.round(pricing.total / 3).toLocaleString()} × 3</span>
                    </div>
                  </div>
                </div>
                </>)}

                {/* Error Message */}
                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                {/* Success Message */}
                {submitSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    MVP Request submitted successfully! Redirecting...
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || submitSuccess}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg mb-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : submitSuccess ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Submitted!
                    </span>
                  ) : (
                    'Submit MVP Request'
                  )}
                </button>

                <button
                  onClick={exportAsPdf}
                  className="w-full py-4 border border-gray-300 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2 mb-4"
                >
                  <FileText className="w-5 h-5" />
                  Export as PDF
                </button>

                <div className="space-y-2">
                  <button onClick={saveDraft} className="w-full text-sm text-blue-600 hover:underline">
                    Save as Draft
                  </button>
                  <button onClick={goToConsultation} className="w-full text-sm text-blue-600 hover:underline">
                    Schedule a Free Consultation First
                  </button>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                <h4 className="font-bold mb-4">What Happens Next</h4>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: Clock, text: 'Our team reviews within 24 hours', color: 'text-blue-600' },
                    { icon: Users, text: 'Matched with tech experts', color: 'text-orange-600' },
                    { icon: Calendar, text: '30-min requirement discussion', color: 'text-green-600' },
                    { icon: DollarSign, text: 'Final quote with timeline', color: 'text-purple-600' },
                    { icon: Wrench, text: 'Development kickoff', color: 'text-indigo-600' },
                    { icon: Sparkles, text: 'Launch & handover', color: 'text-pink-600' }
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <step.icon className={`w-5 h-5 ${step.color} flex-shrink-0 mt-0.5`} />
                      <span className="text-gray-700">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Signals */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="font-medium">100% money-back guarantee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span>Average delivery: 6-8 weeks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span>15+ MVPs built for NextIgnition founders</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}