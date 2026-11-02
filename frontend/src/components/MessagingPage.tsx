import { Capacitor } from '@capacitor/core';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Mic,
  Send,
  Smile,
  Download,
  Star,
  Archive,
  Trash2,
  Check,
  CheckCheck,
  Circle,
  Pin,
  Bell,
  BellOff,
  AlertCircle,
  Calendar,
  CreditCard,
  FolderOpen,
  TrendingUp,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowLeft,
  Plus,
  Globe,
  Camera,
  Folder,
  Upload,
  Play,
  Pause,
  Eye,
  Target,
  DollarSign,
  BookOpen,
  Shield,
  Users,
  Building,
  MessageCircle,
  UserPlus,
  UserCheck,
  Zap,
  Settings,
  Sparkles,
  User,
  LogOut,
  Link2,
  BadgeCheck,
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import api from '../services/api';
import { getCurrentUser, logout as logoutUser } from '../services/authService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { toast } from 'sonner';
import { ScheduleMeetingModal } from './ScheduleMeetingModal';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ProfileViewModal } from './ProfileViewModal';
import { ReportDialog } from './ReportDialog';
import { Flag as ReportFlagIcon, Ban as BlockUserIcon } from 'lucide-react';

function getApiBaseUrlNoApiSuffix() {
  const envBase = (import.meta as any).env?.VITE_API_URL as string | undefined;
  // For mobile IPs, always trust the env var — never override with a stale localStorage value
  if (envBase && (envBase.includes('10.0.2.2') || envBase.includes('192.168.'))) {
    return String(envBase).replace(/\/+api\/?$/, '');
  }
  const preferredBase = localStorage.getItem('preferredApiBaseUrl') || undefined;
  const isAndroid = window.location.hostname === '10.0.2.2' || window.location.href.includes('capacitor://');
  const fallback = isAndroid ? 'https://nextignition-l3b5.onrender.com/api' : 'https://nextignition-l3b5.onrender.com/api';
  const rawBase = envBase || preferredBase || fallback;
  return String(rawBase).replace(/\/+api\/?$/, '');
}

function resolveAvatarUrl(avatar?: string): string | null {
  if (!avatar) return null;
  const trimmed = String(avatar).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (trimmed.startsWith('/')) {
    const base = getApiBaseUrlNoApiSuffix();
    return `${base}${trimmed}`;
  }

  return null;
}

function getAvatarInitial(name?: string) {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'U';
}

function isSameLabel(a?: string, b?: string) {
  const aa = (a || '').trim().toLowerCase();
  const bb = (b || '').trim().toLowerCase();
  return Boolean(aa && bb && aa === bb);
}

type UserRole = 'founder' | 'expert' | 'investor';

interface Message {
  id: string;
  senderId: string;
  text?: string;
  timestamp: Date;
  read: boolean;
  type: 'text' | 'image' | 'file' | 'voice' | 'meeting' | 'post';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: string;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  participantCompany: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
  pinned: boolean;
  archived: boolean;
  verified: boolean;
  badge?: 'expert' | 'investor' | 'founder' | 'client' | 'prospect';
  pipelineStage?: 'interested' | 'review' | 'negotiating' | 'invested' | 'passed';
  startupStage?: string;
  fundingAsk?: string;
}

interface MessagingPageProps {
  initialUserId?: string;
  onBack?: () => void;
}
const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & People',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','👽','👾','🤖','👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄']
  },
  {
    name: 'Objects & Symbols',
    emojis: ['💡','🔦','🕯','🔥','💥','💯','💢','💬','👁️‍🗨️','🗨️','🗯️','💭','💤','🌐','✅','❌','❎','❓','❔','❕','❗️','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','🚀','🛸','🚁','🛶','⛵','🚤','🛳','⛴','🚢','✈️','🛩','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸']
  }
];

type ApiUser = {
  _id: string;
  name?: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
};

type ApiConversation = {
  _id: string;
  participants: ApiUser[];
  lastMessage?: {
    content?: string;
    sender?: string;
    timestamp?: string;
  };
  unreadCount?: Record<string, number>;
  updatedAt?: string;
};

type ApiMessage = {
  _id: string;
  conversationId: string;
  sender: ApiUser | string;
  receiver: string;
  content: string;
  isRead: boolean;
  type: 'text' | 'file' | 'image';
  fileUrl?: string;
  createdAt: string;
};

type PeopleUser = {
  _id: string;
  name?: string;
  role?: string;
  avatar?: string;
  isVerified?: boolean;
};

type ApiCommunity = {
  _id: string;
  name: string;
  icon?: string;
};

