import { useState, useEffect } from "react";
import { getSocket } from "../services/socketService";
import {
  FileText,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Activity,
  Users,
  BarChart3,
  Download,
  MessageSquare,
  Calendar,
  Mail,
  Share2,
  CheckSquare,
  Square,
  Plus,
  X,
  Eye,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  FileDown,
  Sparkles,
  Send,
  MessageCircle,
  Target
} from "lucide-react";
import { brandColors } from "../utils/colors";
import { AIDocumentAnalyzer } from "./AIDocumentAnalyzer";
import api from "../services/api";
import * as messagingService from '../services/messagingService';
import { getCurrentUser } from '../services/authService';

interface Document {
  id: string;
  name: string;
  type: "pdf" | "ppt" | "doc";
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  views: number;
  size: string;
  url: string;
}

interface ActivityItem {
  id: string;
  type: "document" | "view" | "comment" | "meeting" | "status";
  user: string;
  action: string;
  timestamp: string;
  document?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  team: "startup" | "investor" | "advisor";
}

interface Comment {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  message: string;
  timestamp: string;
  mentions?: string[];
}

interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  completed: boolean;
  dueDate: string;
}

interface PitchDeckAnalysis {
  executiveSummary?: string;
  highlights?: string[];
  strengths?: string[];
  gaps?: string[];
  redFlags?: string[];
  moatType?: string;
  investorReadinessScore?: number;
  scoreMetrics?: Array<{ label: string; score: number; note: string }>;
  extractedSlides?: { index: number; text: string }[];
  extractedSlideCount?: number;
}

interface DealRoomApiDocument {
  _id: string;
  type: string;
  category?: string;
  views?: number;
  file: {
    url: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
    uploadedAt?: string;
  };
}

interface DealRoomApiResponse {
  dealRoom: {
    _id: string;
    stage?: string;
    ndaStatus?: "none" | "pending" | "signed";
    checklist?: any[];
    timeline?: any[];
    discussion?: any[];
    investorIds?: string[];
    founder?: string;
  };
  investors?: { id: string; name: string; avatar?: string }[];
  fundingApplication?: { _id?: string; title?: string; status?: string; founder?: string };
  startup?: { name?: string;[key: string]: any };
  documents: DealRoomApiDocument[];
  pitchDeckAnalysis?: PitchDeckAnalysis | null;
  documentAnalyses?: Record<string, any>;
}

interface DocumentTreeItem {
  id: string;
  name: string;
  type: "pdf" | "ppt" | "doc";
  size: string;
  views: number;
  url: string;
  category?: string;
}

interface DocumentTreeFolder {
  id: string;
  name: string;
  icon: any;
  children: DocumentTreeItem[];
}

