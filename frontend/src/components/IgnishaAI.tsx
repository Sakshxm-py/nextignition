import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Minimize2,
  Settings,
  Paperclip,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ChevronLeft,
  Upload,
  X,
  Copy,
  Download,
} from 'lucide-react';
import { copyAiContent, downloadAiContent } from '../utils/aiContentDownload';

type UserRole = 'founder' | 'expert' | 'investor';

interface Message {
  id: number;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  id: number;
  icon: string;
  label: string;
  role: UserRole;
  action?: 'pitch-deck-upload' | 'chat';
}

interface IgnishaAIProps {
  userRole: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

const quickActions: QuickAction[] = [
  // Founder actions
  { id: 1, icon: '📊', label: 'Analyze My Pitch Deck', role: 'founder', action: 'pitch-deck-upload' },
  { id: 2, icon: '🎯', label: 'Find Co-founders', role: 'founder', action: 'chat' },
  { id: 3, icon: '💡', label: 'Validate Business Idea', role: 'founder', action: 'chat' },
  { id: 4, icon: '📈', label: 'Get Growth Tips', role: 'founder', action: 'chat' },
  { id: 5, icon: '🔍', label: 'Competitor Analysis', role: 'founder', action: 'chat' },
  { id: 6, icon: '💰', label: 'Financial Projections', role: 'founder', action: 'chat' },
  // Investor actions
  { id: 7, icon: '📊', label: 'Analyze This Deal', role: 'investor', action: 'chat' },
  { id: 8, icon: '📈', label: 'Market Trend Insights', role: 'investor', action: 'chat' },
  { id: 9, icon: '💼', label: 'Portfolio Analytics', role: 'investor', action: 'chat' },
  { id: 10, icon: '⚠️', label: 'Risk Assessment', role: 'investor', action: 'chat' },
  // Expert actions
  { id: 11, icon: '👥', label: 'Find Ideal Clients', role: 'expert', action: 'chat' },
  { id: 12, icon: '📝', label: 'Generate Content Ideas', role: 'expert', action: 'chat' },
  { id: 13, icon: '📅', label: 'Prepare for Session', role: 'expert', action: 'chat' },
  { id: 14, icon: '💡', label: 'Resource Recommendations', role: 'expert', action: 'chat' },
];

// Rich prompt mapping: transforms short labels into detailed AI prompts
const QUICK_ACTION_PROMPTS: Record<string, string> = {
  'Find Co-founders': 'I\'m looking for a co-founder for my startup. Based on my profile, skills, and interests, what kind of co-founder should I look for? What complementary skills would be ideal? Give me a detailed co-founder search strategy.',
  'Validate Business Idea': 'Please perform a thorough business idea validation for my startup. Analyze the problem-solution fit, target market size, competitive landscape, and revenue potential. Score it out of 10 and provide actionable next steps.',
  'Get Growth Tips': 'Based on my startup profile and current stage, give me 5-7 specific, actionable growth strategies. Include both organic and paid tactics, with estimated effort and impact for each.',
  'Competitor Analysis': 'Conduct a competitor analysis for my startup. Identify 3-5 likely competitors in my space, compare their strengths and weaknesses against mine, and highlight my unique differentiation opportunities.',
  'Financial Projections': 'Generate a realistic 3-year financial projection for my startup. Include revenue assumptions, key expense categories, burn rate estimation, and runway analysis. Present it in a clear table format.',
  'Analyze This Deal': 'Help me evaluate a startup investment deal. What key metrics should I look at? Walk me through a due diligence checklist and red flags to watch for based on my investment profile.',
  'Market Trend Insights': 'What are the latest market trends and emerging opportunities relevant to my investment focus areas? Provide data-driven insights and highlight sectors with strong growth potential.',
  'Portfolio Analytics': 'Help me analyze my investment portfolio strategy. What diversification improvements can I make? Are there any sector concentration risks? Suggest optimization strategies.',
  'Risk Assessment': 'Perform a comprehensive risk assessment framework for startup investments. Cover market risk, team risk, technology risk, regulatory risk, and financial risk. Provide scoring criteria.',
  'Find Ideal Clients': 'Based on my expertise and skills, help me identify ideal client profiles for consulting/mentoring. What startups or founders would benefit most from my services? How should I position my offerings?',
  'Generate Content Ideas': 'Generate 10 high-impact content ideas for my area of expertise. Include LinkedIn posts, blog topics, and thought leadership angles that would attract startup founders as clients.',
  'Prepare for Session': 'Help me prepare a structured mentoring/consulting session framework. Include an agenda template, key questions to ask, and deliverables I should provide to maximize client value.',
  'Resource Recommendations': 'Recommend the best tools, frameworks, books, and resources for my area of expertise that I can share with startup founders. Organize by category with brief descriptions.',
};

const isAndroid = window.location.hostname === '10.0.2.2' || window.location.href.includes('capacitor://');
const fallback = isAndroid ? 'https://nextignition-l3b5.onrender.com/api' : 'https://nextignition-l3b5.onrender.com/api';
const API_BASE = import.meta.env.VITE_API_URL || fallback;

const getToken = () => localStorage.getItem('token') || '';

const formatTime = (date: Date) => {
  const h = date.getHours() % 12 || 12;
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
};

const normalizeContent = (content: string) =>
  content.replace(/\\n/g, '\n').trim();

export function IgnishaAI({ userRole, isOpen = false, onClose }: IgnishaAIProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm Ignisha AI, your personal startup assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  // Durable, server-side conversation memory. Persisted so the same thread is
  // resumed after the widget unmounts (which previously wiped all history) and
  // rehydrated from the backend on mount so memory survives reloads/devices.
  const [conversationId, setConversationId] = useState<string | null>(
    () => localStorage.getItem('ignisha_widget_conversation_id') || null,
  );
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredActions = quickActions.filter((a) => a.role === userRole);

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rehydrate the persisted conversation from the server on mount so closing and
  // reopening the widget (or refreshing) no longer loses the conversation.
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ignition/conversations/${conversationId}/messages`, {
          headers: { 'Authorization': `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.messages) || !data.messages.length) return;
        setMessages(
          data.messages.map((m: any, i: number) => ({
            id: i + 1,
            type: m.role === 'user' ? 'user' : 'ai',
            content: normalizeContent(m.content),
            timestamp: new Date(m.created_at),
          })),
        );
      } catch {
        // Stale/deleted thread — forget it and start fresh.
        if (!cancelled) {
          setConversationId(null);
          localStorage.removeItem('ignisha_widget_conversation_id');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushMessage = (type: Message['type'], content: string) =>
    setMessages((prev) => [...prev, { id: Date.now(), type, content, timestamp: new Date() }]);

  /* ── Real chat call ─────────────────────────────────────── */
  const handleSendMessage = async (text?: string) => {
    const msg = (text || inputValue).trim();
    if (!msg) return;

    pushMessage('user', msg);
    setInputValue('');
    setIsTyping(true);
    setSuggestions([]);

    try {
      const res = await fetch(`${API_BASE}/ignition/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        // History is read server-side from the thread; we only send the new
        // message + the conversation id (assigned by the backend on turn one).
        // `persist: true` opts this widget into durable memory.
        body: JSON.stringify({ message: msg, conversationId, persist: true }),
      });

      const data = await res.json();
      if (data?.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem('ignisha_widget_conversation_id', data.conversationId);
      }
      const reply = data?.message || data?.reply || data?.response || "I couldn't generate a response right now.";
      pushMessage('ai', normalizeContent(reply));
      setSuggestions(['Tell me more', 'Show examples', 'What are next steps?']);
      setTimeout(() => setSuggestions([]), 30000);
    } catch {
      pushMessage('ai', "I'm having trouble connecting to the server. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  /* ── Pitch deck upload ──────────────────────────────────── */
  const handlePitchDeckUpload = async (file: File) => {
    setShowUpload(false);
    setUploading(true);
    pushMessage('system', `Uploading "${file.name}"…`);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('pitchDeck', file);

      const res = await fetch(`${API_BASE}/ignition/pitch-deck`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        pushMessage('ai', `❌ Analysis failed: ${data?.message || 'Unknown error.'}`);
        return;
      }

      // Build a readable summary from the analysis
      const summary = data?.summary || data?.highlights?.join('\n') || JSON.stringify(data, null, 2);
      pushMessage('ai', `✅ **Pitch Deck Analysis Complete!**\n\n${normalizeContent(String(summary))}\n\n💡 You can now generate a formatted investor deck by asking me to "Generate my pitch deck template".`);
      setSuggestions(['Generate my pitch deck template', 'What are the weak points?', 'How can I improve my ask?']);
      setTimeout(() => setSuggestions([]), 60000);
    } catch {
      pushMessage('ai', '❌ Could not upload the file. Please try again.');
    } finally {
      setIsTyping(false);
      setUploading(false);
    }
  };

  /* ── Quick actions ──────────────────────────────────────── */
  const handleQuickAction = (action: QuickAction) => {
    if (action.action === 'pitch-deck-upload') {
      setShowUpload(true);
    } else {
      // Use enriched prompt if available, otherwise fall back to label
      const richPrompt = QUICK_ACTION_PROMPTS[action.label] || action.label;
      handleSendMessage(richPrompt);
    }
  };

  const handleSuggestion = (s: string) => {
    setSuggestions([]);
    handleSendMessage(s);
  };

  /* ── Shared UI pieces ───────────────────────────────────── */
  const UploadOverlay = () => (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 rounded-2xl">
      <div className="bg-white rounded-xl p-6 w-72 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-gray-800">Upload Pitch Deck</span>
          <button onClick={() => setShowUpload(false)}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Supported: PDF, PPTX, PPT, DOCX (max 20 MB)</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-[#6666FF] rounded-xl flex flex-col items-center gap-2 hover:bg-[#6666FF]/5 transition-colors"
        >
          <Upload className="w-6 h-6 text-[#6666FF]" />
          <span className="text-sm text-[#6666FF] font-medium">Choose File</span>
        </button>
        <input name="input-b98564"
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.ppt,.docx,.doc"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePitchDeckUpload(f);
          }}
        />
      </div>
    </div>
  );

  const ChatMessages = () => (
    <>
      {messages.map((msg) => (
        <div key={msg.id} className="mb-4">
          {msg.type === 'user' && (
            <div className="flex justify-end">
              <div className="max-w-[75%]">
                <div className="bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white rounded-2xl rounded-br-sm px-4 py-2.5">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          )}
          {msg.type === 'ai' && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="max-w-[78%]">
                <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">{formatTime(msg.timestamp)}</p>
                  <button className="p-0.5 hover:bg-gray-200 rounded"><ThumbsUp className="w-3 h-3 text-gray-400" /></button>
                  <button className="p-0.5 hover:bg-gray-200 rounded"><ThumbsDown className="w-3 h-3 text-gray-400" /></button>
                  {!!msg.content?.trim() && (
                    <>
                      <button
                        onClick={() => copyAiContent(msg.content)}
                        className="p-0.5 hover:bg-gray-200 rounded"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                      <button
                        onClick={() => downloadAiContent(msg.content)}
                        className="p-0.5 hover:bg-gray-200 rounded"
                        title="Download as document"
                      >
                        <Download className="w-3 h-3 text-gray-400" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {msg.type === 'system' && (
            <div className="flex justify-center">
              <p className="text-xs text-gray-400 italic">{msg.content}</p>
            </div>
          )}
        </div>
      ))}
      {isTyping && (
        <div className="flex gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="bg-gray-100 rounded-2xl px-4 py-2.5">
            <div className="flex gap-1 py-1">
              {[0, 150, 300].map((d) => (
                <div key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  const InputBar = ({ compact = false }) => (
    <div className={`flex items-end gap-2 ${compact ? '' : ''}`}>
      <button
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg flex-shrink-0"
        onClick={() => setShowUpload(true)}
        title="Upload pitch deck"
      >
        <Paperclip className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
      </button>
      <div className={`flex-1 bg-gray-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#6666FF]`}>
        <input name="input-3870c9"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          placeholder="Ask Ignisha anything…"
          className="w-full bg-transparent border-none outline-none text-sm"
          disabled={uploading}
        />
      </div>
      {inputValue.trim() ? (
        <button
          onClick={() => handleSendMessage()}
          className={`rounded-full bg-[#6666FF] flex items-center justify-center flex-shrink-0 hover:bg-[#5555EE] transition-colors ${compact ? 'w-9 h-9' : 'w-10 h-10'}`}
        >
          <Send className={compact ? 'w-4 h-4 text-white' : 'w-4 h-4 text-white'} />
        </button>
      ) : (
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg flex-shrink-0">
          <Mic className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </button>
      )}
    </div>
  );

  const Suggestions = () =>
    suggestions.length > 0 ? (
      <div className="px-3 py-2 border-t border-gray-100 bg-white">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestion(s)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-[#6666FF]/10 hover:text-[#6666FF] transition-colors whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  /* ── Render: minimized desktop ─────────────────────────── */
  if (isMinimized && !isMobileView) return null;

  /* ── Render: mobile ─────────────────────────────────────── */
  if (isMobileView) {
    if (!isOpen) {
      return (
        <motion.button
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 h-14 px-6 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] shadow-lg flex items-center gap-2 z-50"
          onClick={onClose}
        >
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm">Ask Ignisha</span>
        </motion.button>
      );
    }

    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-white z-50 flex flex-col"
      >
        <style>{`.hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white shadow-sm">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-[#6666FF]">Ignisha AI</span>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg"><Settings className="w-5 h-5 text-gray-600" /></button>
        </div>
        {/* Quick Actions */}
        <div className="p-3 border-b border-gray-200 overflow-x-auto hide-scrollbar">
          <div className="flex gap-3">
            {filteredActions.slice(0, 5).map((a) => (
              <button
                key={a.id}
                onClick={() => handleQuickAction(a)}
                className="flex-shrink-0 w-[130px] h-[90px] border border-[#6666FF] rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-[#6666FF] hover:text-white transition-colors"
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium text-center px-2 leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar p-4 bg-gray-50 relative">
          {showUpload && <UploadOverlay />}
          <ChatMessages />
        </div>
        <Suggestions />
        <div className="p-3 border-t border-gray-200 bg-white shrink-0">
          <InputBar />
        </div>
      </motion.div>
    );
  }

  /* ── Render: desktop expanded ───────────────────────────── */
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed right-5 bottom-5 w-80 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50"
    >
      <style>{`.hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#6666FF] text-sm">Ignisha AI</span>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            </div>
            <p className="text-xs text-gray-400">Online</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Minimize2 className="w-4 h-4 text-gray-500" /></button>
        </div>
      </div>
      {/* Quick Actions */}
      <div className="p-2.5 border-b border-gray-100 overflow-x-auto hide-scrollbar">
        <div className="flex gap-1.5">
          {filteredActions.map((a) => (
            <button
              key={a.id}
              onClick={() => handleQuickAction(a)}
              className="px-2.5 py-1.5 border border-[#6666FF] rounded-full text-xs font-medium text-[#6666FF] whitespace-nowrap hover:bg-[#6666FF] hover:text-white transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <span>{a.icon}</span><span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar p-4 bg-gray-50 relative">
        {showUpload && <UploadOverlay />}
        <ChatMessages />
      </div>
      <Suggestions />
      <div className="p-3 border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
        <InputBar compact />
      </div>
    </motion.div>
  );
}