export function MessagingPage({
  initialUserId,
  onBack
}: MessagingPageProps) {
  const currentUser = getCurrentUser();
  const currentUserId: string | null = currentUser?._id || currentUser?.id || null;
  const { hasFeature, userPlan } = useFeatureAccess();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [showReportConversation, setShowReportConversation] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string>('');

  const [peopleQuery, setPeopleQuery] = useState('');
  const [recommendedUsers, setRecommendedUsers] = useState<PeopleUser[]>([]);
  const [peopleResults, setPeopleResults] = useState<PeopleUser[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [followingUserIds, setFollowingUserIds] = useState<Set<string>>(new Set());
  const [followerUserIds, setFollowerUserIds] = useState<Set<string>>(new Set());

  const [myCommunities, setMyCommunities] = useState<ApiCommunity[]>([]);
  const [inviteTargetUser, setInviteTargetUser] = useState<PeopleUser | null>(null);
  const [inviteCommunityId, setInviteCommunityId] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [sidebarTab, setSidebarTab] = useState<'messages' | 'discover'>('messages');
  const [justFollowedUser, setJustFollowedUser] = useState<PeopleUser | null>(null);
  const [followMessageInput, setFollowMessageInput] = useState('');
  const [sendingFollowMessage, setSendingFollowMessage] = useState(false);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [plusMenuPos, setPlusMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Handle click outside for emoji picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [messageInput]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const mapApiConversationToUi = (c: ApiConversation): Conversation | null => {
    if (!currentUserId) return null;
    const other = (c.participants || []).find((p) => {
      if (!p?._id || !currentUserId) return false;
      const pid = String(p._id).trim().toLowerCase();
      const mid = String(currentUserId).trim().toLowerCase();
      return pid !== mid;
    });
    if (!other?._id) return null;

    const lastTimestamp = c.lastMessage?.timestamp || c.updatedAt;
    const ts = lastTimestamp ? new Date(lastTimestamp) : null;
    
    const pinnedBy = (c as any).pinnedBy || [];
    const archivedBy = (c as any).archivedBy || [];

    return {
      id: c._id,
      participantId: other._id,
      participantName: other.name || 'User',
      participantRole: other.role || '',
      participantCompany: '',
      avatar: resolveAvatarUrl(other.avatar) || getAvatarInitial(other.name),
      lastMessage: c.lastMessage?.content || '',
      timestamp: ts ? ts.toLocaleString() : '',
      unreadCount: c.unreadCount?.[currentUserId] || 0,
      online: false,
      pinned: pinnedBy.includes(currentUserId),
      archived: archivedBy.includes(currentUserId),
      verified: !!other.isVerified,
      badge: (other.role as any) || undefined,
    };
  };

  const mapApiMessageToUi = (m: ApiMessage): Message => {
    const senderId = typeof m.sender === 'string' ? m.sender : m.sender?._id;
    const base: Message = {
      id: m._id,
      senderId: senderId || '',
      text: m.content,
      timestamp: new Date(m.createdAt),
      read: !!m.isRead,
      type: m.type === 'image' ? 'image' : m.type === 'file' || (m.type as any) === 'attachment' ? 'file' : 'text',
      fileUrl: m.fileUrl || (m as any).metadata?.attachments?.[0]?.url,
      fileName: m.type === 'file' ? 'File' : (m as any).metadata?.attachments?.[0]?.originalName,
    };
    return base;
  };

  const fetchConversations = async () => {
    if (!currentUserId) {
      setConversations([]);
      return;
    }

    setLoadingConversations(true);
    setError('');
    try {
      const resp = await api.get<ApiConversation[]>('/messaging/conversations');
      const mapped = (resp.data || [])
        .map(mapApiConversationToUi)
        .filter((x): x is Conversation => Boolean(x));
        
      const uniqueConversationsMap = new Map<string, Conversation>();
      mapped.forEach(c => {
        if (!uniqueConversationsMap.has(c.participantId)) {
          uniqueConversationsMap.set(c.participantId, c);
        } else {
          const existing = uniqueConversationsMap.get(c.participantId)!;
          if (new Date(c.timestamp) > new Date(existing.timestamp)) {
            uniqueConversationsMap.set(c.participantId, c);
          }
        }
      });
      
      setConversations(Array.from(uniqueConversationsMap.values()));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch conversations';
      setError(msg);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchMyCommunities = async () => {
    try {
      const resp = await api.get<ApiCommunity[]>('/communities');
      setMyCommunities(resp.data || []);
    } catch {
      setMyCommunities([]);
    }
  };

  const openInviteModal = (u: PeopleUser) => {
    setInviteTargetUser(u);
    setInviteCommunityId('');
  };

  const closeInviteModal = () => {
    setInviteTargetUser(null);
    setInviteCommunityId('');
    setInviteLoading(false);
  };

  const sendCommunityInvite = async () => {
    if (!inviteTargetUser?._id) return;
    if (!inviteCommunityId) {
      setError('Select a community first');
      return;
    }
    setInviteLoading(true);
    setError('');
    try {
      // Notification-based invite — works for anyone, no mutual-follow / chat needed.
      await api.post(`/communities/${inviteCommunityId}/invite`, {
        targetUserId: inviteTargetUser._id,
      });
      toast.success(`Invite sent to ${inviteTargetUser.name || 'user'}`);
      closeInviteModal();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send invite';
      setError(msg);
      toast.error(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    setError('');
    try {
      const resp = await api.get<ApiMessage[]>(`/messaging/conversations/${conversationId}/messages`);
      setMessages((resp.data || []).map(mapApiMessageToUi));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch messages';
      setError(msg);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markConversationRead = async (conversationId: string) => {
    try {
      await api.put(`/messaging/conversations/${conversationId}/read`);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      // ignore
    }
  };

  const fetchFollowing = async () => {
    try {
      const resp = await api.get<{ followingUserIds: string[] }>('/follow/following');
      setFollowingUserIds(new Set(resp.data?.followingUserIds || []));
    } catch (err: any) {
      console.error('fetchFollowing error:', err.response?.data || err.message);
      setFollowingUserIds(new Set());
    }
  };

  const fetchFollowers = async () => {
    try {
      const resp = await api.get<{ followerUserIds: string[] }>('/follow/followers');
      setFollowerUserIds(new Set(resp.data?.followerUserIds || []));
    } catch (err: any) {
      console.error('fetchFollowers error:', err.response?.data || err.message);
      setFollowerUserIds(new Set());
    }
  };

  // Two people can only message once they BOTH follow each other.
  const isMutual = (userId: string) => followingUserIds.has(userId) && followerUserIds.has(userId);

  const fetchRecommended = async () => {
    setLoadingPeople(true);
    try {
      const resp = await api.get<PeopleUser[]>('/messaging/users/messaging');
      setRecommendedUsers(resp.data || []);
    } catch (err: any) {
      console.error('fetchRecommended error:', err.response?.data || err.message);
      setRecommendedUsers([]);
    } finally {
      setLoadingPeople(false);
    }
  };

  const searchPeople = async (q: string) => {
    setLoadingPeople(true);
    try {
      const resp = await api.get<PeopleUser[]>('/messaging/users/search', {
        params: { query: q },
      });
      setPeopleResults(resp.data || []);
    } catch (err: any) {
      console.error('searchPeople error:', err.response?.data || err.message);
      setPeopleResults([]);
    } finally {
      setLoadingPeople(false);
    }
  };

  const follow = async (targetUser: PeopleUser) => {
    if (!targetUser || !targetUser._id) {
      setError('Invalid user');
      return;
    }

    try {
      await api.post(`/follow/${targetUser._id}`);
      setFollowingUserIds((prev) => new Set(prev).add(targetUser._id));
      if (isMutual(targetUser._id) || followerUserIds.has(targetUser._id)) {
        toast.success(`You can now message ${targetUser.name || 'this user'} — you both follow each other.`);
      } else {
        toast.success(`You're now following ${targetUser.name || 'this user'}. You can message once they follow you back.`);
      }
    } catch (err: any) {
      console.error('follow error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to follow user');
    }
  };

  // Action buttons shown next to a person in the People/Search lists:
  // Follow/Following toggle, a mutual-gated Message button, and Invite-to-community.
  const renderPeopleActions = (u: PeopleUser) => {
    const following = followingUserIds.has(u._id);
    const mutual = isMutual(u._id);
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => (following ? unfollow(u._id) : follow(u))}
          title={following ? 'Unfollow' : 'Follow'}
          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1 ${
            following
              ? 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100/50'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
          }`}
        >
          {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {following ? 'Following' : 'Follow'}
        </button>
        <button
          onClick={() => mutual ? startChatWithUser(u._id) : toast.error('You can only message someone when you both follow each other.')}
          disabled={!mutual}
          title={mutual ? 'Message' : 'You must follow each other to chat'}
          className={`p-2 rounded-lg transition-all active:scale-95 ${
            mutual ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => openInviteModal(u)}
          title="Invite to a community"
          className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-95"
        >
          <Users className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const unfollow = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === 'undefined') {
      setError('Invalid user');
      return;
    }
    try {
      await api.delete(`/follow/${targetUserId}`);
      setFollowingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } catch (err: any) {
      console.error('unfollow error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to unfollow user');
    }
  };

  const startChatWithUser = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === 'undefined') {
      setError('Invalid user');
      return;
    }

    if (!isMutual(targetUserId)) {
      toast.error('You can only message someone when you both follow each other.');
      return;
    }

    if (!hasFeature('canDirectMessage')) {
      toast.error(Capacitor.getPlatform() === 'ios' ? 'Direct messaging is available with NextIgnition Premium.' : `Your current ${userPlan} plan does not allow initiating direct messages. Please upgrade to Pro.`, {
        action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
      });
      return;
    }

    setError('');
    try {
      const resp = await api.post<ApiConversation>('/messaging/conversations', {
        otherUserId: targetUserId,
      });

      const mapped = mapApiConversationToUi(resp.data);
      if (!mapped) return;

      setConversations((prev) => {
        const existing = prev.find((c) => c.id === mapped.id);
        if (existing) return prev;
        return [mapped, ...prev];
      });

      handleConversationClick(mapped);
      // Refresh state
      fetchConversations();
      fetchRecommended();
      setPeopleQuery('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to start chat';
      setError(msg);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    fetchFollowing();
    fetchFollowers();
    fetchRecommended();
    fetchMyCommunities();
  }, [currentUserId]);

  useEffect(() => {
    if (initialUserId && initialUserId !== 'undefined') {
      startChatWithUser(initialUserId);
    }
  }, [initialUserId]);

  const InviteCommunityModal = () => {
    if (!inviteTargetUser) return null;
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeInviteModal}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold">Invite to Community</h2>
            <button onClick={closeInviteModal} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5">
            <div className="text-sm text-gray-700 mb-3">
              Invite <span className="font-semibold">{inviteTargetUser.name || 'User'}</span> to one of your communities.
            </div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Community</label>
            <select name="select-040719"
              value={inviteCommunityId}
              onChange={(e) => setInviteCommunityId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a community</option>
              {myCommunities.map((c) => (
                <option key={c._id} value={c._id}>
                  {(c.icon ? `${c.icon} ` : '') + c.name}
                </option>
              ))}
            </select>
            {myCommunities.length === 0 && (
              <div className="mt-2 text-xs text-gray-500">No communities available to invite from.</div>
            )}
          </div>
          <div className="p-5 border-t border-gray-200 flex gap-3">
            <button
              onClick={closeInviteModal}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50"
              disabled={inviteLoading}
            >
              Cancel
            </button>
            <button
              onClick={sendCommunityInvite}
              className="flex-1 px-4 py-3 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              disabled={inviteLoading || !inviteCommunityId}
            >
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participantCompany.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Updated filter logic: unread/pinned should only show if NOT archived, UNLESS archived is the active filter
    if (filter === 'archived') return matchesSearch && conv.archived;
    
    const matchesFilter = (filter === 'all' && !conv.archived) ||
      (filter === 'unread' && conv.unreadCount > 0 && !conv.archived) ||
      (filter === 'pinned' && conv.pinned && !conv.archived);
      
    return matchesSearch && matchesFilter;
  });


  const postTextToActiveConversation = async (rawText: string, clearComposer = false) => {
    const text = rawText.trim();
    if (!text || !activeConversation || !currentUserId) return;

    setError('');
    try {
      const resp = await api.post<ApiMessage>(
        `/messaging/conversations/${activeConversation.id}/messages`,
        { content: text }
      );

      const created = mapApiMessageToUi(resp.data);
      setMessages((prev) => [...prev, created]);
      if (clearComposer) setMessageInput('');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessage: text, timestamp: new Date().toLocaleString() }
            : c
        )
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send message';
      setError(msg);
    }
  };

  const sendMessage = async () => {
    await postTextToActiveConversation(messageInput, true);
  };

  const sendLinkFromDialog = async () => {
    const raw = linkUrlDraft.trim();
    if (!raw) {
      toast.error('Enter a URL');
      return;
    }
    let normalized: string;
    try {
      normalized = new URL(raw.includes('://') ? raw : `https://${raw}`).toString();
    } catch {
      toast.error('Please enter a valid URL (e.g. a Drive or Doc link)');
      return;
    }
    setShowLinkDialog(false);
    setLinkUrlDraft('');
    setShowPlusMenu(false);
    setPlusMenuPos(null);
    await postTextToActiveConversation(`🔗 ${normalized}`, false);
  };

  const togglePlusMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showPlusMenu) {
      setShowPlusMenu(false);
      setPlusMenuPos(null);
      return;
    }
    const el = plusBtnRef.current;
    const menuWidth = 300;
    const menuHeight = 360; // Increased to account for 4 items + header
    const pad = 16;
    const r = el?.getBoundingClientRect();
    if (!r) {
      setShowPlusMenu(true);
      return;
    }
    
    // Calculate horizontal position
    let left = r.left;
    if (left + menuWidth > window.innerWidth - pad) {
      left = window.innerWidth - menuWidth - pad;
    }
    left = Math.max(pad, left);

    // Calculate vertical position - ALWAYS prefer showing above the input bar to avoid covering it
    let top = r.top - menuHeight - pad;
    
    // If not enough space above, then show below
    if (top < pad) {
      top = r.bottom + pad;
    }
    
    setPlusMenuPos({ left, top });
    setShowPlusMenu(true);
  };



  useEffect(() => {
    if (!showPlusMenu) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (plusBtnRef.current?.contains(t)) return;
      const menuEl = document.getElementById('messaging-plus-menu-popover');
      if (menuEl?.contains(t)) return;
      setShowPlusMenu(false);
      setPlusMenuPos(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showPlusMenu]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeConversation) return;

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));

    try {
      const resp = await api.post<ApiMessage>(
        `/messaging/conversations/${activeConversation.id}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      const created = mapApiMessageToUi(resp.data);
      setMessages((prev) => [...prev, created]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessage: created.text || 'Sent an attachment', timestamp: new Date().toLocaleString() }
            : c
        )
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload file';
      setError(msg);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const handleConversationClick = (conv: Conversation) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
    markConversationRead(conv.id);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setIsInfoSidebarOpen(false);
  };

  const handleViewProfile = () => {
    if (!activeConversation) return;
    setSelectedProfile({
      id: activeConversation.participantId,
      name: activeConversation.participantName,
      role: activeConversation.participantRole,
      company: activeConversation.participantCompany,
      avatar: resolveAvatarUrl(activeConversation.avatar) || undefined,
      verified: activeConversation.verified,
      type: (activeConversation.badge as any) || 'expert',
      location: 'Remote', // Fallback
      bio: 'Professional biography matches high-quality profile standards.'
    });
  };


  const handleArchiveChat = async () => {
    if (!activeConversation) return;
    try {
      await api.put(`/messaging/conversations/${activeConversation.id}/archive`);
      setConversations(prev => prev.filter(c => c.id !== activeConversation.id));
      setActiveConversation(null);
      setIsInfoSidebarOpen(false);
    } catch (err) {
      console.error('Failed to archive chat:', err);
    }
  };

  const handleBlockUser = async () => {
    if (!activeConversation) return;
    if (!window.confirm(`Block ${activeConversation.participantName}? You will no longer exchange messages or see each other's activity.`)) return;
    try {
      await api.post(`/users/${activeConversation.participantId}/block`);
      toast.success(`${activeConversation.participantName} has been blocked`);
      setConversations(prev => prev.filter(c => c.id !== activeConversation.id));
      setActiveConversation(null);
      setIsInfoSidebarOpen(false);
    } catch {
      toast.error('Could not block this user. Please try again.');
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConversation) return;
    if (!window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) return;
    try {
      await api.delete(`/messaging/conversations/${activeConversation.id}`);
      setConversations(prev => prev.filter(c => c.id !== activeConversation.id));
      setActiveConversation(null);
      setIsInfoSidebarOpen(false);
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handleTogglePin = async () => {
    if (!activeConversation) return;
    try {
      const resp = await api.put<{ pinned: boolean }>(`/messaging/conversations/${activeConversation.id}/pin`);
      const isPinned = resp.data.pinned;
      setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, pinned: isPinned } : c));
      setActiveConversation(prev => prev ? { ...prev, pinned: isPinned } : null);
      toast.success(isPinned ? 'Conversation pinned' : 'Conversation unpinned');
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      toast.error('Failed to update pin status');
    }
  };

  const toggleMuteNotifications = () => {
    setIsMuted(!isMuted);
  };

  const pipelineStageLabel = activeConversation?.pipelineStage
    ? activeConversation.pipelineStage.charAt(0).toUpperCase() + activeConversation.pipelineStage.slice(1)
    : '';

  // Desktop View
  return (
    <div className="h-full lg:h-full flex bg-white rounded-[0px] border-0 lg:border border-gray-200 overflow-hidden">
      <InviteCommunityModal />
      {justFollowedUser && activeConversation && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold">Say Hi! 👋</h2>
              <p className="text-sm text-gray-500 mt-1">You just followed {justFollowedUser.name}. Let them know!</p>
            </div>
            <div className="p-5">
              <textarea name="textarea-9826f0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                rows={3}
                value={followMessageInput}
                onChange={(e) => setFollowMessageInput(e.target.value)}
                placeholder="Write a message..."
              />
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setJustFollowedUser(null)}
                className="flex-1 py-3 rounded-lg font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={sendingFollowMessage}
              >
                Skip
              </button>
              <button
                onClick={async () => {
                  if (!followMessageInput.trim() || !activeConversation) return;
                  setSendingFollowMessage(true);
                  try {
                    const resp = await api.post<ApiMessage>(
                      `/messaging/conversations/${activeConversation.id}/messages`,
                      { content: followMessageInput.trim() }
                    );
                    const created = mapApiMessageToUi(resp.data);
                    setMessages((prev) => [...prev, created]);
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === activeConversation.id
                          ? { ...c, lastMessage: followMessageInput.trim(), timestamp: new Date().toLocaleString() }
                          : c
                      )
                    );
                    setJustFollowedUser(null);
                  } catch(e) {
                    console.error('Failed to send follow message', e);
                  } finally {
                    setSendingFollowMessage(false);
                  }
                }}
                disabled={sendingFollowMessage || !followMessageInput.trim()}
                className="flex-[2] py-3 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {sendingFollowMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Conversations Sidebar */}
      <div className={`w-full lg:w-80 border-r border-gray-200 flex flex-col bg-white h-full overflow-hidden flex-shrink-0 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          {/* Tabs at the very top */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
            <button
              onClick={() => setSidebarTab('messages')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${sidebarTab === 'messages' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Messages
            </button>
            <button
              onClick={() => setSidebarTab('discover')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${sidebarTab === 'discover' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900 shadow-inner hover:shadow-none'}`}
            >
              Discover
            </button>
          </div>

          {/* Unified Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input name="input-e58766"
              type="text"
              placeholder={sidebarTab === 'messages' ? "Search conversations..." : "Find people to message..."}
              value={sidebarTab === 'messages' ? searchQuery : peopleQuery}
              onChange={(e) => {
                const v = e.target.value;
                if (sidebarTab === 'messages') {
                  setSearchQuery(v);
                } else {
                  setPeopleQuery(v);
                  if (v.trim().length === 0) {
                    setPeopleResults([]);
                    return;
                  }
                  searchPeople(v);
                }
              }}
              className="w-full pl-9 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium"
            />
          </div>
          {error && (
            <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 animate-pulse">
              {error}
            </div>
          )}

          {sidebarTab === 'messages' && (
            <div className="flex gap-2 p-4 pt-1 border-b border-gray-100 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 ${filter === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 ${filter === 'unread'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('pinned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 ${filter === 'pinned'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                Pinned
              </button>
              <button
                onClick={() => setFilter('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 ${filter === 'archived'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                Archived
              </button>
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {sidebarTab === 'messages' ? (
            loadingConversations && conversations.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">Loading conversations...</div>
            ) : (
              <>
                {filteredConversations.map(conv => (
                  <motion.div
                    key={conv.id}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                    onClick={() => handleConversationClick(conv)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors relative ${activeConversation?.id === conv.id ? 'bg-blue-50' : ''
                      }`}
                  >
                    <ConversationItem
                      conversation={conv}
                      isActive={activeConversation?.id === conv.id}
                      onClick={() => handleConversationClick(conv)}
                    />
                  </motion.div>
                ))}
                {filteredConversations.length === 0 && (
                  <div className="p-4 text-sm text-gray-600">No conversations yet.</div>
                )}
              </>
            )
          ) : (
            <div className="flex-1 overflow-y-auto hide-scrollbar">
              <div className="p-2 space-y-1">
                {peopleQuery.trim().length > 0 ? (
                  <>
                    <div className="px-2 py-2 text-xs font-black text-gray-400 uppercase tracking-[0.15em]">Search Results</div>
                    {loadingPeople ? (
                      <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Searching...</p>
                      </div>
                    ) : peopleResults.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl mx-2">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 text-2xl">🔍</div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching people found</p>
                      </div>
                    ) : (
                      peopleResults.map((u, idx) => {
                        const isFollowing = followingUserIds.has(u._id);
                        const displayName = u.name || 'User';
                        const avatarUrl = resolveAvatarUrl(u.avatar);
                        const initials = getAvatarInitial(displayName);
                        return (
                          <div key={u._id || idx} className="flex items-center justify-between gap-2 p-3 border-b border-gray-50 hover:bg-gray-50 transition-all rounded-xl">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0 overflow-hidden shadow-sm">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">{displayName}</div>
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">{u.role || 'Member'}</div>
                              </div>
                            </div>
                            {renderPeopleActions(u)}
                          </div>
                        );
                      })
                    )}
                  </>
                ) : (
                  <>
                    <div className="px-2 py-4 text-xs font-black text-gray-400 uppercase tracking-[0.15em]">Suggested People</div>
                    {recommendedUsers.filter(u => !followingUserIds.has(u._id) && u._id !== currentUserId).length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl mx-2">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">No new suggestions<br/>at the moment</p>
                      </div>
                    ) : (
                      recommendedUsers
                        .filter(u => !followingUserIds.has(u._id) && u._id !== currentUserId)
                        .map((u, idx) => {
                          const displayName = u.name || 'User';
                          const avatarUrl = resolveAvatarUrl(u.avatar);
                          const initials = getAvatarInitial(displayName);
                          return (
                            <div key={u._id || idx} className="flex items-center justify-between gap-2 p-3 border-b border-gray-50 hover:bg-gray-50 transition-all rounded-xl">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0 overflow-hidden shadow-sm">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    initials
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-gray-900 truncate">{displayName}</div>
                                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">{u.role || 'Member'}</div>
                                </div>
                              </div>
                              {renderPeopleActions(u)}
                            </div>
                          );
                        })
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white h-full min-h-0 overflow-hidden ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
        {activeConversation ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white sticky top-0 z-50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => onBack ? onBack() : handleBackToList()}
                  className="lg:hidden p-1.5 -ml-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden shadow-sm">
                  {resolveAvatarUrl(activeConversation.avatar) ? (
                    <img
                      src={resolveAvatarUrl(activeConversation.avatar) as string}
                      alt={activeConversation.participantName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    activeConversation.avatar
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-bold text-gray-900 truncate text-sm sm:text-base">{activeConversation.participantName}</h2>
                    {activeConversation.verified && (
                      <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activeConversation.online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    <span className="text-[10px] sm:text-xs text-gray-400 truncate uppercase font-bold tracking-wider">
                      {activeConversation.online ? 'Active Now' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 ml-2">
                <button
                  onClick={() => setIsInfoSidebarOpen(!isInfoSidebarOpen)}
                  className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isInfoSidebarOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-50 hide-scrollbar">
              {loadingMessages && messages.length === 0 ? (
                <div className="text-sm text-gray-600">Loading messages...</div>
              ) : null}

              {messages.map((message, index) => (
                <div
                  key={message.id ?? `msg-${index}`}
                  className={`flex mb-4 ${String(message.senderId) === String(currentUserId) ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${String(message.senderId) === String(currentUserId)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                    }`}>
                    {message.fileUrl ? (
                      message.type === 'image' || message.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img src={message.fileUrl} alt="attachment" className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90" onClick={() => window.open(message.fileUrl, '_blank')} />
                      ) : (
                        <a href={message.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors shrink-0">
                          <FileText className="w-5 h-5 shrink-0" />
                          <span className="text-sm underline truncate">{message.fileName || 'Download File'}</span>
                        </a>
                      )
                    ) : null}
                    {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}
                    <div className={`text-[10px] mt-1 ${String(message.senderId) === String(currentUserId) ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {messages.length === 0 && !loadingMessages && (
                <div className="text-sm text-gray-600">No messages yet.</div>
              )}
            </div>

            <div className="sticky bottom-0 z-30 bg-white/80 backdrop-blur-lg px-4 pt-2 pb-2 border-t border-gray-100">
              <div className="max-w-4xl mx-auto flex items-end gap-3">
                {/* Integrated Message Pill */}
                <div className="flex-1 flex items-end bg-gray-100/70 hover:bg-gray-100 rounded-[28px] border border-transparent focus-within:border-blue-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5 transition-all duration-300 p-1.5 px-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-blue-600 rounded-full transition-colors mb-0.5"
                    title="Attach"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <div className="flex-1 py-1.5 px-2">
                    <textarea
                      name="message-pill-input"
                      ref={textareaRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Write a message..."
                      rows={1}
                      className="w-full bg-transparent border-none outline-none text-[16px] leading-relaxed text-gray-800 placeholder:text-gray-400 font-medium resize-none max-h-[200px] overflow-y-auto hide-scrollbar"
                    />
                  </div>

                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="relative flex items-center h-full" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className="p-2 text-gray-400 hover:text-amber-500 rounded-full transition-colors"
                        title="Emoji"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      
                      {showEmojiPicker && (
                        <div 
                          className="absolute right-0 flex flex-col overflow-hidden"
                          style={{ 
                            bottom: 'calc(100% + 20px)',
                            width: '320px', 
                            height: '380px',
                            backgroundColor: 'white', 
                            borderRadius: '16px',
                            border: '1px solid #e1e4e8',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                            zIndex: 99999 
                          }}
                        >
                          {/* Search Bar */}
                          <div style={{ padding: '12px', borderBottom: '1px solid #f0f2f5', backgroundColor: 'white' }}>
                            <div style={{ position: 'relative' }}>
                              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#65676b' }} />
                              <input
                                type="text"
                                value={emojiSearch}
                                onChange={(e) => setEmojiSearch(e.target.value)}
                                placeholder="Search emoji"
                                style={{ 
                                  width: '100%', 
                                  backgroundColor: '#f0f2f5', 
                                  color: '#1c1e21', 
                                  fontSize: '14px', 
                                  borderRadius: '20px', 
                                  padding: '8px 12px 8px 36px', 
                                  border: 'none', 
                                  outline: 'none' 
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                            {EMOJI_CATEGORIES.map((category) => {
                              const q = emojiSearch.trim().toLowerCase();
                              // No keyword metadata per emoji, so match the category name
                              // (and a literal pasted emoji). Previously this hid every
                              // emoji as soon as the user typed anything.
                              const filteredEmojis = !q
                                ? category.emojis
                                : category.name.toLowerCase().includes(q)
                                  ? category.emojis
                                  : category.emojis.filter((e) => e.includes(emojiSearch));

                              if (filteredEmojis.length === 0) return null;
                              
                              return (
                                <div key={category.name} style={{ marginBottom: '24px' }}>
                                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: '#65676b', marginBottom: '12px', padding: '0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{category.name}</h5>
                                  <div 
                                    style={{ 
                                      display: 'grid', 
                                      gridTemplateColumns: 'repeat(8, 1fr)', 
                                      gap: '4px' 
                                    }}
                                  >
                                    {filteredEmojis.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          setMessageInput((prev) => `${prev}${emoji}`);
                                          textareaRef.current?.focus();
                                        }}
                                        style={{ 
                                          width: '100%', 
                                          aspectRatio: '1/1',
                                          borderRadius: '8px', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center', 
                                          fontSize: '18px', 
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f2f3f5')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={sendMessage}
                      disabled={!messageInput.trim()}
                      className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                        messageInput.trim() 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95' 
                          : 'text-gray-300'
                      }`}
                    >
                      <Send className={`w-4.5 h-4.5 ${messageInput.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              <input name="input-fa0184" type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>




          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 px-[16px] py-[12px]">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-sm text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Sidebar */}
      <AnimatePresence>
        {isInfoSidebarOpen && activeConversation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white absolute inset-0 z-[100] flex flex-col"
          >
            {/* Header / Back Button */}
            <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <button
                onClick={() => setIsInfoSidebarOpen(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-all group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Chat</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                  Profile View
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto w-full px-6 py-12">
                {/* Profile Header Card */}
                <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden mb-8">
                  {/* Professional Banner */}
                  <div className="h-32 bg-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 opacity-90" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                  </div>
                  
                  <div className="px-6 sm:px-8 pb-8 relative">
                    {/* Avatar - Left Aligned, overlapping banner */}
                    <div className="-mt-16 mb-4 flex justify-between items-end">
                      <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-sm shrink-0 relative overflow-hidden">
                        {resolveAvatarUrl(activeConversation.avatar) ? (
                          <img
                            src={resolveAvatarUrl(activeConversation.avatar) as string}
                            alt={activeConversation.participantName}
                            className="w-full h-full object-cover aspect-square"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-600 text-4xl font-bold">
                            {activeConversation.avatar || activeConversation.participantName.charAt(0)}
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons - Right aligned */}
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <button
                          type="button"
                          className="p-2 sm:px-4 sm:py-2 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-600 rounded-full transition-all flex items-center justify-center gap-2 font-semibold text-sm"
                          title="Favorite"
                        >
                          <Star className="w-5 h-5" />
                          <span className="hidden sm:inline">Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleViewProfile}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-full shadow-sm transition-all flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          <span>View Profile</span>
                        </button>
                      </div>
                    </div>

                    {/* Profile Info - Left Aligned */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                          {activeConversation.participantName}
                        </h2>
                        {activeConversation.verified && (
                          <CheckCheck className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      
                      {/* Headline */}
                      <div className="text-base text-gray-800 font-medium leading-relaxed">
                        {activeConversation.participantRole || 'Member'}
                        {activeConversation.participantCompany ? ` at ${activeConversation.participantCompany}` : ''}
                      </div>

                      {/* Sub-info / Pipeline Stage */}
                      <div className="text-sm text-gray-500 pt-2 flex items-center gap-3">
                        {activeConversation.pipelineStage && (
                          <span className={`inline-flex items-center gap-1.5 font-medium ${
                            activeConversation.pipelineStage === 'negotiating' ? 'text-orange-700' :
                            activeConversation.pipelineStage === 'review' ? 'text-purple-700' :
                            'text-emerald-700'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              activeConversation.pipelineStage === 'negotiating' ? 'bg-orange-500' :
                              activeConversation.pipelineStage === 'review' ? 'bg-purple-500' :
                              'bg-emerald-500'
                            }`} />
                            {pipelineStageLabel} Stage
                          </span>
                        )}
                        {activeConversation.pipelineStage && <span className="text-gray-300">•</span>}
                        <span onClick={handleViewProfile} className="hover:text-blue-600 hover:underline cursor-pointer transition-colors font-medium">Contact Information</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left Column: Actions and Settings (Spans 2 columns on desktop) */}
                  <div className="md:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl border border-gray-300 p-6 sm:p-8 shadow-sm">
                      <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2.5">
                        <Settings className="w-5 h-5 text-gray-500" />
                        Conversation Options
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Schedule Meeting */}
                        <button 
                          onClick={() => setIsScheduleModalOpen(true)}
                          className="w-full flex items-center justify-between p-5 bg-blue-50/50 border border-blue-100 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 rounded-2xl transition-all group duration-300 sm:col-span-2"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center transition-colors shrink-0">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                              <span className="block font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Schedule Meeting</span>
                              <span className="block text-xs text-gray-500 mt-0.5">Book a session or calendar event with {activeConversation.participantName}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform shrink-0" />
                        </button>

                        {/* Mute Notifications */}
                        <button 
                          onClick={toggleMuteNotifications}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0">
                              {isMuted ? <BellOff className="w-5 h-5 text-orange-600" /> : <Bell className="w-5 h-5 text-gray-600" />}
                            </div>
                            <span className="font-bold text-gray-800 text-sm">Mute Notifications</span>
                          </div>
                          <div className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${isMuted ? 'bg-orange-500' : 'bg-gray-200 group-hover:bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isMuted ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                        </button>

                        {/* Pin Conversation */}
                        <button 
                          onClick={handleTogglePin}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0">
                              <Pin className={`w-5 h-5 ${activeConversation.pinned ? 'text-blue-600 fill-blue-600' : 'text-gray-600'}`} />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">{activeConversation.pinned ? 'Unpin Conversation' : 'Pin Conversation'}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1 shrink-0" />
                        </button>

                        {/* Archive Conversation */}
                        <button 
                          onClick={handleArchiveChat}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl transition-all group sm:col-span-2"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0">
                              <Archive className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">Archive Conversation</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1 shrink-0" />
                        </button>

                        {/* Report User — Apple Guideline 1.2 (UGC moderation) */}
                        <button
                          onClick={() => setShowReportConversation(true)}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0">
                              <ReportFlagIcon className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">Report</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1 shrink-0" />
                        </button>

                        {/* Block User — Apple Guideline 1.2 (UGC moderation) */}
                        <button
                          onClick={handleBlockUser}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-red-300 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-red-50 flex items-center justify-center transition-colors shrink-0">
                              <BlockUserIcon className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="font-bold text-red-600 text-sm">Block User</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-600 transition-all group-hover:translate-x-1 shrink-0" />
                        </button>

                        {/* Delete Conversation */}
                        <div className="pt-4 mt-2 border-t border-gray-100 sm:col-span-2">
                          <button
                            onClick={handleDeleteChat}
                            className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-600 rounded-2xl transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-red-500 flex items-center justify-center transition-colors shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600 group-hover:text-white" />
                              </div>
                              <span className="font-bold text-red-600 group-hover:text-white transition-colors text-sm">Delete Conversation</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-white transition-all group-hover:translate-x-1 shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Branding / Badge */}
                  <div className="space-y-8">
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white relative overflow-hidden shadow-lg h-full flex flex-col justify-center min-h-[220px]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full" />
                      <div className="relative z-10">
                        <h5 className="font-black text-lg mb-1.5 text-white">Member Since</h5>
                        <p className="text-gray-400 text-sm mb-6 font-medium">January 2026 • Early Access</p>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/15 transition-colors border border-white/5 rounded-full">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-blue-50">Verified Partner</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add link (Drive, Docs, etc.) — sends as a normal text message */}
            {showLinkDialog && activeConversation && (
              <div
                className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-4 bg-black/50"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrlDraft('');
                }}
                role="presentation"
              >
                <div
                  className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 p-5 sm:p-6"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-labelledby="link-dialog-title"
                >
                  <h3 id="link-dialog-title" className="text-lg font-bold text-gray-900">
                    Send a link
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4">
                    Paste a URL (Google Drive, Docs, Meet, Zoom, etc.). It is sent as a message the same way as typed text.
                  </p>
                  <input
                    name="messaging-link-url"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://"
                    value={linkUrlDraft}
                    onChange={(e) => setLinkUrlDraft(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkDialog(false);
                        setLinkUrlDraft('');
                      }}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendLinkFromDialog()}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                    >
                      Send link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modals & Calling State Overlay */}
            <AnimatePresence>

            </AnimatePresence>

            {activeConversation && (
              <ScheduleMeetingModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                client={{
                  id: Number.parseInt(activeConversation.participantId.slice(-6), 16) || 1,
                  name: activeConversation.participantName,
                  startup: activeConversation.participantCompany || 'Startup',
                  industry: 'Technology',
                  stage: activeConversation.startupStage || 'Seed',
                  matchScore: 90,
                  status: 'active',
                  sessionsCompleted: 0,
                  avatar: resolveAvatarUrl(activeConversation.avatar) || ''
                }}
              />
            )}

            {selectedProfile && (
              <ProfileViewModal
                profile={selectedProfile}
                onClose={() => setSelectedProfile(null)}
                onSendMessage={() => {
                  setSelectedProfile(null);
                  setIsInfoSidebarOpen(false);
                  setShowMobileChat(true);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ReportDialog
        open={showReportConversation && !!activeConversation}
        onClose={() => setShowReportConversation(false)}
        targetType="user"
        targetId={activeConversation?.participantId || ''}
        targetLabel={activeConversation?.participantName}
      />
    </div>
  );
}

// Conversation Item Component
function ConversationItem({
  conversation,
  isActive,
  onClick
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const avatarUrl = resolveAvatarUrl(conversation.avatar);
  const avatarFallback = avatarUrl ? getAvatarInitial(conversation.participantName) : conversation.avatar;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full p-3 rounded-lg mb-1 transition-all text-left ${isActive
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-50'
        }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={conversation.participantName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              avatarFallback
            )}
          </div>
          {conversation.online && (
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-900 truncate">
                {conversation.participantName}
              </span>
              {conversation.verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              )}
              {conversation.pinned && (
                <Pin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{conversation.timestamp}</span>
          </div>

          {!isSameLabel(conversation.participantName, conversation.participantRole) && (
            <p className="text-xs text-gray-600 mb-1 truncate">{conversation.participantRole}</p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 truncate flex-1">{conversation.lastMessage}</p>
            {conversation.unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}