export function DealRoomPage() {
  // --- 1. ALL HOOKS AT THE TOP (MANDATORY) ---
  const [loading, setLoading] = useState(true);
  const [dealRoomData, setDealRoomData] = useState<DealRoomApiResponse | null>(null);
  const [dealRooms, setDealRooms] = useState<any[]>([]);
  const [selectedFundingApplicationId, setSelectedFundingApplicationId] = useState<string>('');
  const [pipelineStartups, setPipelineStartups] = useState<{ id: string; name: string }[]>([]);
  const [selectedStartupId, setSelectedStartupId] = useState<string>('');
  const [startupSelectionError, setStartupSelectionError] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [dealStage, setDealStage] = useState("under_review");
  const [pendingDealStage, setPendingDealStage] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["pitch-deck", "business-docs", "legal-templates"]);
  const [ndaSigned, setNdaSigned] = useState(true);
  const [isActionItemsOpen, setIsActionItemsOpen] = useState(true);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<'checklist' | 'discussion' | 'insights'>('checklist');
  const [discussionMessages, setDiscussionMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const currentUser = getCurrentUser();

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;
    try {
      const content = newMessage.trim();
      setNewMessage("");
      const sent = await messagingService.sendMessage(conversationId, content);
      setDiscussionMessages(prev => [...prev, sent]);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message');
    }
  };

  const loadMessages = async (id: string, silent = false) => {
    try {
      if (!silent) setIsFetchingMessages(true);
      const msgs = await messagingService.getMessages(id);
      setDiscussionMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!silent) setIsFetchingMessages(false);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      // Normalize ids — a founder/investor value may be a plain id or a populated
      // object ({ _id, id }); currentUser may expose id or _id.
      const norm = (v: any): string => {
        if (!v) return '';
        if (typeof v === 'object') return String(v._id || v.id || '');
        return String(v);
      };
      const myId = norm(currentUser?.id);
      if (!myId) return; // wait until the current user is loaded (avoids self-conversation 400)

      const founderId = norm(dealRoomData?.dealRoom?.founder || dealRoomData?.startup?.founder || dealRoomData?.fundingApplication?.founder);
      const isFounder = !!founderId && founderId === myId;

      let targetId = '';

      if (isFounder) {
        // As a founder, use the manually selected investor OR the first one by default
        const firstInvestor = Array.isArray(dealRoomData?.investors) && dealRoomData.investors.length > 0 ? dealRoomData.investors[0] : null;
        targetId = norm(selectedInvestorId) || norm(firstInvestor);
      } else {
        // As an investor, chat with the founder
        targetId = founderId;
      }

      if (!targetId || targetId === myId) {
        setConversationId(null);
        setDiscussionMessages([]);
        return;
      }

      try {
        const dealRoomId = dealRoomData?.dealRoom?._id;
        const startupName = dealRoomData?.startup?.name || dealRoomData?.fundingApplication?.title || 'Deal Room';
        const conv = await messagingService.getOrCreateConversation(targetId, {
          source: 'deal_room',
          dealRoomId,
          startupName,
        });
        setConversationId(conv._id);
        loadMessages(conv._id);
      } catch (err) {
        console.error('Failed to init deal room chat:', err);
      }
    };

    if (dealRoomData) {
      initChat();
    }
  }, [dealRoomData, selectedInvestorId, currentUser?.id]);

  useEffect(() => {
    if (activeMainTab === 'discussion' && conversationId) {
      const interval = setInterval(() => {
        loadMessages(conversationId, true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeMainTab, conversationId]);

  // Add silent polling for Deal Room checklist/status changes
  useEffect(() => {
    if (!dealRoomData?.dealRoom?._id) return;
    const interval = setInterval(() => {
      // Refresh deal room without triggering global loading state
      if (selectedFundingApplicationId) {
         api.get('/dealroom/' + selectedFundingApplicationId).then(res => {
           setDealRoomData(prev => prev ? { ...prev, dealRoom: res.data.dealRoom } : null);
         }).catch(() => {});
      } else if (selectedStartupId) {
         api.get('/dealroom/startup/' + selectedStartupId).then(res => {
           setDealRoomData(prev => prev ? { ...prev, dealRoom: res.data.dealRoom } : null);
         }).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [dealRoomData?.dealRoom?._id, selectedFundingApplicationId, selectedStartupId]);

  const resolveFileUrl = (rawUrl: string | undefined): string => {
    const url = String(rawUrl || '').trim();
    if (!url || url === '#') return '';
    if (/^https?:\/\//i.test(url)) return url;

    const base = String((api as any)?.defaults?.baseURL || '').replace(/\/+$/, '');
    const origin = base ? base.replace(/\/+api\/?$/, '') : '';
    if (!origin) return url;
    if (url.startsWith('/')) return origin + url;
    return origin + '/' + url;
  };

  const handleDealStageChange = async (nextStage: string) => {
    const prev = dealStage;
    setDealStage(nextStage);

    if (!dealRoomData?.dealRoom?._id) return;
    try {
      const dealRoomId = dealRoomData?.dealRoom?._id;
      if (!dealRoomId) return;
      const res = await api.post('/dealroom/update-stage', { dealRoomId, stage: nextStage });
      const updated = res.data?.dealRoom;
      if (updated?.stage) {
        setDealStage(updated.stage);
        setDealRoomData((prevData) => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            dealRoom: {
              ...prevData.dealRoom,
              stage: updated.stage,
            },
          };
        });
      }
      setPendingDealStage(null);
    } catch (err: any) {
      setDealStage(prev);
      alert(err?.response?.data?.message || err?.message || 'Failed to update deal stage');
    }
  };

  const loadDealRoomByFundingApplicationId = async (fundingApplicationId: string) => {
    setLoading(true);
    setSelectedFundingApplicationId(fundingApplicationId);
    setSelectedDocument(null);
    setSelectedInvestorId(null);
    try {
      const res = await api.get('/dealroom/' + fundingApplicationId);
      setDealRoomData(res.data);
      setStartupSelectionError('');
      if (res.data?.fundingApplication?.startup) {
        setSelectedStartupId(String(res.data.fundingApplication.startup));
      }
      if (res.data?.dealRoom?.stage) {
        setDealStage(res.data.dealRoom.stage);
        setPendingDealStage(null);
      }
      setNdaSigned(true);
    } catch (err) {
      console.error('Failed to load selected deal room:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDealRoomByStartupId = async (startupId: string) => {
    setLoading(true);
    setSelectedStartupId(startupId);
    setSelectedDocument(null);
    setSelectedInvestorId(null);
    try {
      const res = await api.get('/dealroom/startup/' + startupId);
      setDealRoomData(res.data);
      setStartupSelectionError('');
      if (res.data?.fundingApplication?._id) {
        setSelectedFundingApplicationId(String(res.data.fundingApplication._id));
      }
      if (res.data?.dealRoom?.stage) {
        setDealStage(res.data.dealRoom.stage);
        setPendingDealStage(null);
      }
      setNdaSigned(true);
    } catch (err: any) {
      setDealRoomData(null);
      setSelectedFundingApplicationId('');
      setNdaSigned(true);
      setStartupSelectionError(err?.response?.data?.message || err?.message || 'No deal room available for this startup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActionItems([
      { id: "1", text: "Review financial projections", assignee: "You", completed: true, dueDate: "Jan 20" },
      { id: "2", text: "Technical due diligence call", assignee: "John Smith", completed: false, dueDate: "Jan 25" },
      { id: "3", text: "Legal review of IP agreements", assignee: "Legal Team", completed: false, dueDate: "Jan 28" },
      { id: "4", text: "Prepare term sheet", assignee: "You", completed: false, dueDate: "Feb 1" },
      { id: "5", text: "Customer reference calls", assignee: "Emily Davis", completed: true, dueDate: "Jan 22" },
      { id: "6", text: "Market analysis validation", assignee: "Market Research Team", completed: false, dueDate: "Jan 30" },
      { id: "7", text: "Competitive landscape review", assignee: "You", completed: false, dueDate: "Feb 3" },
      { id: "8", text: "Founder background check", assignee: "Due Diligence Team", completed: false, dueDate: "Feb 5" },
      { id: "9", text: "Product demo and testing", assignee: "Technical Team", completed: false, dueDate: "Feb 7" },
      { id: "10", text: "Final investment committee review", assignee: "Investment Committee", completed: false, dueDate: "Feb 10" },
    ]);
  }, []);

  useEffect(() => {
    const fetchDealRoom = async () => {
      try {
        let pipelineList: { id: string; name: string }[] = [];
        try {
          const pipelineRes = await api.get('/startups/investor/pipeline');
          const raw = pipelineRes.data || {};
          const all = Object.values(raw).flatMap((arr: any) => (Array.isArray(arr) ? arr : []));
          const unique = Array.from(
            new Map(
              all
                .filter((s: any) => s?.id)
                .map((s: any) => [String(s.id), { id: String(s.id), name: String(s.name || s.id) }])
            ).values()
          );
          pipelineList = unique;
          setPipelineStartups(unique);
        } catch {
          pipelineList = [];
          setPipelineStartups([]);
        }

        const listRes = await api.get('/dealroom');
        const list = Array.isArray(listRes.data)
          ? listRes.data
          : (listRes.data?.dealRooms || []);

        const safeList = Array.isArray(list) ? list : [];
        setDealRooms(safeList);

        let appId: string | undefined = undefined;
        try {
          const appRes = await api.get('/funding/my-submission');
          appId = appRes.data?._id ? String(appRes.data._id) : undefined;
        } catch {
          appId = undefined;
        }

        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(hash.indexOf('?') + 1));
        const urlStartupId = params.get('startup');

        if (urlStartupId) {
          await loadDealRoomByStartupId(urlStartupId);
          return;
        }

        const initialFundingAppId = appId || safeList?.[0]?.fundingApplication?._id;
        if (initialFundingAppId) {
          await loadDealRoomByFundingApplicationId(String(initialFundingAppId));
          return;
        }

        if (!initialFundingAppId) {
          const firstPipelineStartup = pipelineList?.[0]?.id;
          if (firstPipelineStartup) {
            await loadDealRoomByStartupId(firstPipelineStartup);
          }
        }
      } catch (err) {
        console.error("Failed to load deal room:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDealRoom();
  }, []);

  // Socket listener for real-time pipeline stage updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePipelineStageUpdate = (data: any) => {
      console.log('Pipeline stage updated:', data);
      // Only refresh if it's for the currently viewed startup
      if (data.startupId === selectedStartupId) {
        // Reload deal room to get latest stage
        if (selectedFundingApplicationId) {
          loadDealRoomByFundingApplicationId(selectedFundingApplicationId);
        } else if (selectedStartupId) {
          loadDealRoomByStartupId(selectedStartupId);
        }
      }
    };

    socket.on('pipeline_stage_updated', handlePipelineStageUpdate);
    return () => {
      socket.off('pipeline_stage_updated', handlePipelineStageUpdate);
    };
  }, [selectedStartupId, selectedFundingApplicationId]);

  // --- 2. LOGIC FUNCTIONS (STILL BEFORE CONDITIONAL RETURN) ---
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const toggleChecklistItem = async (itemId: string) => {
    if (!dealRoomData?.dealRoom?._id) return;
    
    const checklist = [...(dealRoomData.dealRoom.checklist || [])];
    const itemIndex = checklist.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    // MANDATORY PROGRESSION LOGIC: 
    // Cannot complete item if any previous items are not completed
    const isCompleting = !checklist[itemIndex].completed;
    if (isCompleting && itemIndex > 0) {
      for (let i = 0; i < itemIndex; i++) {
        if (!checklist[i].completed) {
          alert(`Mandatory step: Please complete "${checklist[i].text}" before moving on.`);
          return;
        }
      }
    }

    try {
      const newChecklist = checklist.map(item => 
        item.id === itemId ? { ...item, completed: isCompleting } : item
      );
      
      const res = await api.post('/dealroom/update-checklist', { 
        dealRoomId: dealRoomData.dealRoom._id, 
        checklist: newChecklist 
      });

      if (res.data) {
        setDealRoomData(prev => prev ? {
          ...prev,
          dealRoom: { ...prev.dealRoom, checklist: res.data.checklist }
        } : null);
      }
    } catch (err) {
      console.error('Failed to update checklist:', err);
    }
  };



  // --- 3. DATA PROCESSING (MOCK FALLBACKS) ---
  const selectedDealRoomSummary = dealRooms.find(
    (dr: any) => String(dr?.fundingApplication?._id || '') === String(selectedFundingApplicationId || '')
  );

  const selectedPipelineStartup = pipelineStartups.find((s) => String(s.id) === String(selectedStartupId || ''));

  // Prefer the real startup name from every place the backend might expose it;
  // only fall back to the funding application's (often generic) title last.
  const startupName =
    dealRoomData?.startup?.name ||
    (dealRoomData as any)?.startup?.data?.name ||
    (dealRoomData as any)?.fundingApplication?.startupName ||
    (dealRoomData as any)?.fundingApplication?.startup?.name ||
    selectedPipelineStartup?.name ||
    (selectedDealRoomSummary as any)?.startup?.name ||
    selectedDealRoomSummary?.fundingApplication?.title ||
    'Startup';

  const effectiveData: DealRoomApiResponse = dealRoomData || {
    dealRoom: {
      _id: "",
      stage: "under_review",
      ndaStatus: "none",
      checklist: [],
      timeline: [],
      discussion: []
    },
    fundingApplication: {
      _id: String(selectedDealRoomSummary?.fundingApplication?._id || ''),
      title: startupName,
      status: String(selectedDealRoomSummary?.fundingApplication?.status || 'In Review'),
    },
    documents: [],
    pitchDeckAnalysis: null
  };

  // Ensure fundingApplication.title uses the startup name from the DB
  if (effectiveData.fundingApplication && dealRoomData?.startup?.name) {
    effectiveData.fundingApplication.title = dealRoomData.startup.name;
  }

  const { documents = [], fundingApplication } = effectiveData;

  const termSheets: any[] = [];

  const dueDiligenceResources: any[] = [];

  const documentTree: DocumentTreeFolder[] = [
    {
      id: "pitch-deck",
      name: "Pitch Deck",
      icon: FileText,
      children: documents.length > 0
        ? documents
          .filter((d: DealRoomApiDocument) => d.type === "pitchDeck")
          .map((d: DealRoomApiDocument) => ({
            id: d._id,
            name: d.file.originalName || "Pitch Deck",
            type: "pdf" as const,
            size: ((((d.file.size || 0) as number) / (1024 * 1024)).toFixed(1)) + " MB",
            views: d.views || 0,
            url: d.file.url,
          }))
        : []
    },
    {
      id: "business-docs",
      name: "Business Documents",
      icon: FolderOpen,
      children: (() => {
        const others = documents
          .filter((d: DealRoomApiDocument) => d.type === "other")
          .map((d: DealRoomApiDocument) => ({
            id: d._id,
            name: d.file.originalName || "Document",
            type: "pdf" as const,
            size: ((((d.file.size || 0) as number) / (1024 * 1024)).toFixed(1)) + " MB",
            views: d.views || 0,
            category: d.category,
            url: d.file.url,
          }));

        if (others.length > 0) return others;

        return [];
      })()
    },
    {
      id: "legal-templates",
      name: "Term Sheets",
      icon: Shield,
      children: termSheets.map(ts => ({
        id: ts.id,
        name: ts.name,
        type: ts.type as any,
        size: ts.size,
        views: 0,
        url: ts.url,
      })),
    },
    {
      id: "due-diligence",
      name: "Due Diligence Resources",
      icon: CheckSquare,
      children: dueDiligenceResources.map(dd => ({
        id: dd.id,
        name: dd.name,
        type: dd.type as any,
        size: dd.size,
        views: 0,
        url: dd.url,
      })),
    }
  ];

  const dealStages = [
    { value: "interested", label: "Interested", color: "#6B7280" },
    { value: "under_review", label: "Under Review", color: brandColors.electricBlue },
    { value: "negotiating", label: "Negotiating", color: "#8B5CF6" },
    { value: "invested", label: "Invested", color: "#10B981" },
    { value: "closed", label: "Closed", color: "#9CA3AF" },
  ];

  // --- 4. CONDITIONAL LOADING RETURN (AFTER ALL HOOKS) ---
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-900 bg-white font-bold text-xl">Loading Deal Room...</div>;
  }

  // --- 5. MAIN RENDER ---
  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900 relative">
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5 z-30 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-bold text-gray-400 uppercase tracking-wider">Deal Room for</span>
              <h1 className="font-extrabold text-xl sm:text-2xl text-gray-900 tracking-tight">
                {startupName}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                <Shield className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {(dealRoomData?.dealRoom?.founder === currentUser?.id) ? "Secure Founder Access" : "Secure Investor Access"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start sm:self-center">
            {/* Startup Switcher */}
            <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 px-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Switch</label>
              </div>
              <select name="select-f7af58"
                value={selectedStartupId || selectedFundingApplicationId || ''}
                onChange={(e) => {
                  const nextId = e.target.value;
                  if (!nextId) return;
                  if (pipelineStartups.some((s) => String(s.id) === String(nextId))) {
                    if (nextId !== selectedStartupId) {
                      loadDealRoomByStartupId(nextId);
                    }
                    return;
                  }

                  if (nextId !== selectedFundingApplicationId) {
                    loadDealRoomByFundingApplicationId(nextId);
                  }
                }}
                className={`min-w-[140px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm cursor-pointer appearance-none pr-8 relative`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1rem',
                }}
              >
                {pipelineStartups.length > 0 ? (
                  pipelineStartups.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                ) : dealRooms.length === 0 ? (
                  <option value="">No startups in pipeline</option>
                ) : (
                  (() => {
                    const validDealRooms = dealRooms.filter((dr: any) => dr?.fundingApplication?._id);
                    if (validDealRooms.length === 0) {
                      return <option value="">No valid startups found</option>;
                    }
                    return validDealRooms.map((dr: any) => (
                      <option key={dr.fundingApplication._id} value={dr.fundingApplication._id}>
                        {dr?.fundingApplication?.title || dr.fundingApplication._id}
                      </option>
                    ));
                  })()
                )}
              </select>
            </div>

            {/* Mobile Deal Stage Switcher - Only visible on small screens */}
            <div className="lg:hidden flex items-center gap-3 bg-blue-50/50 p-1.5 rounded-xl border border-blue-100 flex-shrink-0">
              <div className="flex items-center gap-2 px-2">
                <Target className="w-4 h-4 text-blue-400" />
                <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">Stage</label>
              </div>
              <div className="flex items-center gap-2">
                <select name="select-fc0d97"
                  value={pendingDealStage || dealStage}
                  onChange={(e) => setPendingDealStage(e.target.value)}
                  disabled={loading}
                  className={`min-w-[130px] px-3 py-2 border border-blue-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 text-blue-900 shadow-sm cursor-pointer appearance-none pr-8 relative bg-white`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233B82F6' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1rem',
                  }}
                >
                  {dealStages.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                </select>
                {pendingDealStage && pendingDealStage !== dealStage && (
                  <button
                    onClick={() => handleDealStageChange(pendingDealStage)}
                    disabled={loading}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {startupSelectionError ? (
          <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-lg flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {startupSelectionError}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:block w-80 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: brandColors.electricBlue }}>
                {startupName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-bold">{startupName}</h2>
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{fundingApplication?.status || "Active"}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Deal Stage</label>
              <div className="space-y-2">
                <select name="select-6469b9"
                  value={pendingDealStage || dealStage}
                  onChange={(e) => setPendingDealStage(e.target.value)}
                  disabled={loading}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                >
                  {dealStages.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                </select>
                {pendingDealStage && pendingDealStage !== dealStage && (
                  <button
                    onClick={() => handleDealStageChange(pendingDealStage)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm Change
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2 text-gray-600">
                <FileText className="w-4 h-4" /> Documents
              </h3>
              <div className="space-y-1">
                {documentTree.map(folder => (
                  <div key={folder.id}>
                    <button onClick={() => toggleFolder(folder.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left text-sm font-medium text-gray-900">
                      {expandedFolders.includes(folder.id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <folder.icon className="w-4 h-4 text-gray-600" /> {folder.name}
                    </button>
                    {expandedFolders.includes(folder.id) && (
                      <div className="ml-6 space-y-1 mt-1 text-gray-900">
                        {folder.children.length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-400 italic">Nothing uploaded yet — pending upload.</div>
                        )}
                        {folder.children.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => {

                              const isPlaceholder = !doc.url || doc.url === '#';
                              // Match the disabled styling: a placeholder doc isn't selectable
                              if (isPlaceholder) return;
                              const resolvedUrl = resolveFileUrl(doc.url);
                              if (resolvedUrl && !isPlaceholder) {
                                try {
                                  window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
                                } catch {
                                  // ignore
                                }
                              }

                              setSelectedDocument({
                                id: doc.id,
                                name: doc.name,
                                type: doc.type,
                                category: folder.name,
                                uploadedBy: startupName || "Founder",
                                uploadedAt: "2 days ago",
                                views: doc.views,
                                size: doc.size,
                                url: doc.url,
                              });
                            }}
                            className={"w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors " + (selectedDocument?.id === doc.id ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-gray-50 text-gray-700") + " " + ((!doc.url || doc.url === '#') ? "cursor-not-allowed opacity-60" : "")}
                          >
                            <FileText className="w-3.5 h-3.5" /> <span className="flex-1 truncate">{doc.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden text-gray-900">


          <div className="flex-1 flex flex-col overflow-hidden bg-white border-l border-gray-200">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-100 bg-white sticky top-0 z-20 flex-shrink-0">
              <button
                onClick={() => setActiveMainTab('checklist')}
                className={`flex-1 py-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeMainTab === 'checklist' ? 'border-amber-500 text-amber-600 bg-amber-50/30' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <CheckSquare className={`w-4 h-4 ${activeMainTab === 'checklist' ? 'text-amber-500' : 'text-gray-300'}`} /> Checklist
              </button>
              <button
                onClick={() => setActiveMainTab('insights')}
                className={`flex-1 py-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeMainTab === 'insights' ? 'border-purple-500 text-purple-600 bg-purple-50/30' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <Sparkles className={`w-4 h-4 ${activeMainTab === 'insights' ? 'text-purple-500' : 'text-gray-300'}`} /> AI Insights
              </button>
              <button
                onClick={() => setActiveMainTab('discussion')}
                className={`flex-1 py-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeMainTab === 'discussion' ? 'border-blue-500 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <MessageCircle className={`w-4 h-4 ${activeMainTab === 'discussion' ? 'text-blue-500' : 'text-gray-300'}`} /> Chat
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto relative flex flex-col">
              {activeMainTab === 'checklist' ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setIsActionItemsOpen(!isActionItemsOpen)} className="flex items-center gap-2 font-bold text-gray-900">
                      {isActionItemsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} Items
                    </button>
                  </div>
                  {isActionItemsOpen && (
                    <div className="space-y-2">
                      {(effectiveData.dealRoom.checklist || []).length > 0 ? (
                        (effectiveData.dealRoom.checklist || []).map((item, index) => {
                          const isLocked = index > 0 && !(effectiveData.dealRoom.checklist || [])[index - 1].completed;
                          return (
                            <div 
                              key={item.id} 
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                item.completed ? "bg-green-50 border-green-100" : 
                                isLocked ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed" : "bg-white border-gray-200 hover:border-blue-300 cursor-pointer"
                              }`} 
                              onClick={() => !isLocked && toggleChecklistItem(item.id)}
                            >
                              {item.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : isLocked ? (
                                <Activity className="w-5 h-5 text-gray-300" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold ${item.completed ? "text-green-800" : isLocked ? "text-gray-400" : "text-gray-900"}`}>
                                  {item.text}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isLocked ? `Locked: Complete previous step first` : item.category || 'Due Diligence'}
                                </p>
                              </div>
                              {item.completed && (
                                <span className="text-xs font-bold text-green-600 px-2 py-0.5 bg-white rounded-full shadow-sm">Done</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                          
                          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 relative transition-transform duration-500 group-hover:scale-110">
                            <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <CheckSquare className="w-10 h-10 text-gray-300 relative z-10" />
                          </div>
                          
                          <h3 className="font-extrabold text-gray-900 text-lg mb-2">Awaiting Review</h3>
                          <p className="text-sm text-gray-500 max-w-[300px] text-center leading-relaxed font-medium">
                            The checklist will populate automatically once your application has been reviewed by the investor.
                          </p>
                          
                          <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Estimated: 2-3 business days</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeMainTab === 'insights' ? (
                <div className="p-4 space-y-6">
                  {dealRoomData?.pitchDeckAnalysis ? (
                    <AIDocumentAnalyzer 
                      documentName="Pitch Deck" 
                      documentCategory="Venture Funding"
                      analysisData={dealRoomData?.pitchDeckAnalysis}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm border-dashed">
                       <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                          <Sparkles className="w-10 h-10 text-indigo-500" />
                       </div>
                       <h3 className="text-lg font-bold text-gray-900 mb-2">Analyzing Pitch Deck...</h3>
                       <p className="text-sm text-gray-500 max-w-[320px] text-center leading-relaxed">
                          Our AI is currently crunching the numbers and evaluating your presentation. This process usually takes 60-90 seconds. 
                       </p>
                       <div className="mt-8 flex gap-2">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                       </div>
                    </div>
                  )}
                  
                  {/* Founder/Business summary if available */}
                  {dealRoomData?.startup?.description && (
                     <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Startup Context</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">{dealRoomData.startup.description}</p>
                     </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full bg-gray-50/30">
                  {/* Multi-Investor Selector for Founders */}
                  {dealRoomData?.dealRoom?.founder === currentUser?.id && (dealRoomData?.investors || []).length > 1 && (
                    <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Chat with:</span>
                      </div>
                      <div className="flex gap-1.5 py-1">
                        {(dealRoomData?.investors || []).map((inv) => (
                          <button
                            key={inv.id}
                            onClick={() => setSelectedInvestorId(inv.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                              (selectedInvestorId === inv.id || (!selectedInvestorId && dealRoomData?.investors?.[0].id === inv.id))
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                            }`}
                          >
                            {inv.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isFetchingMessages && discussionMessages.length === 0 ? (
                      <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      discussionMessages.map((msg) => {
                        const isMe = String(msg.sender?._id || msg.sender) === String(currentUser?.id);
                        const senderName = isMe ? "You" : (msg.sender?.name || "Participant");
                        return (
                          <div key={msg.id || msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-md' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                              {!isMe && <p className="text-[10px] font-bold mb-1 text-gray-400 uppercase tracking-wider">{senderName}</p>}
                              <p className="text-sm leading-relaxed">{msg.content || msg.text}</p>
                              <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {discussionMessages.length === 0 && !isFetchingMessages && (
                      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 grayscale opacity-60">
                         <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-gray-400" />
                         </div>
                         <div>
                            <p className="text-gray-900 font-bold">No messages yet</p>
                            <p className="text-sm text-gray-500 max-w-[200px] leading-tight">Start the conversation by sending a message below.</p>
                         </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2 relative">
                      <input name="input-594bd8"
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={(dealRoomData?.dealRoom?.founder === currentUser?.id) ? "Message investor directly..." : "Message founder directly..."}
                        className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-blue-100"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
