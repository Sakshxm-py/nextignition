import { Capacitor } from '@capacitor/core';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchMe, setCurrentUser } from '../services/authService';

import {
  Sparkles,
  Search,
  Settings,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RotateCw,
  Paperclip,
  ArrowLeft,
  Send,
  X,
  FileText,
  Target,
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  Edit3,
  Lightbulb,
  Briefcase,
  PenTool,
  Calendar,
  MessageSquare,
  Download,
  Share2,
  Plus,
  ChevronRight,
  Upload,
  CheckCircle,
  AlertCircle,
  Menu,
  ChevronDown,
  ChevronUp,
  Pin,
  Trash2,
  Award,
  Eye,
  Heart,
  Zap,
  MapPin,
  Bookmark
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { copyAiContent, downloadAiContent } from '../utils/aiContentDownload';
import { analyzePitchDeck, aiChat, runQuickAction, matchCofounders, matchExperts, matchClients, fetchDeckInsights, toggleSaveAiSession, getSavedAiSessions } from '../services/aiService';
import { listTemplates, exportTemplatePptx, type TemplateOption } from '../services/templateService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { toast } from 'sonner';
import api from '../services/api';

export interface IgnishaAIDashboardProps {
  userRole: 'founder' | 'expert' | 'investor';
  onBack?: () => void;
  onMenuClick?: () => void;
  currentUser?: { id: string; name: string; avatar?: string };
  onMessageUser?: (userId: string) => void;
}

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  cardData?: any;
}

interface QuickAction {
  icon: any;
  title: string;
  description: string;
  action: string;
}

interface Conversation {
  id: number | string;
  title: string;
  preview: string;
  timestamp: string;
  pinned: boolean;
  isBookmarked?: boolean;
}

type AnalysisResult = {
  summary?: string;
  executiveSummary?: string;
  highlights?: string[] | string;
  keyHighlights?: string[] | string;
  insights?: string[] | string;
  strengths?: string[] | string;
  gaps?: string[] | string;
  investorReadinessScore?: number | string;
  [key: string]: any;
};

type ScoreMetric = {
  label: string;
  score: number;
  note: string;
};

const normalizeList = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split('\n')
      .map((line) => line.replace(/^[-•\s]+/, '').trim())
      .filter(Boolean);
  }
  return [];
};

const hasAnyKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const clampScore = (score: number) => Math.max(0, Math.min(10, Math.round(score * 10) / 10));

const computePitchDeckScoreMetrics = (analysis: AnalysisResult): ScoreMetric[] => {
  // If the backend returned real AI-evaluated scores, use them directly
  if (Array.isArray(analysis.scoreMetrics) && analysis.scoreMetrics.length > 0) {
    return analysis.scoreMetrics;
  }

  // Fallback for older database entries that don't have scoreMetrics
  const summaryText = analysis.summary || analysis.executiveSummary || '';
  const highlights = normalizeList(analysis.highlights || analysis.keyHighlights || analysis.insights);
  const strengths = normalizeList(analysis.strengths);
  const gaps = normalizeList(analysis.gaps);

  const fullText = [summaryText, ...highlights, ...strengths, ...gaps].join(' ').toLowerCase();
  const readinessRaw = Number(analysis.investorReadinessScore);
  const hasReadiness = Number.isFinite(readinessRaw);

  const problemScore = clampScore(
    (hasAnyKeyword(fullText, ['problem']) ? 2 : 0) +
    (hasAnyKeyword(fullText, ['solution']) ? 2 : 0) +
    Math.min(3, highlights.length) +
    (summaryText.length > 120 ? 3 : summaryText.length > 60 ? 2 : 1)
  );

  const marketScore = clampScore(
    (hasAnyKeyword(fullText, ['market', 'tam', 'sam', 'som', 'positioning']) ? 4 : 1) +
    (hasAnyKeyword(fullText, ['growth', 'opportunity', 'segment']) ? 2 : 0) +
    (highlights.length >= 3 ? 2 : highlights.length >= 1 ? 1 : 0) +
    (gaps.length >= 3 && hasAnyKeyword(fullText, ['market validation']) ? 1 : 2)
  );

  const businessModelScore = clampScore(
    (hasAnyKeyword(fullText, ['revenue', 'subscription', 'monetization', 'pricing']) ? 5 : 1.5) +
    (hasAnyKeyword(fullText, ['gtm', 'go-to-market', 'customer']) ? 2 : 0) +
    Math.min(2, strengths.length * 0.8) +
    (hasAnyKeyword(fullText, ['unit economics', 'ltv', 'cac']) ? 1 : 0.5)
  );

  const teamScore = clampScore(
    (hasAnyKeyword(fullText, ['team', 'founder', 'advisor', 'hiring']) ? 5 : 2) +
    Math.min(3, strengths.length) +
    (hasAnyKeyword(fullText, ['experience', 'credibility']) ? 2 : 0)
  );

  const overallScore = clampScore(
    hasReadiness
      ? readinessRaw / 10
      : (problemScore + marketScore + businessModelScore + teamScore) / 4 - Math.min(1.5, gaps.length * 0.25)
  );

  return [
    { label: 'Problem & Solution', score: problemScore, note: 'Clarity of pain point and solution fit' },
    { label: 'Market Opportunity', score: marketScore, note: 'Market size, demand, and positioning signals' },
    { label: 'Business Model', score: businessModelScore, note: 'Monetization and go-to-market strength' },
    { label: 'Team Readiness', score: teamScore, note: 'Founder credibility and execution confidence' },
    { label: 'Overall Deck Score', score: overallScore, note: 'Investor readiness snapshot from AI output' },
  ];
};

const getActionPrompt = (action: string) => {
  const map: Record<string, string> = {
    validator: 'Can you validate my startup idea?',
    financial: 'Build a financial projection model for my startup.',
    competitor: 'Analyze competitors in my space.',
    content: 'Draft a founder LinkedIn post for my product update.',
    template: 'Generate a startup template pack for me.',
  };
  return map[action] || `Run the "${action}" AI action and provide an actionable result.`;
};

