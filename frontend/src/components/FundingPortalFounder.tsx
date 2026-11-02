import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  Video,
  Play,
  Pause,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  AlertCircle,
  CheckCircle,
  Info,
  Save,
  Sparkles,
  Menu,
  ArrowLeft,
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import api from '../services/api';
import { toast } from 'sonner';
import { exportTemplatePptx, fillTemplate } from '../services/templateService';
import { getMyStartups } from '../services/startupService';
import { getCurrentUser } from '../services/authService';
import { useMediaPermission } from '../hooks/useMediaPermission';

interface Step {
  id: number;
  title: string;
  status: 'completed' | 'active' | 'pending';
}

interface Document {
  name: string;
  required: boolean;
  uploaded: boolean;
  file?: File;
}

interface UploadedFileMeta {
  url: string;
  originalName?: string;
  size?: number;
  uploadedAt?: string;
}

export interface FundingPortalFounderProps {
  onBackToDashboard?: () => void;
  onMenuClick?: () => void;
}

export function FundingPortalFounder({ onBackToDashboard, onMenuClick }: FundingPortalFounderProps) {
  const { requestPermission: requestCameraPermission } = useMediaPermission('camera');
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingUploading, setRecordingUploading] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [pitchDeckUploaded, setPitchDeckUploaded] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showSubmitPopup, setShowSubmitPopup] = useState(false);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [pitchDeck, setPitchDeck] = useState<UploadedFileMeta | null>(null);
  const [pitchDeckSlides, setPitchDeckSlides] = useState<{ index: number; text: string }[]>([]);
  const [pitchDeckSlideCount, setPitchDeckSlideCount] = useState<number | null>(null);
  const [pitchVideo, setPitchVideo] = useState<UploadedFileMeta | null>(null);
  const [businessDocuments, setBusinessDocuments] = useState<(UploadedFileMeta & { docType?: string })[]>([]);
  const [selectedBusinessDocType, setSelectedBusinessDocType] = useState<string>('');
  const [fundingApplicationId, setFundingApplicationId] = useState<string>('');
  const [downloadingImprovedDeck, setDownloadingImprovedDeck] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Existing startups state
  const [existingStartups, setExistingStartups] = useState<any[]>([]);
  const [startupsLoading, setStartupsLoading] = useState(true);
  const [selectedExistingStartup, setSelectedExistingStartup] = useState<string | null>(null);

  const [startupName, setStartupName] = useState('');
  const [pitchSummary, setPitchSummary] = useState('');
  const [fundingAmount, setFundingAmount] = useState('');
  const [equityOffered, setEquityOffered] = useState('');
  const [demoVideoLink, setDemoVideoLink] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordedVideoUrlRef = useRef<string | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pitchDeckInputRef = useRef<HTMLInputElement>(null);
  const pitchVideoInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const steps: Step[] = [
    { id: 1, title: 'Profile Complete', status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending' },
    { id: 2, title: 'Pitch Deck Upload', status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending' },
    { id: 3, title: 'Pitch Video', status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending' },
    { id: 4, title: 'Business Documents', status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'active' : 'pending' },
    { id: 5, title: 'Final Review', status: currentStep === 5 ? 'active' : 'pending' },
  ];

  const [documents, setDocuments] = useState<Document[]>([
    { name: 'Business Plan', required: true, uploaded: false },
    { name: 'Financial Projections', required: true, uploaded: false },
    { name: 'Cap Table', required: true, uploaded: false },
    { name: 'Market Research', required: false, uploaded: false },
    { name: 'Product Demo', required: false, uploaded: false },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/funding/my-submission');
        const draft = res.data;
        if (!draft) return;

        if (draft._id) setFundingApplicationId(String(draft._id));

        setPitchDeck(draft.pitchDeck || null);
        setPitchDeckUploaded(!!draft.pitchDeck?.url || !!draft.pitchDeckUrl);

        if (draft.pitchDeckAnalysis?.analysis?.extractedSlides) {
          setPitchDeckSlides(draft.pitchDeckAnalysis.analysis.extractedSlides);
        }
        if (typeof draft.pitchDeckAnalysis?.analysis?.extractedSlideCount === 'number') {
          setPitchDeckSlideCount(draft.pitchDeckAnalysis.analysis.extractedSlideCount);
        }
        setPitchVideo(draft.pitchVideo || null);
        setHasRecording(!!draft.pitchVideo?.url || !!draft.demoVideoUrl);
        setBusinessDocuments(draft.businessDocuments || []);

        if (draft.title) setStartupName(draft.title);
        if (draft.pitchSummary) setPitchSummary(draft.pitchSummary);
        if (draft.fundingAsk) setFundingAmount(Number(draft.fundingAsk).toLocaleString('en-IN'));
        if (draft.equityOffered) setEquityOffered(String(draft.equityOffered));
        if (draft.demoVideoUrl) setDemoVideoLink(draft.demoVideoUrl);
        if (Array.isArray(draft.tags)) setSelectedIndustries(draft.tags);

        setDocuments(prev => prev.map((doc) => ({
          ...doc,
          uploaded: !!(draft.businessDocuments || []).find((d: any) => d.docType === doc.name)
        })));

        setTimeout(() => setDataLoaded(true), 500);
      } catch {
        setDataLoaded(true);
      }
    })();

    // Fetch existing startups
    (async () => {
      try {
        const startups = await getMyStartups();
        const currentUser = getCurrentUser();
        const uid = currentUser?._id || currentUser?.id;

        // Deduplicate and filter by current user
        const filtered = (startups || []).filter((s: any, index: number, self: any[]) => {
          const sid = s.id || s._id;
          const isFirst = self.findIndex(t => (t.id || t._id) === sid) === index;
          if (!isFirst) return false;

          // If we have user ID, only show startups explicitly belonging to this user
          const ownerId = s.founder?._id || s.founder || s.userId || s.creatorId;
          return uid && ownerId && String(ownerId) === String(uid);
        });

        setExistingStartups(filtered);
      } catch {
        // ignore – user might not have startups
      } finally {
        setStartupsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    setSaveStatus('Saving...');
    const timer = setTimeout(() => {
      api.put('/funding/my-submission', {
        title: startupName || 'Funding Application',
        pitchSummary,
        fundingAsk: fundingAmount ? Number(fundingAmount.replace(/,/g, '')) : undefined,
        currency: 'INR',
        equityOffered: equityOffered ? Number(equityOffered) : undefined,
        demoVideoUrl: demoVideoLink,
        tags: selectedIndustries,
        visibilityPlan: selectedPlan,
        steps: { profileComplete: true },
      })
        .then(() => setSaveStatus('Saved just now'))
        .catch(() => setSaveStatus('Error saving draft'));
    }, 1500);
    return () => clearTimeout(timer);
  }, [startupName, pitchSummary, fundingAmount, equityOffered, demoVideoLink, selectedIndustries, selectedPlan, dataLoaded]);

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const cleanupRecordedUrl = () => {
    if (recordedVideoUrlRef.current) {
      URL.revokeObjectURL(recordedVideoUrlRef.current);
      recordedVideoUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopMediaTracks();
      cleanupRecordedUrl();
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);

  const handleDownloadImprovedDeck = async () => {
    try {
      setSubmitError('');
      setDownloadingImprovedDeck(true);

      if (!fundingApplicationId) {
        throw new Error('Missing funding application id. Please refresh and try again.');
      }

      const backendTemplateId = 'pitch-deck-classic-10';
      const filled = await fillTemplate(backendTemplateId, { fundingApplicationId });
      const exported = await exportTemplatePptx(backendTemplateId, { slides: filled.slides });

      if (exported?.downloadUrl) {
        window.open(exported.downloadUrl, '_blank');
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to export improved pitch deck');
    } finally {
      setDownloadingImprovedDeck(false);
    }
  };

  const uploadRecordedPitchVideo = async (blob: Blob) => {
    const file = new File([blob], `pitch-video-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
    const form = new FormData();
    form.append('pitchVideo', file);
    const res = await api.post('/funding/pitch-video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const meta = res.data?.pitchVideo || null;
    setPitchVideo(meta);
    setHasRecording(true);
  };

  const startRecording = async () => {
    setRecordingError('');
    setRecordingUploading(false);
    cleanupRecordedUrl();
    recordedBlobRef.current = null;
    recordingChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => { });
      }

      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          recordingChunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(recordingChunksRef.current, { type: mimeType || 'video/webm' });
          recordedBlobRef.current = blob;

          cleanupRecordedUrl();
          const url = URL.createObjectURL(blob);
          recordedVideoUrlRef.current = url;

          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
            videoRef.current.muted = false;
            videoRef.current.controls = true;
          }

          stopMediaTracks();

          setRecordingUploading(true);
          await uploadRecordedPitchVideo(blob);
        } catch (err: any) {
          setRecordingError(err?.response?.data?.message || err?.message || 'Failed to upload recorded video');
        } finally {
          setRecordingUploading(false);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 120) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      
      if (isPermissionDenied) {
        // Use centralized permission handling
        requestCameraPermission();
      } else {
        const errorMsg = err?.message || 'Failed to access camera/microphone';
        setRecordingError(errorMsg);
        toast.error(errorMsg);
      }
      
      stopMediaTracks();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setHasRecording(true);

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRetakeRecording = () => {
    setRecordingError('');
    setHasRecording(false);
    setRecordingTime(0);
    recordedBlobRef.current = null;
    cleanupRecordedUrl();

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
      videoRef.current.controls = false;
      videoRef.current.muted = true;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append('documents', f));
      if (selectedBusinessDocType) {
        form.append('docType', selectedBusinessDocType);
      }
      const res = await api.post('/funding/business-documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newDocs = res.data?.businessDocuments || [];
      setBusinessDocuments(newDocs);

      setDocuments(prev => prev.map((doc) => (
        doc.name === selectedBusinessDocType ? { ...doc, uploaded: true } : doc
      )));

      // If one file was uploaded, trigger AI analysis for it automatically
      if (files.length === 1 && selectedBusinessDocType) {
        const uploadedMeta = newDocs.find((d: any) => d.docType === selectedBusinessDocType);
        if (uploadedMeta) {
          try {
            const analyzeForm = new FormData();
            analyzeForm.append('document', files[0]);
            analyzeForm.append('docType', selectedBusinessDocType);
            // We'll show a "Analyzing..." state in the UI via state
            const analysisRes = await api.post('/ignition/analyze-document', analyzeForm, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Analysis is saved on backend, we could store it in local state to show immediately
            setBusinessDocuments(prev => prev.map(d =>
              d.url === uploadedMeta.url ? { ...d, analysis: analysisRes.data } : d
            ));
          } catch (err) {
            console.warn('Auto-analysis failed:', err);
          }
        }
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to upload documents');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedBusinessDocType('');
    }
  };

  const triggerBusinessDocUpload = (docType: string) => {
    setSelectedBusinessDocType(docType);
    fileInputRef.current?.click();
  };

  const handlePitchDeckUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('pitchDeck', file);
      const res = await api.post('/funding/pitch-deck', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const meta = res.data?.pitchDeck || null;
      setPitchDeck(meta);
      setPitchDeckUploaded(true);
      setPitchDeckSlides(res.data?.extractedSlides || []);
      setPitchDeckSlideCount(typeof res.data?.extractedSlideCount === 'number' ? res.data.extractedSlideCount : null);
      // Show the analysis panel once we actually have extracted content (no fake timer).
      setShowAIAnalysis(!!(res.data?.extractedSlides?.length) || typeof res.data?.extractedSlideCount === 'number');
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to upload pitch deck');
    } finally {
      if (pitchDeckInputRef.current) pitchDeckInputRef.current.value = '';
    }
  };

  const handlePitchVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('pitchVideo', file);
      const res = await api.post('/funding/pitch-video', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const meta = res.data?.pitchVideo || null;
      setPitchVideo(meta);
      setHasRecording(true);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to upload pitch video');
    } finally {
      if (pitchVideoInputRef.current) pitchVideoInputRef.current.value = '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleScheduleReview = () => {
    // In a real app, this would open a calendar or contact form
    alert('A pitch expert will contact you within 24 hours to schedule your review.');
  };

  const handleChatFeedback = () => {
    // Navigate to AI Chat tab or open a slide-over
    window.location.hash = '#ai-spark';
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSaveProfile = async () => {
    setSubmitError('');
    setSavingProfile(true);
    try {
      await api.put('/funding/my-submission', {
        title: startupName || 'Funding Application',
        pitchSummary,
        fundingAsk: fundingAmount ? Number(fundingAmount.replace(/,/g, '')) : undefined,
        currency: 'INR',
        equityOffered: equityOffered ? Number(equityOffered) : undefined,
        demoVideoUrl: demoVideoLink,
        tags: selectedIndustries,
        steps: {
          profileComplete: true,
        },
      });
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/funding/my-submission/submit', { title: startupName });
      setIsSubmitted(true);
      setShowSubmitPopup(true);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="flex h-full w-full bg-gray-50 overflow-hidden">
      {/* Progress Tracker Sidebar */}
      <aside className="hidden lg:block w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Pitch Submission</h3>
              <span className="text-2xl font-bold" style={{ color: brandColors.electricBlue }}>
                {progressPercentage}%
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">Complete all steps to submit your pitch</p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : step.status === 'active'
                        ? 'text-white'
                        : 'bg-gray-200 text-gray-500'
                      }`}
                    style={step.status === 'active' ? { backgroundColor: brandColors.electricBlue } : {}}
                  >
                    {step.status === 'completed' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-0.5 h-12 ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 pt-2">
                  <h4
                    className={`font-bold text-sm mb-1 ${step.status === 'active' ? 'text-gray-900' : 'text-gray-600'
                      }`}
                  >
                    {step.title}
                  </h4>
                  {step.status === 'active' && (
                    <p className="text-xs text-gray-500">In Progress</p>
                  )}
                  {step.status === 'completed' && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Help Section Removed */}
        </div>
      </aside>

      {/* Mobile Progress Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center gap-3">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
              title="Menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
          )}
          {onBackToDashboard && (
            <button 
              onClick={onBackToDashboard}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900">Funding Portal</h1>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-all ${step.status === 'completed' ? 'w-8 bg-green-500' :
                  step.status === 'active' ? 'w-12' : 'w-2 bg-gray-300'
                  }`}
                style={step.status === 'active' ? { backgroundColor: brandColors.electricBlue } : {}}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pt-24 lg:pt-0 pb-12">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          {/* Autosave Indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className={`flex items-center gap-2 text-sm transition-colors ${saveStatus === 'Saving...' ? 'text-blue-600 font-bold animate-pulse' : saveStatus.includes('Error') ? 'text-red-500' : 'text-gray-600'}`}>
              <Save className="w-4 h-4" />
              <span>{saveStatus}</span>
            </div>
            <button
              onClick={handlePreview}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Profile Complete */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Complete Your Startup Profile</h2>
                  <p className="text-gray-600">
                    This information powers your investor discovery card and deal room preview.
                  </p>
                </div>

                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{submitError}</div>
                )}

                {/* Existing Startups Selector */}
                {!startupsLoading && existingStartups.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 lg:p-8 border-2 border-blue-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-lg text-gray-900">Use an Existing Startup</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Select one of your existing startups to auto-fill the profile, or start fresh below.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {existingStartups.map((s: any) => {
                        const sid = s.id || s._id;
                        const isSelected = selectedExistingStartup === sid;
                        return (
                          <button
                            key={sid}
                            onClick={() => {
                              if (isSelected) {
                                // Deselect – clear prefilled fields
                                setSelectedExistingStartup(null);
                                setStartupName('');
                                setPitchSummary('');
                                setFundingAmount('');
                                setEquityOffered('');
                                setDemoVideoLink('');
                                setSelectedIndustries([]);
                                return;
                              }
                              setSelectedExistingStartup(sid);
                              setStartupName(s.name || '');
                              setPitchSummary(s.description || s.tagline || '');
                              if (s.funding?.target) {
                                setFundingAmount(Number(s.funding.target).toLocaleString('en-IN'));
                              }
                              if (s.funding?.equity) {
                                setEquityOffered(String(s.funding.equity));
                              }
                              if (s.demoVideoUrl) {
                                setDemoVideoLink(s.demoVideoUrl);
                              }
                              const tags = [
                                ...(Array.isArray(s.industry) ? s.industry : s.industry ? [s.industry] : []),
                                ...(Array.isArray(s.tags) ? s.tags : []),
                              ];
                              if (tags.length > 0) {
                                setSelectedIndustries([...new Set(tags)]);
                              }
                            }}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              isSelected ? 'text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                              style={isSelected ? { background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` } : {}}
                            >
                              {s.logo ? (
                                <img src={s.logo} alt={s.name} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                (s.name || 'S').substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                {s.name || 'Unnamed Startup'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {s.stage ? s.stage.charAt(0).toUpperCase() + s.stage.slice(1) + ' Stage' : ''}
                                {s.stage && (Array.isArray(s.industry) ? s.industry.length > 0 : s.industry) ? ' • ' : ''}
                                {Array.isArray(s.industry) ? s.industry.join(', ') : s.industry || ''}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedExistingStartup && (
                      <p className="text-xs text-blue-600 mt-3 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Startup data loaded! You can edit any field below before saving.
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-2xl p-6 lg:p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Startup Name</label>
                    <input name="input-44d52c"
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      placeholder="Enter your startup name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Pitch Summary</label>
                    <textarea name="textarea-b1bfad"
                      value={pitchSummary}
                      onChange={(e) => setPitchSummary(e.target.value)}
                      placeholder="Describe what you’re building, who it’s for, and why now"
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Funding Ask (INR)</label>
                      <input name="input-e488ce"
                        value={fundingAmount}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, '');
                          if (/^\d*$/.test(rawValue)) {
                            setFundingAmount(rawValue ? Number(rawValue).toLocaleString('en-IN') : '');
                          }
                        }}
                        placeholder="e.g. 20,00,000"
                        inputMode="numeric"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Equity Offered (%)</label>
                      <input name="input-2cbc1a"
                        value={equityOffered}
                        onChange={(e) => setEquityOffered(e.target.value)}
                        placeholder="e.g. 10"
                        inputMode="decimal"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Demo Video Link (optional)</label>
                    <input name="input-dde8f3"
                      value={demoVideoLink}
                      onChange={(e) => setDemoVideoLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Industries / Tags</label>
                    <input name="input-ad99c6"
                      value={selectedIndustries.join(', ')}
                      onChange={(e) => {
                        const next = e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        setSelectedIndustries(next);
                      }}
                      placeholder="e.g. SaaS, AI, FinTech"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">Comma-separated. These power investor discovery filters.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="px-6 py-3 rounded-lg font-bold text-white transition-all hover:shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                    >
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button
                      onClick={handlePreview}
                      className="px-6 py-3 rounded-lg font-bold border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Preview Investor View
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Pitch Deck Upload */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Upload Your Pitch Deck</h2>
                  <p className="text-gray-600">
                    Share your pitch deck to help investors understand your vision, market opportunity, and business model.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 lg:p-8">
                  {/* Upload/Preview Section */}
                  <div>
                    <div className="bg-white rounded-2xl p-6 lg:p-8">
                      {!pitchDeckUploaded ? (
                        <div
                          onClick={() => pitchDeckInputRef.current?.click()}
                          className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                          style={{ borderColor: brandColors.electricBlue }}
                        >
                          <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: brandColors.electricBlue }} />
                          <h3 className="font-bold mb-2">Drag and drop your pitch deck here</h3>
                          <p className="text-sm text-gray-600 mb-4">or click to browse</p>
                          <p className="text-xs text-gray-500">
                            Accepted formats: PDF, PPT, PPTX (max 50MB)
                          </p>
                          <input name="input-900363"
                            ref={pitchDeckInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.ppt,.pptx"
                            onChange={handlePitchDeckUpload}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Uploaded Deck Preview */}
                          <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-500 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-gray-900 truncate">{pitchDeck?.originalName || 'Pitch Deck'}</h4>
                              <p className="text-xs text-gray-600">{pitchDeck?.size ? `${(pitchDeck.size / (1024 * 1024)).toFixed(1)} MB` : ''}</p>
                            </div>
                            <button
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                              onClick={() => {
                                setPitchDeckUploaded(false);
                                setPitchDeck(null);
                                setShowAIAnalysis(false);
                              }}
                            >
                              <X className="w-4 h-4 text-green-700" />
                            </button>
                          </div>

                          {pitchDeck?.url && (
                            <iframe
                              src={
                                pitchDeck.url.toLowerCase().endsWith('.pdf')
                                  ? `${pitchDeck.url}#view=FitH`
                                  : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pitchDeck.url)}`
                              }
                              className="w-full h-[500px] rounded-xl border-2 border-gray-200 bg-gray-50 object-cover"
                              title="Pitch Deck Document"
                            />
                          )}

                          {/* AI Analysis Progress */}
                          {!showAIAnalysis && (
                            <div className="p-5 bg-gradient-to-br from-[#6666FF]/10 to-[#F78405]/10 border border-[#6666FF]/30 rounded-xl">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="relative flex-shrink-0">
                                  <Sparkles className="w-5 h-5 text-[#6666FF] animate-pulse" />
                                  <div className="absolute inset-0 bg-[#6666FF] opacity-20 blur-xl animate-pulse" />
                                </div>
                                <h4 className="font-bold text-sm text-gray-900">AI is analyzing your pitch deck...</h4>
                              </div>
                              <div className="bg-gray-200 rounded-full h-2">
                                <motion.div
                                  className="h-full rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405]"
                                  initial={{ width: '0%' }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 2 }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Analysis Results */}
                  {showAIAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-6 lg:p-8 border-2 border-[#6666FF]/30"
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center text-white font-bold">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">Pitch Deck Processed</h3>
                          <p className="text-xs text-gray-600">
                            {pitchDeckSlideCount != null ? `${pitchDeckSlideCount} slide${pitchDeckSlideCount === 1 ? '' : 's'} extracted` : 'Content extracted from your deck'}
                          </p>
                        </div>
                      </div>

                      {/* Real extracted slide content (no fabricated scoring). */}
                      {pitchDeckSlides.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {pitchDeckSlides.map((slide) => (
                            <div key={slide.index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-xs font-bold text-gray-500 mb-1">Slide {slide.index + 1}</p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-4">{slide.text || '(no text detected)'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Your deck was uploaded. Detailed AI scoring isn't available yet.
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200">
                        <button
                          onClick={handleDownloadImprovedDeck}
                          disabled={downloadingImprovedDeck}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          {downloadingImprovedDeck ? 'Generating...' : 'Download Improved Version'}
                        </button>
                        <button
                          onClick={handleChatFeedback}
                          className="flex-1 px-4 py-3 border-2 border-[#6666FF] text-[#6666FF] rounded-lg font-medium text-sm hover:bg-[#6666FF]/5 transition-colors flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Chat About Feedback
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tips Section */}
                <div className="bg-white rounded-2xl p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Pitch Deck Best Practices
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <FileText className="w-6 h-6 text-blue-600 mb-2" />
                      <h4 className="font-bold text-sm mb-1">Keep it concise</h4>
                      <p className="text-xs text-gray-600">10-15 slides is ideal for seed stage</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-blue-600 mb-2" />
                      <h4 className="font-bold text-sm mb-1">Show traction</h4>
                      <p className="text-xs text-gray-600">Metrics matter more than promises</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <DollarSign className="w-6 h-6 text-blue-600 mb-2" />
                      <h4 className="font-bold text-sm mb-1">Clear ask</h4>
                      <p className="text-xs text-gray-600">Specify funding amount and use</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Pitch Video */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Record Your Pitch Video</h2>
                  <p className="text-gray-600">
                    A 2-minute video pitch helps investors connect with you and your vision.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 lg:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">Upload pitch video</h3>
                      <p className="text-xs text-gray-600">Accepted formats: MP4, WEBM, MOV (max 200MB)</p>
                    </div>
                    <div>
                      <button
                        onClick={() => pitchVideoInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                      >
                        Upload Video
                      </button>
                      <input name="input-78a1af"
                        ref={pitchVideoInputRef}
                        type="file"
                        className="hidden"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handlePitchVideoUpload}
                      />
                    </div>
                  </div>

                  {pitchVideo?.url && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm text-green-800 font-medium">Uploaded: {pitchVideo.originalName || 'Pitch Video'}</p>
                      <a className="text-xs text-green-700 underline" href={pitchVideo.url} target="_blank" rel="noreferrer">View</a>
                    </div>
                  )}
                </div>

                {/* Video Recording Area */}
                <div className="bg-white rounded-2xl p-6 lg:p-8">
                  <div className="max-w-2xl mx-auto">
                    {/* Camera Preview */}
                    <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />

                      {!isRecording && !hasRecording && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-white">
                            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-sm opacity-75">Camera preview will appear here</p>
                          </div>
                        </div>
                      )}
                      {hasRecording && !isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <button
                            onClick={() => {
                              const v = videoRef.current;
                              if (!v) return;
                              // A video restored from a saved URL has no src set (only
                              // fresh recordings set it). Point it at the saved URL first.
                              if (!v.src && !v.srcObject && pitchVideo?.url) {
                                v.srcObject = null;
                                v.src = pitchVideo.url;
                                v.muted = false;
                                v.controls = true;
                              }
                              v.play().catch(() => { });
                            }}
                            className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                          >
                            <Play className="w-8 h-8 text-gray-900 ml-1" />
                          </button>
                        </div>
                      )}

                      {isRecording && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          <span className="font-bold text-sm">REC {formatTime(recordingTime)}</span>
                        </div>
                      )}
                    </div>

                    {/* Recording Controls */}
                    <div className="flex items-center justify-center gap-4">
                      {!hasRecording ? (
                        <>
                          <button
                            onClick={handleRecord}
                            disabled={recordingUploading}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-red-500 hover:bg-red-600 hover:scale-110'
                              }`}
                          >
                            {isRecording ? (
                              <Pause className="w-8 h-8 text-white" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white" />
                            )}
                          </button>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">
                              {recordingUploading
                                ? 'Uploading...'
                                : isRecording
                                  ? 'Recording...'
                                  : 'Click to start recording'}
                            </p>
                            <p className="text-xs text-gray-500">Maximum 2 minutes</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleRetakeRecording}
                            disabled={recordingUploading}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span className="font-medium">Retake</span>
                          </button>
                          <div className="text-center">
                            <p className="text-sm font-bold text-green-600 flex items-center justify-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              {recordingUploading ? 'Saving...' : 'Recording Complete'}
                            </p>
                            <p className="text-xs text-gray-500">Click continue to proceed</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tips */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Video className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-blue-900">Good lighting</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-blue-900">Look at camera</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-blue-900">Be enthusiastic</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Business Documents */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Upload Business Documents</h2>
                  <p className="text-gray-600">
                    Provide essential documents to help investors evaluate your startup.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 lg:p-8">
                  {/* Upload Zone */}
                  <div
                    onClick={() => triggerBusinessDocUpload('Business Document')}
                    className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors mb-8"
                    style={{ borderColor: brandColors.electricBlue }}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: brandColors.electricBlue }} />
                    <h3 className="font-bold mb-2">Drag and drop files here</h3>
                    <p className="text-sm text-gray-600 mb-4">or click to browse</p>
                    <p className="text-xs text-gray-500">
                      Accepted formats: PDF, PPT, DOCX (max 10MB per file)
                    </p>
                    <input name="input-3056c5"
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.ppt,.pptx,.doc,.docx"
                      onChange={handleFileUpload}
                      multiple
                    />
                  </div>

                  {businessDocuments.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-bold mb-4">Uploaded Files</h3>
                      <div className="space-y-4">
                        {businessDocuments.map((doc, idx) => (
                          <div key={`${doc.url}-${idx}`} className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{doc.originalName || 'Document'}</p>
                                <p className="text-xs text-gray-600">{doc.docType || 'Business Document'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                {(doc as any).analysis && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                    <Sparkles className="w-3 h-3" />
                                    Score: {(doc as any).analysis.score}/100
                                  </div>
                                )}
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold hover:underline"
                                  style={{ color: brandColors.electricBlue }}
                                >
                                  View
                                </a>
                              </div>
                            </div>

                            {/* Analysis Result Card */}
                            {(doc as any).analysis && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="ml-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-3"
                              >
                                <div className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold text-gray-900">Strengths</p>
                                    <ul className="text-[10px] text-gray-600 list-disc ml-3 mt-1">
                                      {((doc as any).analysis.strengths || []).slice(0, 3).map((s: string, i: number) => (
                                        <li key={i}>{s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold text-gray-900">Areas to Improve</p>
                                    <ul className="text-[10px] text-gray-600 list-disc ml-3 mt-1">
                                      {((doc as any).analysis.gaps || []).slice(0, 3).map((g: string, i: number) => (
                                        <li key={i}>{g}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Documents Checklist */}
                  <div>
                    <h3 className="font-bold mb-4">Required Documents</h3>
                    <div className="space-y-3">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 ${doc.uploaded
                            ? 'border-green-500 bg-green-50'
                            : doc.required
                              ? 'border-gray-200 bg-white'
                              : 'border-gray-100 bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            {doc.uploaded ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{doc.name}</p>
                              <p className="text-xs text-gray-500">
                                {doc.required ? 'Required' : 'Optional'}
                              </p>
                            </div>
                          </div>
                          {doc.uploaded ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-700 font-medium">Uploaded</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => triggerBusinessDocUpload(doc.name)}
                              className="text-xs font-bold hover:underline"
                              style={{ color: brandColors.electricBlue }}
                            >
                              Upload
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Final Review */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Final Review & Submit</h2>
                  <p className="text-gray-600">
                    Review your pitch and choose how you want to reach investors.
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {(startupName || 'TS').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold">{startupName || 'Your Startup'}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {pitchSummary || 'Add a short pitch summary to improve your investor card.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold mb-3">Pitch Materials</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Pitch Deck</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Pitch Video</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{businessDocuments.length} Documents</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visibility Plans */}
                <div className="bg-white rounded-2xl p-6 lg:p-8">
                  <h3 className="font-bold text-lg mb-6">Choose Your Visibility Plan</h3>

                  <div className="space-y-4">
                    {/* Basic Plan */}
                    <label className="block">
                      <div
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'basic'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="radio"
                            name="plan"
                            value="basic"
                            checked={selectedPlan === 'basic'}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold">Basic Listing</h4>
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                                FREE
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              Your pitch appears in investor search results
                            </p>
                            <ul className="space-y-1 text-sm text-gray-600">
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                Listed in investor search
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                Basic analytics
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* Featured Plan — paid subscription, hidden on iOS (Apple Guideline 3.1.1) */}
                    {Capacitor.getPlatform() !== 'ios' && (
                    <label className="block">
                      <div
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'featured'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="radio"
                            name="plan"
                            value="featured"
                            checked={selectedPlan === 'featured'}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold">Featured Listing</h4>
                              <span
                                className="px-2 py-0.5 text-white text-xs font-bold rounded"
                                style={{ backgroundColor: brandColors.atomicOrange }}
                              >
                                RECOMMENDED
                              </span>
                              {Capacitor.getPlatform() !== 'ios' && (
                                <span className="font-bold text-lg ml-auto">₹2,999</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              Top placement + AI matching to relevant investors
                            </p>
                            <ul className="space-y-1 text-sm text-gray-600">
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                Priority in search results
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                AI-powered investor matching
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                Advanced analytics
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </label>
                    )}

                    {/* Direct Plan — paid subscription, hidden on iOS (Apple Guideline 3.1.1) */}
                    {Capacitor.getPlatform() !== 'ios' && (
                    <label className="block">
                      <div
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'direct'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="radio"
                            name="plan"
                            value="direct"
                            checked={selectedPlan === 'direct'}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold">Investor Direct</h4>
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              {Capacitor.getPlatform() !== 'ios' && (
                                <span className="font-bold text-lg ml-auto">₹4,999</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              Auto-sent to 50+ relevant investors in your category
                            </p>
                            <ul className="space-y-1 text-sm text-gray-600">
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                All Featured benefits
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                Direct email to 50+ investors
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                Meeting request priority
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </label>
                    )}
                  </div>

                  {/* Terms */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input name="input-94b739"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">
                        I agree to NextIgnition's{' '}
                        <span className="font-medium text-gray-900">
                          pitch guidelines
                        </span>{' '}
                        and{' '}
                        <span className="font-medium text-gray-900">
                          terms of service
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    disabled={!agreedToTerms}
                    className={`w-full mt-6 py-4 rounded-xl font-bold text-white text-lg transition-all ${agreedToTerms
                      ? 'hover:shadow-lg hover:scale-[1.02]'
                      : 'opacity-50 cursor-not-allowed'
                      }`}
                    style={{
                      background: agreedToTerms
                        ? `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                        : '#ccc',
                    }}
                    onClick={() => setShowSubmitPopup(true)}
                  >
                    Submit Pitch for Review
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pb-8">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${currentStep === 1
                ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {currentStep < 5 && (
              <button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showSubmitPopup && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 lg:p-8 max-w-md w-full mx-4"
                >
                  {!isSubmitted ? (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg">Submit Your Pitch</h3>
                        <button
                          onClick={() => setShowSubmitPopup(false)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <p className="text-sm text-gray-600 mb-6">
                        Are you sure you want to submit your pitch for review? Once submitted, your pitch will be visible to investors based on your selected plan.
                      </p>

                      {submitError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{submitError}</div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                        <button
                          onClick={() => setShowSubmitPopup(false)}
                          className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            setSubmitError('');
                            setSubmitting(true);
                            try {
                              await api.put('/funding/my-submission', {
                                title: startupName || 'Funding Application',
                                pitchSummary,
                                fundingAsk: fundingAmount ? Number(fundingAmount.replace(/,/g, '')) : undefined,
                                currency: 'INR',
                                equityOffered: equityOffered ? Number(equityOffered) : undefined,
                                tags: selectedIndustries,
                              });
                              await api.post('/funding/my-submission/submit', {
                                title: startupName || 'Funding Application',
                              });
                              setIsSubmitted(true);
                            } catch (err: any) {
                              setSubmitError(err.response?.data?.message || 'Failed to submit pitch');
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          disabled={submitting}
                          className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold text-white transition-all hover:shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                        >
                          {submitting ? 'Submitting...' : 'Submit Pitch'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
                        >
                          <CheckCircle className="w-12 h-12 text-green-600" />
                        </motion.div>

                        <h3 className="font-bold text-xl lg:text-2xl mb-3">Pitch Submitted Successfully!</h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Your pitch has been submitted for review. You'll receive a notification once it's live on the platform.
                        </p>

                        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
                          <h4 className="font-bold text-sm text-blue-900 mb-2">What happens next?</h4>
                          <ul className="space-y-2 text-xs text-blue-800">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>Our team will review your pitch within 24-48 hours</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>You'll receive feedback and approval status via email</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>Once approved, investors can view and contact you</span>
                            </li>
                          </ul>
                        </div>

                        <button
                          onClick={() => {
                            setShowSubmitPopup(false);
                            setIsSubmitted(false);
                            if (onBackToDashboard) {
                              onBackToDashboard();
                            } else {
                              window.location.hash = '#founder-dashboard';
                            }
                          }}
                          className="w-full py-3 rounded-lg font-bold text-white transition-all hover:shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Startup Preview — glassmorphism discovery card as investors will see it */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-white/40 bg-white/60 backdrop-blur-2xl shadow-2xl"
            >
              {/* Top bar */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white/40 backdrop-blur-xl border-b border-white/40">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Investor Preview
                </span>
              </div>

              {(() => {
                const previewStartup = existingStartups.find((s: any) => (s.id || s._id) === selectedExistingStartup);
                const founder = getCurrentUser();
                const logo = previewStartup?.logo;
                const stage = previewStartup?.stage;
                const name = startupName || 'Your Startup';
                return (
                  <div className="p-6">
                    {/* Hero */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0 shadow-lg overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                      >
                        {logo ? <img src={logo} alt={name} className="w-full h-full object-cover" /> : name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-gray-900 truncate">{name}</h3>
                        {stage && <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{stage} Stage</p>}
                      </div>
                    </div>

                    {/* Funding chips */}
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <div className="rounded-2xl bg-white/50 border border-white/50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Seeking</p>
                        <p className="text-lg font-black text-gray-900">{fundingAmount ? `₹${fundingAmount}` : '—'}</p>
                      </div>
                      <div className="rounded-2xl bg-white/50 border border-white/50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Equity</p>
                        <p className="text-lg font-black text-gray-900">{equityOffered ? `${equityOffered}%` : '—'}</p>
                      </div>
                    </div>

                    {/* Pitch */}
                    <div className="mt-5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Pitch</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {pitchSummary || "Add a pitch summary to tell investors what you're building."}
                      </p>
                    </div>

                    {/* Industries */}
                    {selectedIndustries.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {selectedIndustries.map((tag) => (
                          <span key={tag} className="px-3 py-1 rounded-full bg-white/60 border border-white/50 text-xs font-semibold text-gray-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Assets */}
                    {(pitchDeck || pitchVideo || demoVideoLink) && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {pitchDeck && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 text-xs font-semibold text-blue-700">
                            <FileText className="w-3.5 h-3.5" /> Pitch Deck
                          </span>
                        )}
                        {(pitchVideo || demoVideoLink) && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50/80 border border-purple-100 text-xs font-semibold text-purple-700">
                            <Video className="w-3.5 h-3.5" /> Demo Video
                          </span>
                        )}
                      </div>
                    )}

                    {/* Founder */}
                    {founder?.name && (
                      <div className="mt-6 flex items-center gap-3 pt-4 border-t border-white/50">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                          {founder.avatar ? <img src={founder.avatar} alt={founder.name} className="w-full h-full object-cover" /> : (founder.name[0] || 'F').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{founder.name}</p>
                          <p className="text-[11px] text-gray-500">Founder</p>
                        </div>
                      </div>
                    )}

                    <p className="mt-5 text-[11px] text-gray-500 text-center">
                      This is how investors will see your startup on their discovery feed.
                    </p>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}