const formatActionResponseMarkdown = (type: string, data: any) => {
  if (!data || typeof data !== 'object') {
    return 'Unable to generate an AI response for this action.';
  }

  if (type === 'businessValidator') {
    const strengths = normalizeList(data?.strengths);
    const risks = normalizeList(data?.risks);
    const nextSteps = normalizeList(data?.nextSteps);
    return [
      '## Business Validator',
      typeof data?.score !== 'undefined' ? `**Score:** ${String(data.score)}/10` : '',
      data?.verdict ? `**Verdict:** ${String(data.verdict)}` : '',
      strengths.length ? `### Strengths\n${strengths.map((s) => `- ${s}`).join('\n')}` : '',
      risks.length ? `### Risks\n${risks.map((s) => `- ${s}`).join('\n')}` : '',
      nextSteps.length ? `### Next steps\n${nextSteps.map((s) => `- ${s}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  if (type === 'financialProjection') {
    const assumptions = normalizeList(data?.assumptions);
    const projections = Array.isArray(data?.projections) ? data.projections : [];
    const projectionTable = projections.length
      ? [
          '| Year | Revenue | Expenses | Runway |',
          '| --- | --- | --- | --- |',
          ...projections.map(
            (row: any) => `| ${row?.year || ''} | ${row?.revenue || ''} | ${row?.expenses || ''} | ${row?.runway || ''} |`
          ),
        ].join('\n')
      : '';
    return [
      '## Financial Projections',
      assumptions.length ? `### Assumptions\n${assumptions.map((s) => `- ${s}`).join('\n')}` : '',
      projectionTable ? `### 3-year snapshot\n${projectionTable}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  if (type === 'competitorAnalysis') {
    const competitors = Array.isArray(data?.competitors) ? data.competitors : [];
    const table = competitors.length
      ? [
          '| Competitor | Focus | Your Edge |',
          '| --- | --- | --- |',
          ...competitors.map((c: any) => `| ${c?.name || ''} | ${c?.focus || ''} | ${c?.edge || ''} |`),
        ].join('\n')
      : '';
    return ['## Competitor Analysis', table || (data?.summary ? String(data.summary) : '')]
      .filter(Boolean)
      .join('\n\n');
  }

  if (type === 'contentDraft') {
    const outline = normalizeList(data?.outline);
    return [
      '## Content Draft',
      data?.title ? `**Title:** ${String(data.title)}` : '',
      data?.hook ? `**Hook:** ${String(data.hook)}` : '',
      outline.length ? `### Outline\n${outline.map((s) => `- ${s}`).join('\n')}` : '',
      data?.cta ? `**CTA:** ${String(data.cta)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  if (type === 'templatePack') {
    const templates = Array.isArray(data?.templates) ? data.templates : [];
    // iOS ships fully free — never expose plan-tier labels (Apple Guideline 3.1.1).
    const hideTier = Capacitor.getPlatform() === 'ios';
    const table = templates.length
      ? (hideTier
        ? [
            '| Template | Type |',
            '| --- | --- |',
            ...templates.map((t: any) => `| ${t?.name || ''} | ${t?.type || ''} |`),
          ].join('\n')
        : [
            '| Template | Type | Tier |',
            '| --- | --- | --- |',
            ...templates.map((t: any) => `| ${t?.name || ''} | ${t?.type || ''} | ${t?.tier || ''} |`),
          ].join('\n'))
      : '';
    return ['## Template Pack', table || (data?.summary ? String(data.summary) : '')]
      .filter(Boolean)
      .join('\n\n');
  }

  if (type === 'startupHealthCheck') {
    const strengths = normalizeList(data?.strengths);
    const risks = normalizeList(data?.risks);
    const nextSteps = normalizeList(data?.nextSteps);
    return [
      '## Startup Health Check',
      typeof data?.overallScore !== 'undefined' ? `**Overall Score:** ${String(data.overallScore)}` : '',
      data?.summary ? String(data.summary) : '',
      strengths.length ? `### Strengths\n${strengths.map((s) => `- ${s}`).join('\n')}` : '',
      risks.length ? `### Risks\n${risks.map((s) => `- ${s}`).join('\n')}` : '',
      nextSteps.length ? `### Next steps\n${nextSteps.map((s) => `- ${s}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  if (type === 'generic') {
    const summary = typeof data?.summary === 'string' ? data.summary.trim() : '';
    const details = normalizeList(data?.details);
    return [
      summary || '## Result',
      details.length ? details.map((d) => `- ${d}`).join('\n') : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  return typeof data?.summary === 'string' ? data.summary : JSON.stringify(data, null, 2);
};

export function IgnishaAIDashboard({ userRole, onBack, onMenuClick, currentUser }: IgnishaAIDashboardProps) {
  const { hasFeature, userPlan: localPlan, getFeatureValue } = useFeatureAccess();

  // Live plan state — refreshed from server on mount so it's never stale
  const [livePlan, setLivePlan] = useState<string>(localPlan || 'free');
  const [queriesLeft, setQueriesLeft] = useState<number>(getFeatureValue('ignishaQueries') || 5);
  const [totalQueries, setTotalQueries] = useState<number>(getFeatureValue('ignishaQueries') || 5);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ignisha_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeConversation, setActiveConversation] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('ignisha_active_conversation');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [renameChatValue, setRenameChatValue] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCofounderModal, setShowCofounderModal] = useState(false);
  const [matchMode, setMatchMode] = useState<'cofounder' | 'experts' | 'client'>('cofounder');
  
  // Match Filter States
  const [matchSkills, setMatchSkills] = useState<string[]>([]);
  const [matchLocation, setMatchLocation] = useState<string>('India');
  const [matchCommitment, setMatchCommitment] = useState<string>('Full-time');
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [responseStyle, setResponseStyle] = useState(() => {
    try { return localStorage.getItem('ignisha_response_style') || 'detailed'; } catch { return 'detailed'; }
  });
  const [aiPersonality, setAiPersonality] = useState(() => {
    try { return localStorage.getItem('ignisha_ai_personality') || 'professional'; } catch { return 'professional'; }
  });
  const [showInsights, setShowInsights] = useState(true);
  const [showMobileActions, setShowMobileActions] = useState(false);
  
  const [savedSessionIds, setSavedSessionIds] = useState<Set<string | number>>(new Set());

  // Fetch fresh plan from server on mount so upgraded plans are reflected immediately
  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        if (me) {
          setCurrentUser(me);
          const role = me.role || userRole || 'founder';
          const planKey = `${role}_plan`;
          // Plan from the server (it honors the IAP entitlement on iOS); the
          // queries-left fetch then refines it via setLivePlan(serverPlan).
          const freshPlan = String(me[planKey] || 'free').toLowerCase();
          setLivePlan(freshPlan);
        }
      } catch {
        // ignore - keep local plan
      }
    })();
  }, []);

  const fetchSavedSessionsData = async () => {
    try {
      const saved = await getSavedAiSessions();
      setSavedSessionIds(new Set((saved || []).map((s: any) => s.item_id)));
    } catch (err) {
      console.error('Failed to fetch saved sessions', err);
    }
  };

  useEffect(() => {
    fetchSavedSessionsData();
  }, [currentUser]);

  // Fetch credits from backend — backend now uses the plan columns directly
  const fetchQueriesLeft = async () => {
    if (!currentUser?.id) return;
    try {
      const resp = await api.get(`/ignition/queries-left/${currentUser.id}`);
      const left = resp.data?.left ?? 0;
      const total = resp.data?.total ?? 5;
      const serverPlan = resp.data?.plan;
      setQueriesLeft(left);
      setTotalQueries(total);
      if (serverPlan) setLivePlan(serverPlan);
    } catch (error) {
      console.error('Failed to fetch queries left:', error);
    }
  };

  useEffect(() => {
    fetchQueriesLeft();
  }, [currentUser]);

  const decrementQueries = () => {
    setQueriesLeft((prev: number) => Math.max(0, prev - 1));
  };

  const [showShareToast, setShowShareToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sessionKey = (id: number | string) => `ignisha_session_${id}`;
  const loadSessionMessages = (id: number | string): Message[] => {
    try {
      const raw = localStorage.getItem(sessionKey(id));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  // Start a brand-new session (unique id) or keep the current one, so each chat
  // is archived separately and shows up in Conversation History.
  const beginSession = () => setActiveConversation((prev) => prev ?? Date.now());

  // Persist the current chat as the "last chat" AND under its own session id, and
  // keep the Conversation History list (title/preview/timestamp) in sync.
  useEffect(() => {
    localStorage.setItem('ignisha_chat_messages', JSON.stringify(messages));
    if (activeConversation == null || messages.length === 0) return;
    localStorage.setItem(sessionKey(activeConversation), JSON.stringify(messages));
    const last = messages[messages.length - 1];
    const preview = String(last?.content || '').slice(0, 70);
    setRecentSessions((prev) => {
      if (prev.some((c) => c.id === activeConversation)) {
        return prev.map((c) => (c.id === activeConversation ? { ...c, preview, timestamp: 'Just now' } : c));
      }
      const firstUser = messages.find((m) => m.type === 'user');
      const title = (firstUser?.content || 'New chat').slice(0, 40);
      return [{ id: activeConversation, title, preview, timestamp: 'Just now', pinned: false }, ...prev];
    });
  }, [messages, activeConversation]);

  useEffect(() => {
    localStorage.setItem('ignisha_active_conversation', JSON.stringify(activeConversation));
  }, [activeConversation]);

  useEffect(() => {
    try { localStorage.setItem('ignisha_response_style', responseStyle); } catch {}
  }, [responseStyle]);

  useEffect(() => {
    try { localStorage.setItem('ignisha_ai_personality', aiPersonality); } catch {}
  }, [aiPersonality]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Role-specific quick actions
  const getQuickActions = (): QuickAction[] => {
    if (userRole === 'founder') {
      return [
        { icon: FileText, title: 'Pitch Deck Analysis', description: 'Review & improve your deck', action: 'pitch-deck' },
        { icon: Target, title: 'Business Validator', description: 'Check idea viability', action: 'validator' },
        { icon: Users, title: 'Find Co-founders', description: 'AI-powered matching', action: 'cofounder' },
        { icon: Users, title: 'Find Experts', description: 'Get mentor recommendations', action: 'experts' },
        { icon: DollarSign, title: 'Financial Projections', description: 'Build revenue models', action: 'financial' },
        { icon: BarChart3, title: 'Competitor Analysis', description: 'Market research assistant', action: 'competitor' },
        { icon: Edit3, title: 'Content Creator', description: 'Write posts, articles, emails', action: 'content' },
        { icon: FileSpreadsheet, title: 'Template Generator', description: 'Pitch decks, plans, contracts', action: 'template' },
      ];
    } else if (userRole === 'expert') {
      return [
        { icon: Users, title: 'Client Matching', description: 'Find ideal startup clients', action: 'client-match' },
        { icon: Lightbulb, title: 'Content Ideas', description: 'Generate topic ideas', action: 'content-ideas' },
        { icon: Briefcase, title: 'Session Prep', description: 'Prepare for consultations', action: 'session-prep' },
        { icon: DollarSign, title: 'Pricing Calculator', description: 'Optimize your rates', action: 'pricing' },
        { icon: FileText, title: 'Course Creator', description: 'Build course outlines', action: 'course' },
        { icon: PenTool, title: 'LinkedIn Writer', description: 'Craft engaging posts', action: 'linkedin' },
        { icon: MessageSquare, title: 'Email Templates', description: 'Client communication', action: 'email' },
        { icon: FileSpreadsheet, title: 'Resource Library', description: 'Build knowledge base', action: 'resources' },
      ];
    } else {
      return [
        { icon: BarChart3, title: 'Deal Flow Analyzer', description: 'Evaluate opportunities', action: 'deal-flow' },
        { icon: Award, title: 'Startup Scorer', description: 'AI-powered ratings', action: 'scorer' },
        { icon: TrendingUp, title: 'Market Trends', description: 'Industry insights', action: 'trends' },
        { icon: Target, title: 'Portfolio Analytics', description: 'Track investments', action: 'portfolio' },
        { icon: AlertCircle, title: 'Risk Assessment', description: 'Due diligence helper', action: 'risk' },
        { icon: CheckCircle, title: 'DD Checklist', description: 'Generate checklists', action: 'checklist' },
        { icon: FileText, title: 'Term Sheets', description: 'Template library', action: 'termsheet' },
        { icon: Users, title: 'Co-investment', description: 'Find partners', action: 'coinvest' },
      ];
    }
  };

  const quickActions = getQuickActions();

  // Role-specific suggested prompts
  const getSuggestedPrompts = () => {
    if (userRole === 'founder') {
      return [
        { icon: DollarSign, text: 'How do I price my SaaS product?' },
        { icon: Calendar, text: 'Create a 6-month fundraising timeline' },
        { icon: BarChart3, text: 'What metrics do Series A investors look for?' },
        { icon: MessageSquare, text: 'Generate a cold email to investors' },
      ];
    } else if (userRole === 'expert') {
      return [
        { icon: DollarSign, text: 'How do I price my consultation services?' },
        { icon: FileText, text: 'Create an event outline on growth hacking' },
        { icon: Users, text: 'Which startups should I target as clients?' },
        { icon: PenTool, text: 'Write a LinkedIn post about my expertise' },
      ];
    } else {
      return [
        { icon: AlertCircle, text: 'What are red flags in early-stage startups?' },
        { icon: BarChart3, text: 'Analyze this startup\'s traction data' },
        { icon: CheckCircle, text: 'Create a due diligence checklist' },
        { icon: TrendingUp, text: 'Summarize FinTech market trends in India' },
      ];
    }
  };

  const suggestedPrompts = getSuggestedPrompts();

  // AI Insights
  const getAIInsights = () => {
    if (userRole === 'founder') {
      return [
        'Your pitch deck is missing a competitive analysis slide',
        '3 new co-founder matches found in your industry',
        'Trending topic: AI regulation - write about it?',
      ];
    } else if (userRole === 'expert') {
      return [
        '5 new startups match your expertise profile',
        'Create content about "fundraising strategies" - high engagement topic',
        'Your consultation rate is 20% below market average',
      ];
    } else {
      return [
        '2 portfolio companies show declining metrics',
        'New FinTech deals in your sector range',
        'Recommended: Review due diligence for StartupX',
      ];
    }
  };

  const aiInsights = getAIInsights();

  // Conversation history (Recent sessions from localStorage)
  const [recentSessions, setRecentSessions] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('ignisha_recent_sessions');
    if (saved) return JSON.parse(saved);
    return [];
  });

  useEffect(() => {
    localStorage.setItem('ignisha_recent_sessions', JSON.stringify(recentSessions));
  }, [recentSessions]);

  const handleQuickAction = async (action: string) => {
    if (action === 'pitch-deck') {
      setShowUploadModal(true);
      return;
    } else if (action === 'template') {
      setTemplateSearch('');
      setShowTemplateModal(true);
      if (templateOptions.length === 0) {
        setTemplatesLoading(true);
        listTemplates('pitch-deck')
          .then((tpls) => setTemplateOptions(tpls))
          .catch(() => toast.error('Could not load templates. Please try again.'))
          .finally(() => setTemplatesLoading(false));
      }
      return;
    } else if (action === 'cofounder' || action === 'client-match') {
      setMatchMode(action === 'client-match' ? 'client' : 'cofounder');
      setMatchSkills([]);
      setMatchLocation('India');
      setMatchCommitment('Full-time');
      setShowCofounderModal(true);
      return;
    } else if (action === 'experts') {
      setMatchMode('experts');
      setMatchSkills([]);
      setMatchLocation('India');
      setMatchCommitment('Full-time');
      setShowCofounderModal(true);
      return;
    } else {
      if (queriesLeft <= 0) {
        toast.error("You've reached your Ignisha AI query limit for this plan.", {
          action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
        });
        return;
      }
      const selected = quickActions.find((qa) => qa.action === action);
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: selected ? `${selected.title}: ${selected.description}` : getActionPrompt(action),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      beginSession();
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      decrementQueries();

      try {
        const recentContext = messages.slice(-4).map(m => `${m.type === 'user' ? 'User' : 'Ignisha'}: ${m.content}`).join('\n');
        const response = await runQuickAction(action, recentContext);
        const aiMessage: Message = {
          id: Date.now() + 1,
          type: 'ai',
          content: formatActionResponseMarkdown(response?.type, response?.data),
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          cardData: response?.data ? { type: response.type, ...response.data } : undefined,
        };
        setMessages((prev) => [...prev, aiMessage]);
        fetchQueriesLeft();
      } catch (error: any) {
        const aiMessage: Message = {
          id: Date.now() + 2,
          type: 'ai',
          content: error?.response?.data?.message || 'Unable to run this AI action right now.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleToggleSaveSession = async (conv: Conversation) => {
    try {
      const resp = await toggleSaveAiSession(conv.id);
      const isNowSaved = resp.saved;
      
      setSavedSessionIds(prev => {
        const next = new Set(prev);
        if (isNowSaved) next.add(conv.id);
        else next.delete(conv.id);
        return next;
      });

      toast.success(isNowSaved ? 'Session saved to bookmarks' : 'Bookmark removed');
    } catch (err) {
      toast.error('Failed to update bookmark');
    }
  };

  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!inputValue.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      // Use a more specific instruction for the enhancer
      const prompt = `Act as an expert prompt engineer. Enhance the following user prompt for a startup AI assistant to be more professional, detailed, and structurally clear. 
      
      CRITICAL: Return ONLY the enhanced prompt. Do not add any conversational filler, quotes, or explanations.
      
      USER PROMPT: "${inputValue}"`;
      
      const resp = await aiChat(prompt, []);
      let enhanced = resp.response || resp.content || resp.summary;
      
      if (enhanced && typeof enhanced === 'string') {
        // Clean up common AI artifacts like "Enhanced prompt:", quotes, etc.
        enhanced = enhanced
          .replace(/^(Enhanced prompt:|Here's an enhanced version:|Sure, here is an enhanced version:)/i, '')
          .replace(/^["']|["']$/g, '')
          .trim();
          
        setInputValue(enhanced);
      }
    } catch (e) {
      toast.error("Failed to enhance prompt. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const newMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
    beginSession();

    // AI response
    if (queriesLeft <= 0) {
      toast.error("You've reached your Ignisha AI query limit for this plan.", {
        action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
      });
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    decrementQueries();
    try {
      // Build conversation history from previous messages
      const conversationHistory = messages.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // Call backend AI
      const data = await aiChat(messageText, conversationHistory, { responseStyle, aiPersonality });
      const aiResponse = data.response || data.summary;
      if (!aiResponse || !String(aiResponse).trim()) {
        throw new Error('AI provider returned an empty response.');
      }

      const aiMessage: Message = {
        id: messages.length + 2,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMessage]);
      fetchQueriesLeft();
    } catch (error: any) {
      const errorMessage: Message = {
        id: messages.length + 2,
        type: 'ai',
        content: error?.response?.data?.message || error?.message || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setShowUploadModal(true);
    }
    e.target.value = '';
  };

  const handleAnalyzeFile = () => {
    if (!uploadedFile) return;

    const fileToAnalyze = uploadedFile;
    setShowUploadModal(false);
    beginSession();

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: `Analyze my pitch deck: ${fileToAnalyze.name}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    decrementQueries();

    analyzePitchDeck(fileToAnalyze)
      .then((data) => {
        const analysis = (data || {}) as AnalysisResult;
        const summaryText = analysis.summary || analysis.executiveSummary || 'Analysis completed.';
        const highlights = normalizeList(analysis.highlights || analysis.keyHighlights || analysis.insights);
        const strengths = normalizeList(analysis.strengths);
        const gaps = normalizeList(analysis.gaps);
        const scoreMetrics = computePitchDeckScoreMetrics(analysis);

        const aiMessage: Message = {
          id: Date.now() + 1,
          type: 'ai',
          content: summaryText,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          cardData: {
            type: 'pitchDeckAnalysis',
            summaryText,
            highlights,
            strengths,
            gaps,
            scoreMetrics,
          },
        };

        setMessages((prev) => [...prev, aiMessage]);
      })
      .catch((error: any) => {
        const aiErrorMessage: Message = {
          id: Date.now() + 2,
          type: 'ai',
          content: error?.response?.data?.message || 'Unable to analyze this pitch deck right now.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiErrorMessage]);
      })
      .finally(() => {
        setIsTyping(false);
        setUploadedFile(null);
      });
  };

  const handleGenerateTemplate = async (templateId: string, templateName: string) => {
    if (queriesLeft <= 0) {
      toast.error("You've reached your Ignisha AI query limit for this plan.", {
        action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' },
      });
      return;
    }

    setShowTemplateModal(false);
    beginSession();
    setGeneratingTemplateId(templateId);

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: `Generate the "${templateName}" template for my startup.`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    decrementQueries();

    try {
      const res = await exportTemplatePptx(templateId, { format: 'pptx' });
      const aiMessage: Message = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Your **${res.templateName || templateName}** is ready. Download it below — slides are pre-filled from your latest pitch deck analysis. You can refine any section and re-export.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        cardData: {
          type: 'templateExport',
          templateName: res.templateName || templateName,
          fileName: res.fileName,
          downloadUrl: res.downloadUrl || res.renderUrl,
        },
      };
      setMessages((prev) => [...prev, aiMessage]);
      fetchQueriesLeft();
    } catch (error: any) {
      const status = error?.response?.status;
      let content =
        error?.response?.data?.message || 'Unable to generate this template right now.';
      if (status === 404) {
        content =
          'I need a pitch deck analysis first to fill this template. Run **Pitch Deck Analysis** (upload your deck), then generate the template again.';
      }
      const aiErrorMessage: Message = {
        id: Date.now() + 2,
        type: 'ai',
        content,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        cardData: status === 404 ? { type: 'needAnalysis' } : undefined,
      };
      setMessages((prev) => [...prev, aiErrorMessage]);
    } finally {
      setIsTyping(false);
      setGeneratingTemplateId(null);
    }
  };

  const handleMatchResults = () => {
    const userPrompt =
      matchMode === 'experts'
        ? 'Find experts for my startup.'
        : matchMode === 'client'
          ? 'Find client matches based on my criteria.'
          : 'Find co-founder matches based on my criteria.';

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    beginSession();
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    setShowCofounderModal(false);

    const request = matchMode === 'experts'
      ? matchExperts({ needs: matchSkills.join(', '), location: matchLocation, stage: matchCommitment })
      : matchMode === 'client'
        ? matchClients({ industry: matchSkills.join(', '), stage: matchCommitment })
        : matchCofounders({ skills: matchSkills, location: matchLocation, commitment: matchCommitment });

    request
      .then((response) => {
        const aiMessage: Message = {
          id: Date.now() + 1,
          type: 'ai',
          content: response?.summary || 'Here are your matches.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          cardData: response ? { type: response.type, matches: response.matches } : undefined,
        };
        setMessages((prev) => [...prev, aiMessage]);
      })
      .catch((error: any) => {
        const aiMessage: Message = {
          id: Date.now() + 2,
          type: 'ai',
          content: error?.response?.data?.message || 'Unable to fetch matches right now.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      })
      .finally(() => {
        setIsTyping(false);
      });
  };

  const handleUseDeckInsights = () => {
    setIsTyping(true);
    fetchDeckInsights()
      .then((response) => {
        const aiMessage: Message = {
          id: Date.now(),
          type: 'ai',
          content: response?.summary || 'Generated insights from your pitch deck.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          cardData: response ? { type: 'deckInsights', cards: response.cards } : undefined,
        };
        setMessages((prev) => [...prev, aiMessage]);
      })
      .catch((error: any) => {
        const aiMessage: Message = {
          id: Date.now() + 1,
          type: 'ai',
          content: error?.response?.data?.message || 'Unable to derive deck insights right now.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      })
      .finally(() => {
        setIsTyping(false);
      });
  };

  const handleExportChat = () => {
    const chatText = messages.map(m => `${m.type === 'user' ? 'You' : 'Ignisha'} (${m.timestamp}): ${m.content}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ignisha-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareChat = async () => {
    const chatSummary = messages.slice(0, 3).map(m => m.content.substring(0, 50)).join(' | ');
    const shareText = `Check out my conversation with Ignisha AI:\n${chatSummary}...\n\nvia NextIgnition`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ignisha AI Chat', text: shareText });
      } catch {
        // User cancelled or failed
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  const startRenamingChat = () => {
    const current = recentSessions.find((c) => c.id === activeConversation);
    setRenameChatValue(current?.title || 'Current Chat');
    setIsRenamingChat(true);
  };

  const commitRenameChat = () => {
    const trimmed = renameChatValue.trim();
    if (trimmed && activeConversation !== null) {
      setRecentSessions((prev) => {
        const exists = prev.some((c) => c.id === activeConversation);
        if (exists) {
          return prev.map((c) => (c.id === activeConversation ? { ...c, title: trimmed } : c));
        }
        // Active chat not yet tracked in recent sessions — add it so the rename persists.
        return [
          {
            id: activeConversation,
            title: trimmed,
            preview: messages[messages.length - 1]?.content?.slice(0, 60) || '',
            timestamp: 'Just now',
            pinned: false,
          },
          ...prev,
        ];
      });
    }
    setIsRenamingChat(false);
    setRenameChatValue('');
  };

  const cancelRenameChat = () => {
    setIsRenamingChat(false);
    setRenameChatValue('');
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      setMessages([]);
      setActiveConversation(null);
      recentSessions.forEach((c) => localStorage.removeItem(`ignisha_session_${c.id}`));
      setRecentSessions([]);
      localStorage.removeItem('ignisha_chat_messages');
      localStorage.removeItem('ignisha_active_conversation');
      setShowSettings(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden w-full max-w-full overflow-x-hidden">
      {/* Main AI Workspace - 100% Width (Platform sidebar is handled by parent dashboard) */}
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0 min-h-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 md:gap-4 flex-shrink-0">
          {/* Left Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-1.5 sm:p-2 -ml-1 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              </button>
            )}
            <div className="flex w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-shrink">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate leading-tight">Ignisha AI</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-xs text-gray-600">Online</span>
              </div>
            </div>
          </div>

          {/* Center Section - Search Bar (Hidden on mobile) */}
          <div className="hidden lg:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input name="input-687670"
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Ask Ignisha anything or search past conversations..."
                className="w-full pl-12 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* AI Credits - visible on all screen sizes */}
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-purple-50 rounded-lg group relative flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-semibold text-purple-700">{queriesLeft}/{totalQueries}</span>
                {/* No plan/tier wording on iOS — fully-free app (Apple Guideline 3.1.1) */}
                {Capacitor.getPlatform() !== 'ios' && (
                  <span className="text-[10px] text-purple-400 capitalize hidden sm:block">{livePlan} plan</span>
                )}
              </div>
              <div className="absolute top-full right-0 mt-2 w-52 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                {Capacitor.getPlatform() === 'ios'
                  ? <>{queriesLeft} of {totalQueries} daily AI queries left.</>
                  : <><strong className="capitalize">{livePlan} plan</strong>: {queriesLeft} of {totalQueries} daily queries left.{livePlan !== 'elite' ? ' Upgrade for more.' : ' You have maximum access!'}</>}
              </div>
            </div>


            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              {/* Settings Dropdown */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:max-w-[20rem] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50"
                  >
                    <h3 className="font-bold mb-4">AI Settings</h3>

                    {/* Response Style */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <label className="text-sm font-medium mb-2 block">Response Style</label>
                      <div className="space-y-2">
                        {['concise', 'detailed', 'step-by-step'].map((style) => (
                          <label key={style} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="responseStyle"
                              checked={responseStyle === style}
                              onChange={() => setResponseStyle(style)}
                              className="w-4 h-4 text-blue-500"
                            />
                            <span className="text-sm capitalize">{style.replace('-', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* AI Personality */}
                    <div className="mb-4">
                      <label className="text-sm font-medium mb-2 block">AI Personality</label>
                      <div className="space-y-2">
                        {['professional', 'casual', 'motivational'].map((personality) => (
                          <label key={personality} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="aiPersonality"
                              checked={aiPersonality === personality}
                              onChange={() => setAiPersonality(personality)}
                              className="w-4 h-4 text-blue-500"
                            />
                            <span className="text-sm capitalize">{personality}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleClearHistory}
                      className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Clear All History
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* History (desktop — mobile uses the bottom action bar) */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Conversation History"
            >
              <Clock className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 w-full max-w-full">
          {/* LEFT PANEL: AI Tools & Categories (35%) - Hidden on mobile */}
          <div className="hidden lg:flex w-[35%] max-w-[440px] flex-shrink-0 border-r border-gray-200 bg-white relative flex-col h-full overflow-hidden">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 h-full custom-scrollbar">
              {/* Section 1: Quick Actions Grid */}
              <div>
                <h2 className="text-[13px] font-bold mb-4 uppercase tracking-wide text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: brandColors.electricBlue }} />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleQuickAction(action.action)}
                      whileHover={{ y: -2 }}
                      className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left h-auto min-h-[7rem] flex flex-col gap-3"
                    >
                      <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <action.icon className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                      </span>
                      <div>
                        <h3 className="font-bold text-sm mb-0.5 leading-tight text-gray-900">{action.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{action.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Section 2: AI Insights Widget */}
              <div>
                <button
                  onClick={() => setShowInsights(!showInsights)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-900 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    AI Insights for You
                  </h2>
                  {showInsights ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {showInsights && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2.5 overflow-hidden"
                    >
                      {aiInsights.map((insight, index) => (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(insight)}
                          className="w-full text-left p-3.5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                        >
                          <p className="text-sm text-gray-700 leading-snug">{insight}</p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: AI Chat Interface (65%) */}
          <div className="flex-1 flex flex-col bg-gray-50 relative min-h-0 min-w-0 max-w-full">
            {activeConversation === null ? (
              /* Welcome Screen */
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex items-start justify-center">
                <div className="max-w-2xl w-full text-center py-4 sm:py-6">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                  </motion.div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3 px-2">Hi there, how can I help you today?</h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-8 px-2">Ask me anything about startups, funding, growth, or use quick actions</p>

                  {/* Suggested Prompts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                    {suggestedPrompts.map((prompt, index) => (
                      <motion.button
                        key={index}
                        onClick={() => handleSendMessage(prompt.text)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group flex items-center gap-3 p-3.5 bg-white rounded-2xl text-left border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                      >
                        <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <prompt.icon className="w-[18px] h-[18px]" style={{ color: brandColors.electricBlue }} />
                        </span>
                        <p className="text-sm font-medium text-gray-800 leading-snug">{prompt.text}</p>
                      </motion.button>
                    ))}
                  </div>

                  {/* Quick Actions — inline for every screen below desktop (desktop uses the left panel) */}
                  <div className="lg:hidden text-left mb-4">
                    <h3 className="text-[13px] font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4" style={{ color: brandColors.electricBlue }} />
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {quickActions.map((action, index) => (
                        <motion.button
                          key={index}
                          onClick={() => handleQuickAction(action.action)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-3.5 sm:p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left flex flex-col gap-2.5 min-h-[6.5rem] sm:min-h-[7rem]"
                        >
                          <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <action.icon className="w-[18px] h-[18px]" style={{ color: brandColors.electricBlue }} />
                          </span>
                          <div>
                            <h4 className="font-bold text-[13px] sm:text-sm leading-tight mb-0.5 text-gray-900">{action.title}</h4>
                            <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2 leading-snug">{action.description}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Conversation */
              <>
                <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-shrink-0 gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isRenamingChat ? (
                      <input
                        name="rename-chat"
                        type="text"
                        autoFocus
                        value={renameChatValue}
                        onChange={(e) => setRenameChatValue(e.target.value)}
                        onBlur={commitRenameChat}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRenameChat();
                          if (e.key === 'Escape') cancelRenameChat();
                        }}
                        className="font-bold text-sm md:text-lg text-gray-900 min-w-0 flex-1 px-2 py-0.5 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <>
                        <h2 className="font-bold text-sm md:text-lg text-gray-900 truncate">
                          {recentSessions.find(c => c.id === activeConversation)?.title || 'Current Chat'}
                        </h2>
                        <button
                          onClick={startRenamingChat}
                          title="Rename chat"
                          className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-gray-400" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Desktop controls — on mobile/tablet these live in the bottom action bar */}
                  <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleExportChat}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Export Chat"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={handleShareChat}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        setMessages([]);
                        setActiveConversation(null);
                      }}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Chat
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 space-y-6 relative overflow-x-hidden w-full max-w-full">
                  <div className="max-w-3xl mx-auto w-full space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'} w-full min-w-0`}
                      >
                        {message.type === 'ai' && (
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 self-end">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className={`min-w-0 max-w-[82%] sm:max-w-[80%] md:max-w-[72%] ${message.type === 'user' ? 'flex flex-col items-end' : ''}`}>
                          <div
                            className={`w-fit max-w-full px-4 py-2.5 rounded-2xl shadow-sm ${message.type === 'user'
                              ? 'text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                            style={message.type === 'user' ? {
                              background: `linear-gradient(135deg, ${brandColors.electricBlue}, #4f46e5)`,
                              borderRadius: '20px 20px 4px 20px',
                            } : {
                              borderRadius: '20px 20px 20px 4px',
                            }}
                          >
                            <div className={`text-sm leading-relaxed break-words max-w-full prose prose-sm ${message.type === 'user' ? 'prose-invert' : 'prose-slate'} prose-headings:font-bold prose-p:my-1 prose-li:my-0 prose-table:my-2 prose-strong:text-inherit prose-headings:text-inherit [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:bg-white [&_pre]:text-gray-900 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:rounded-xl [&_pre_code]:text-gray-900 [&_pre_code]:bg-transparent [&_table]:block [&_table]:overflow-x-auto [&_img]:max-w-full`} style={{ overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>
                              {message.type === 'ai' ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.content}
                                </ReactMarkdown>
                              ) : (
                                message.content
                              )}
                            </div>
                          </div>

                          {/* Copy / Download — available on every AI response so any
                              document Ignisha provides can be saved or copied. */}
                          {message.type === 'ai' && !!message.content?.trim() && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <button
                                onClick={async () => {
                                  const ok = await copyAiContent(message.content);
                                  if (ok) {
                                    setShowShareToast(true);
                                    setTimeout(() => setShowShareToast(false), 2000);
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </button>
                              <button
                                onClick={() => downloadAiContent(message.content)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                title="Download as document"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            </div>
                          )}

                          {message.type === 'ai' && message.cardData?.type === 'businessValidator' && (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold">Business Validator</h4>
                                <span className="text-xs font-bold" style={{ color: brandColors.navyBlue }}>
                                  {message.cardData.score}/10
                                </span>
                              </div>
                              <p className="text-xs text-gray-700">{message.cardData.verdict}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="font-semibold text-gray-900 mb-1">Strengths</p>
                                  <ul className="list-disc pl-4 text-gray-700 space-y-1">
                                    {message.cardData.strengths?.map((item: string, index: number) => (
                                      <li key={`${item}-${index}`}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 mb-1">Risks</p>
                                  <ul className="list-disc pl-4 text-gray-700 space-y-1">
                                    {message.cardData.risks?.map((item: string, index: number) => (
                                      <li key={`${item}-${index}`}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 mb-1">Next Steps</p>
                                  <ul className="list-decimal pl-4 text-gray-700 space-y-1">
                                    {message.cardData.nextSteps?.map((item: string, index: number) => (
                                      <li key={`${item}-${index}`}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {message.type === 'ai' && message.cardData?.type === 'financialProjection' && (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                              <h4 className="text-sm font-bold">Financial Projections</h4>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-900">Assumptions:</p>
                                <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                                  {message.cardData.assumptions?.map((item: string, index: number) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="text-left py-2 font-semibold">Year</th>
                                      <th className="text-right py-2 font-semibold">Revenue</th>
                                      <th className="text-right py-2 font-semibold">Expenses</th>
                                      <th className="text-right py-2 font-semibold">Runway</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {message.cardData.projections?.map((p: any, index: number) => (
                                      <tr key={index} className="border-b border-gray-50 last:border-0">
                                        <td className="py-2 text-gray-700">{p.year}</td>
                                        <td className="py-2 text-emerald-700 font-medium">{p.revenue}</td>
                                        <td className="py-2 text-rose-700">{p.expenses}</td>
                                        <td className="py-2 text-blue-700">{p.runway}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {message.type === 'ai' && message.cardData?.type === 'competitorAnalysis' && (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                              <h4 className="text-sm font-bold">Competitor Analysis</h4>
                              <div className="space-y-3">
                                {message.cardData.competitors?.map((comp: any, index: number) => (
                                  <div key={index} className="bg-indigo-50/30 border border-indigo-100 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-bold text-indigo-900">{comp.name}</p>
                                    </div>
                                    <p className="text-[11px] text-gray-600 mb-2"><span className="font-semibold text-gray-800">Focus:</span> {comp.focus}</p>
                                    <div className="bg-white p-2 text-[10px] text-indigo-800 rounded border border-indigo-50 flex items-start gap-1.5">
                                      <Zap className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                      <span><span className="font-bold">Your Edge:</span> {comp.edge}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.type === 'ai' && message.cardData?.type === 'contentDraft' && (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 space-y-4 shadow-sm text-gray-900 max-w-lg">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                  <Edit3 className="w-4 h-4 text-blue-600" />
                                  Content Draft
                                </h4>
                                <button
                                  onClick={() => {
                                    const text = `${message.cardData.title}\n\n${message.cardData.hook}\n\n${(message.cardData.outline || []).join('\n')}\n\n${message.cardData.cta}`;
                                    navigator.clipboard.writeText(text);
                                    setShowShareToast(true);
                                    setTimeout(() => setShowShareToast(false), 2000);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg font-serif text-sm">
                                <h3 className="font-bold text-lg mb-3">{message.cardData.title}</h3>
                                <p className="italic text-gray-700 mb-4">{message.cardData.hook}</p>
                                <div className="space-y-2 mb-4">
                                  {message.cardData.outline?.map((point: string, idx: number) => (
                                    <p key={idx} className="text-gray-800">• {point}</p>
                                  ))}
                                </div>
                                <p className="font-bold text-blue-700 mt-4 pt-4 border-t border-gray-200">{message.cardData.cta}</p>
                              </div>
                            </div>
                          )}

                          {message.type === 'ai' && message.cardData?.type === 'templatePack' && (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 space-y-4 shadow-sm text-gray-900">
                              <h4 className="text-sm font-bold flex items-center gap-2 border-b border-gray-100 pb-2">
                                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                                Recommended Templates
                              </h4>
                              <p className="text-xs text-gray-600">Based on your stage, I recommend building these assets:</p>
                              <div className="grid grid-cols-2 gap-3">
                                {message.cardData.templates?.map((temp: any, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSendMessage(`Generate the ${temp.name} for my startup.`)}
                                    className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-md transition-all group"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs font-bold text-gray-900 group-hover:text-teal-700 line-clamp-1">{temp.name}</p>
                                      {Capacitor.getPlatform() !== 'ios' && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${temp.tier === 'Premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                          {temp.tier}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-500">{temp.type}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.type === 'ai' && message.cardData?.type === 'templateExport' && message.cardData.downloadUrl && (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                                  <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold line-clamp-1">{message.cardData.templateName}</p>
                                  <p className="text-[11px] text-gray-500 line-clamp-1">{message.cardData.fileName}</p>
                                </div>
                                <a
                                  href={message.cardData.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors flex-shrink-0"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </a>
                              </div>
                            </div>
                          )}

                          {message.type === 'ai' && message.cardData?.type === 'needAnalysis' && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-gray-900">
                              <button
                                onClick={() => handleQuickAction('pitch-deck')}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
                              >
                                <Upload className="w-4 h-4" />
                                Analyze My Pitch Deck
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="flex justify-start w-full min-w-0 max-w-full">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mr-2 md:mr-3">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-gray-100 px-3 md:px-4 py-3 rounded-2xl min-w-0 max-w-[92%] sm:max-w-[85%] md:max-w-[75%]" style={{ borderRadius: '16px 16px 16px 4px' }}>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm text-gray-600">Ignisha is thinking</span>
                            <div className="flex gap-1 flex-shrink-0">
                              <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              />
                              <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              />
                              <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div ref={messagesEndRef} />
                </div>

                {/* Smart Suggestions */}
                {messages.length > 0 && messages[messages.length - 1].type === 'ai' && (
                  <div className="px-4 md:px-8 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide max-w-3xl mx-auto">
                      {['Tell me more', 'Show examples', 'Create a plan'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSendMessage(suggestion)}
                          className="px-3.5 py-1.5 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all border border-gray-200 shadow-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Mobile Action Bar — Quick Actions / New Chat / History / Download */}
            <div className="lg:hidden flex items-center gap-1.5 px-3 pt-2 pb-1 bg-white border-t border-gray-100 overflow-x-auto scrollbar-hide flex-shrink-0">
              <button
                onClick={() => setShowMobileActions(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold whitespace-nowrap flex-shrink-0 active:scale-95 transition-transform"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Quick Actions
              </button>
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); setActiveConversation(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold whitespace-nowrap flex-shrink-0 active:scale-95 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
              )}
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold whitespace-nowrap flex-shrink-0 active:scale-95 transition-transform"
              >
                <Clock className="w-3.5 h-3.5" />
                History
              </button>
              {messages.length > 0 && (
                <button
                  onClick={handleExportChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold whitespace-nowrap flex-shrink-0 active:scale-95 transition-transform"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save
                </button>
              )}
            </div>

            {/* Chat Input Area */}
            <div className="bg-white lg:border-t border-gray-200 flex-shrink-0 px-3 md:px-4 pt-2 md:pt-4 pb-3 md:pb-4">
              <div className="max-w-3xl mx-auto flex items-end gap-1.5 bg-gray-100 border border-gray-200 rounded-3xl p-1.5 transition-all focus-within:bg-white focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 focus-within:shadow-sm">
                <div className="flex-1 min-w-0">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask Ignisha..."
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-base md:text-sm py-2 px-3 max-h-32 min-h-[40px]"
                    rows={1}
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.ppt,.pptx,.xlsx,.csv,image/*"
                  />
                  <button
                    onClick={handleEnhancePrompt}
                    disabled={!inputValue.trim() || isEnhancing || isTyping}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 text-gray-500"
                    title="Enhance"
                  >
                    <Sparkles className={`w-5 h-5 ${isEnhancing ? 'text-blue-500 animate-pulse' : ''}`} />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    title="Attach"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim()}
                    className="p-2.5 rounded-full text-white transition-all disabled:opacity-50 disabled:scale-95 shadow-lg active:scale-90"
                    style={{ background: brandColors.electricBlue }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation History Sidebar (Slide-in from right) */}
      <AnimatePresence>
        {showHistory && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-[600]"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={window.innerWidth >= 1024 ? { x: 320 } : { y: '100%' }}
              animate={window.innerWidth >= 1024 ? { x: 0 } : { y: 0 }}
              exit={window.innerWidth >= 1024 ? { x: 320 } : { y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed z-[610] bg-white shadow-2xl flex flex-col inset-x-0 bottom-0 min-h-[55vh] max-h-[85vh] rounded-t-3xl lg:inset-x-auto lg:right-0 lg:top-0 lg:bottom-0 lg:min-h-0 lg:max-h-none lg:h-full lg:w-80 lg:rounded-t-none"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Grab handle (mobile only) */}
              <div className="lg:hidden sticky top-0 bg-white pt-2.5 pb-1 flex justify-center rounded-t-3xl z-10 flex-shrink-0">
                <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
              </div>
              <div className="px-5 lg:px-4 py-3 lg:py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold">Conversation History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 -mr-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <input name="input-879bd0"
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search past conversations..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                {recentSessions.length === 0 && (
                   <div className="text-center py-8">
                     <p className="text-sm text-gray-500">No recent conversations</p>
                   </div>
                )}
                {recentSessions
                  .filter(c => c.title.toLowerCase().includes(historySearchQuery.toLowerCase()) || c.preview.toLowerCase().includes(historySearchQuery.toLowerCase()))
                  .map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 hover:bg-gray-50 rounded-lg cursor-pointer group border ${activeConversation === conv.id ? 'border-blue-200 bg-blue-50' : 'border-transparent'}`}
                    onClick={() => {
                      setMessages(loadSessionMessages(conv.id));
                      setActiveConversation(conv.id as number);
                      setShowHistory(false);
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-sm flex-1 truncate">{conv.title}</h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className={`p-1 hover:bg-gray-200 rounded ${savedSessionIds.has(conv.id) ? 'text-amber-500' : 'text-gray-400'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSaveSession(conv);
                          }}
                          title={savedSessionIds.has(conv.id) ? "Remove Bookmark" : "Bookmark Session"}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${savedSessionIds.has(conv.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          className="p-1 hover:bg-gray-200 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            localStorage.removeItem(`ignisha_session_${conv.id}`);
                            setRecentSessions(prev => prev.filter(c => c.id !== conv.id));
                            if (activeConversation === conv.id) { setActiveConversation(null); setMessages([]); }
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1">{conv.preview}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{conv.timestamp}</span>
                      {savedSessionIds.has(conv.id) && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Saved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Upload Your Pitch Deck</h2>
                <button onClick={() => setShowUploadModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors mb-4"
              >
                <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Drag & drop your file or browse</p>
                <p className="text-xs text-gray-500">PDF, PPT, PPTX (max 25MB)</p>
              </div>

              {uploadedFile && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setUploadedFile(null)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              )}

              <div className="space-y-2 mb-6">
                <label className="flex items-center gap-2">
                  <input name="input-e5e473" type="checkbox" defaultChecked className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Analyze structure & flow</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="input-9b954b" type="checkbox" defaultChecked className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Check for missing slides</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="input-e2d398" type="checkbox" defaultChecked className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Suggest improvements</span>
                </label>
              </div>

              <button
                onClick={handleAnalyzeFile}
                disabled={!uploadedFile}
                className="w-full py-3 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
              >
                Analyze Now
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Co-founder/Expert Matching Modal */}
      <AnimatePresence>
        {showCofounderModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCofounderModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {matchMode === 'experts'
                    ? 'Find Expert Advisors'
                    : matchMode === 'client'
                      ? 'Find Ideal Clients'
                      : 'Find Your Perfect Co-founder'}
                </h2>
                <button onClick={() => setShowCofounderModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {matchMode === 'experts' ? 'Expertise Needed' : matchMode === 'client' ? 'Industry Focus' : 'Skills Needed'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Technical', 'Marketing', 'Sales', 'Finance', 'Design', 'Operations'].map((skill) => (
                      <button
                        key={skill}
                        onClick={() => {
                          setMatchSkills(prev =>
                            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          matchSkills.includes(skill)
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location Preference</label>
                  <select name="select-54b44c"
                    value={matchLocation}
                    onChange={(e) => setMatchLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="Remote">Remote</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {matchMode === 'client' ? 'Client Stage' : 'Commitment Level'}
                  </label>
                  <div className="space-y-2">
                    {['Full-time', 'Part-time', 'Flexible'].map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="commitment"
                          value={level}
                          checked={matchCommitment === level}
                          onChange={(e) => setMatchCommitment(e.target.value)}
                          className="w-4 h-4 text-blue-500 cursor-pointer"
                        />
                        <span className="text-sm">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleMatchResults}
                  className="w-full py-3 rounded-lg font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                >
                  Find Matches
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Library Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTemplateModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Choose a Template</h2>
                <button onClick={() => setShowTemplateModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Templates are pre-filled from your latest pitch deck analysis. Run <span className="font-semibold">Pitch Deck Analysis</span> first if you haven't yet.
              </p>

              <input name="input-f9e22a"
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              />

              {templatesLoading ? (
                <p className="text-center text-sm text-gray-500 py-12">Loading templates…</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {templateOptions.filter((template) => {
                      const q = templateSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        template.name.toLowerCase().includes(q) ||
                        template.description.toLowerCase().includes(q)
                      );
                    }).map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ y: -4 }}
                        className={`border border-gray-200 rounded-xl p-4 transition-all ${generatingTemplateId ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-blue-300 hover:shadow-lg'}`}
                        onClick={() => handleGenerateTemplate(template.id, template.name)}
                      >
                        <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-3 flex items-center justify-center">
                          <FileText className="w-12 h-12 text-blue-500" />
                        </div>
                        <h3 className="font-bold text-sm mb-1">{template.name}</h3>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{template.description}</p>
                        <div className="flex items-center justify-between">
                          {Capacitor.getPlatform() !== 'ios' ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${template.tier === 'Free' ? 'bg-green-100 text-green-700' :
                              template.tier === 'Pro' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                              {template.tier}
                            </span>
                          ) : <span />}
                          <span className="text-[10px] text-gray-400">{template.slideCount} slides</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {templateOptions.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-8">
                      No templates available right now.
                    </p>
                  )}
                  {templateOptions.length > 0 && templateSearch.trim() &&
                    !templateOptions.some((t) => {
                      const q = templateSearch.trim().toLowerCase();
                      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
                    }) && (
                      <p className="text-center text-sm text-gray-500 py-8">
                        No templates match "{templateSearch}".
                      </p>
                    )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Quick Actions Bottom Sheet */}
      <AnimatePresence>
        {showMobileActions && (
          <>
            <div
              className="fixed inset-0 bg-black/50 lg:hidden"
              style={{ zIndex: 1000 }}
              onClick={() => setShowMobileActions(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl lg:hidden max-h-[85vh] overflow-y-auto"
              style={{ zIndex: 1001, paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              {/* Grab handle */}
              <div className="sticky top-0 bg-white pt-2.5 pb-1 flex justify-center rounded-t-3xl z-10">
                <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
              </div>
              <div className="px-5 pb-3 pt-1 flex items-center justify-between">
                <h2 className="text-lg font-bold">AI Tools</h2>
                <button
                  onClick={() => setShowMobileActions(false)}
                  className="p-1.5 -mr-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="px-5 grid grid-cols-2 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleQuickAction(action.action);
                      setShowMobileActions(false);
                    }}
                    className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 active:scale-[0.98] transition-all text-left h-28 flex flex-col gap-2.5"
                  >
                    <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <action.icon className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5 text-gray-900">{action.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* AI Insights for Mobile */}
              <div className="px-5 py-5 mt-5 border-t border-gray-100 bg-gray-50/60">
                <h2 className="text-[13px] font-bold mb-3 uppercase tracking-wide text-gray-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  AI Insights for You
                </h2>
                <div className="space-y-2.5">
                  {aiInsights.map((insight, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      onClick={() => {
                        handleSendMessage(insight);
                        setShowMobileActions(false);
                      }}
                      className="w-full text-left p-3.5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
                    >
                      <p className="text-sm text-gray-700 leading-snug">{insight}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}