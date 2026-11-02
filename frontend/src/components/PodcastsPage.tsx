import { Capacitor } from '@capacitor/core';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic, Play, Pause, SkipForward, SkipBack, Clock, Calendar,
  Share2, Heart, ArrowLeft, Search, Volume2, Headphones,
  Signal, MoreVertical, Upload, Radio, Video, Eye,
  X, ExternalLink, Youtube, Plus, Users, Loader2,
  Globe, Zap, StopCircle, CheckCircle, ChevronLeft, ChevronRight,
  List, BarChart3, Trash2, Edit3, Filter, Bell, RefreshCw,
  TrendingUp, Award, Activity, Sparkles, Menu, Flag
} from 'lucide-react';
import { io as ioClient, Socket } from 'socket.io-client';
import api from '../services/api';
import { toast } from 'sonner';
import { ReportDialog } from './ReportDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PodcastsPageProps {
  userRole?: 'founder' | 'expert' | 'investor';
  onBack?: () => void;
  onMenuClick?: () => void;
  hideHeader?: boolean;
  currentUser?: { id: string; name: string; avatar?: string };
}

interface Episode {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  uploaderName: string;
  uploadedBy?: string;
  publishDate: string;
  plays: number;
  sessionType: 'live' | 'recorded';
  contentType: 'original' | 'other';
  platform?: string;
  isLive?: boolean;
  tags?: string[];
  likes?: string[];
}

interface Viewer {
  userId?: string;
  name?: string;
  avatar?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatViews(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function getEmbedUrl(url: string) {
  if (!url) return '';
  if (url.includes('meet.google.com') || url.includes('zoom.us')) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  const ytLiveMatch = url.match(/youtube\.com\/live\/([A-Za-z0-9_-]+)/);
  if (ytLiveMatch) return `https://www.youtube.com/embed/${ytLiveMatch[1]}?autoplay=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return url;
}

function getPlatformLabel(ep: Episode) {
  if (ep.platform) return ep.platform;
  if (ep.videoUrl?.includes('youtube') || ep.videoUrl?.includes('youtu.be')) return 'YouTube';
  if (ep.videoUrl?.includes('vimeo')) return 'Vimeo';
  if (ep.videoUrl?.includes('spotify')) return 'Spotify';
  return 'External';
}

const GRADIENT_COLORS = [
  'from-purple-700 to-indigo-900',
  'from-rose-700 to-pink-900',
  'from-emerald-700 to-teal-900',
  'from-blue-700 to-cyan-900',
  'from-amber-700 to-orange-900',
];
function cardGradient(id: string) {
  const idx = id.charCodeAt(0) % GRADIENT_COLORS.length;
  return GRADIENT_COLORS[idx];
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VideoModal({ ep, onClose }: { ep: Episode; onClose: () => void }) {
  const embedUrl = getEmbedUrl(ep.videoUrl || ep.streamUrl || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
             <h3 className="font-bold text-lg text-gray-900 truncate pr-4">{ep.title}</h3>
             <p className="text-xs text-blue-600 font-medium">{ep.uploaderName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        {embedUrl ? (
          <div className="aspect-video bg-black">
            <iframe src={embedUrl} className="w-full h-full" allow="autoplay; fullscreen; camera; microphone; display-capture; clipboard-write" allowFullScreen title={ep.title} />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-gray-100 text-gray-400">
            <div className="text-center">
              {ep.streamUrl && (ep.streamUrl.includes('meet.google.com') || ep.streamUrl.includes('zoom.us')) ? (
                 <div className="space-y-4">
                    <Video className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-600 font-medium">External Meeting Link</p>
                    <a href={ep.streamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all">
                       <ExternalLink className="w-4 h-4" /> Open Platform
                    </a>
                 </div>
              ) : (
                <div className="space-y-2">
                   <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                   <p>No embed URL provided</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="px-8 py-6 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">{ep.description}</p>
            </div>
            <div className="flex items-center gap-6 text-xs text-gray-400 border-l border-gray-100 pl-6 flex-shrink-0">
               <div className="flex flex-col items-end">
                 <span className="font-bold text-gray-900">{formatViews(ep.plays)}</span>
                 <span>VIEWS</span>
               </div>
               <div className="flex flex-col items-end">
                 <span className="font-bold text-gray-900">{timeAgo(ep.publishDate)}</span>
                 <span>PUBLISHED</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PODCAST_CATEGORIES = ['All', 'NextIgnition', 'Startup', 'Fundraising', 'Tech', 'Marketing', 'General'];

function UploadModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: Partial<Episode>) => void; isLoading: boolean; }) {
  const [form, setForm] = useState({ title: '', description: '', videoUrl: '', thumbnailUrl: '', contentType: 'other', sessionType: 'recorded', platform: '', category: 'General' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Upload className="w-5 h-5" /></div>
             <div>
                <h3 className="font-bold text-lg text-gray-900">Share Podcast Episode</h3>
                <p className="text-xs text-gray-500">Share your expertise with the community</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">Title <span className="text-red-500">*</span></label>
            <input name="input-82846b" value={form.title} onChange={e => set('title', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500/50 transition-all font-medium" placeholder="Give your podcast a catchy title" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">Description</label>
            <textarea name="textarea-df2d3a" value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500/50 transition-all font-medium resize-none" placeholder="Explain what viewers can learn..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">Video / Podcast URL <span className="text-red-500">*</span></label>
              <input name="input-3d7567" value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium" placeholder="YouTube / Spotify / Vimeo..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">Thumbnail (Optional)</label>
              <input name="input-8709ea" value={form.thumbnailUrl} onChange={e => set('thumbnailUrl', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium" placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">Topic Category</label>
              <select name="select-696bee" value={form.category} onChange={e => set('category', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium cursor-pointer">
                {PODCAST_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">Source Platform</label>
              <input name="input-88170a" value={form.platform} onChange={e => set('platform', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium" placeholder="YouTube, Spotify, etc." />
            </div>
          </div>
        </div>
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-gray-600 font-bold text-sm hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => onSubmit({ ...form, contentType: 'other', tags: [form.category] } as Partial<Episode>)} disabled={!form.title || !form.videoUrl || isLoading} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function GoLiveModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: { title: string; description: string; streamUrl: string }) => void; isLoading: boolean; }) {
  const [streamType, setStreamType] = useState<'auto' | 'custom'>('custom');
  const [form, setForm] = useState({ title: '', description: '', streamUrl: '' });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const generateJitsiUrl = () => `https://meet.jit.si/NextIgnitionLive_${Math.random().toString(36).substring(7)}`;

  const handleSubmit = () => {
    const data = { ...form, streamUrl: streamType === 'auto' ? generateJitsiUrl() : form.streamUrl };
    // Notify followers toast would happen here or in the parent handler
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-red-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-red-50 bg-red-50/30">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><Radio className="w-5 h-5" /></div>
             <div>
                <h3 className="font-bold text-lg text-gray-900">Start Live Broadcast</h3>
                <p className="text-xs text-gray-500">Go live now and share your expertise</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-100 transition-colors text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
            <button onClick={() => { setStreamType('custom'); set('streamUrl', ''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${streamType === 'custom' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>Google Meet / Zoom</button>
            <button onClick={() => { setStreamType('auto'); set('streamUrl', ''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${streamType === 'auto' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>In-App Auto Stream</button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">Session Title <span className="text-red-500">*</span></label>
            <input name="input-aedcfc" value={form.title} onChange={e => set('title', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all font-medium" placeholder="Ex: Decoding Startup Valuation" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">Description</label>
            <textarea name="textarea-2a62b1" value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all font-medium resize-none text-gray-900" placeholder="Brief overview of the session topic..." />
          </div>
          {streamType === 'custom' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700 block">Meeting URL <span className="text-red-500">*</span></label>
                <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-[10px] font-bold"><Plus className="w-3 h-3" /> Create G-Meet</a>
              </div>
              <input name="input-876715" value={form.streamUrl} onChange={e => set('streamUrl', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all font-medium" placeholder="Paste link here..." />
            </div>
          ) : (
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex gap-3 items-center">
               <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0"><Zap className="w-5 h-5" /></div>
               <div>
                  <p className="text-sm font-bold text-green-800">NextIgnition Native Stream</p>
                  <p className="text-[10px] text-green-700 font-medium">No external account needed. We'll generate a public room.</p>
               </div>
            </div>
          )}
        </div>
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-gray-600 font-bold text-sm hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.title || (streamType === 'custom' && !form.streamUrl) || isLoading} className="px-8 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> START BROADCAST</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

import { useFeatureAccess } from '../hooks/useFeatureAccess';

export function PodcastsPage({ userRole = 'founder', onBack, onMenuClick, hideHeader, currentUser }: PodcastsPageProps) {
  const { userPlan } = useFeatureAccess();
  // Allow founder and investor to have access to publishing and analytics (NOT expert)
  const isExpert = ['founder', 'investor'].includes(userRole || '');
  const canPublish = ['founder', 'expert', 'investor'].includes(userRole || '');

  // ── Layout state
  const [activeTab, setActiveTab] = useState<'discover' | 'my-podcasts' | 'live' | 'calendar' | 'analytics'>('discover');
  const [communityCategory, setCommunityCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data state
  const [liveEpisodes, setLiveEpisodes] = useState<Episode[]>([]);
  const [recordedOriginals, setRecordedOriginals] = useState<Episode[]>([]);
  const [otherContent, setOtherContent] = useState<Episode[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Episode[]>([]);
  const [recommendedEpisodes, setRecommendedEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal state
  const [activeVideo, setActiveVideo] = useState<Episode | null>(null);
  const [reportPodcast, setReportPodcast] = useState<{ id: string; title: string } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showGoLive, setShowGoLive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Live viewer tracking
  const [viewersBySession, setViewersBySession] = useState<Record<string, Viewer[]>>({});
  const socketRef = useRef<Socket | null>(null);
  const joinedSessionsRef = useRef<Set<string>>(new Set());

  // ── Calendar state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // ─── Fetch data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [liveRes, recOrigRes, otherRes, recentRes] = await Promise.all([
        api.get('/podcasts/live'),
        api.get('/podcasts?contentType=original&sessionType=recorded'),
        api.get('/podcasts?contentType=other'),
        api.get('/podcasts/recently-played').catch(() => ({ data: [] })),
      ]);
      setLiveEpisodes(liveRes.data);
      setRecordedOriginals(recOrigRes.data);
      setOtherContent(otherRes.data);
      setRecentlyPlayed(recentRes.data);

      // Recommended is personalized (requires auth). Keep failures non-fatal.
      try {
        const rec = await api.get('/podcasts/recommended');
        setRecommendedEpisodes(Array.isArray(rec.data) ? rec.data : []);
      } catch {
        setRecommendedEpisodes([]);
      }
    } catch (e) {
      console.error("Failed to load podcasts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Socket.io
  useEffect(() => {
    const socket = ioClient(API_BASE, { transports: ['websocket', 'polling'], reconnection: true });
    socketRef.current = socket;
    
    socket.on('podcast_viewer_update', (payload: { sessionId: string; viewers: Viewer[] }) => {
      setViewersBySession(prev => ({ ...prev, [payload.sessionId]: payload.viewers }));
    });
    
    // Listen for live session auto-save events
    socket.on('live_session_ended_auto_saved', (payload: any) => {
      toast.success(`${payload.uploaderName}'s live session has been saved to podcast library`, {
        duration: 5000,
        description: 'The recording is now available for playback'
      });
      // Refresh all data to show the new recorded episode
      fetchAll();
    });
    
    // Listen for new episodes available
    socket.on('feed_episode_available', (payload: any) => {
      if (payload.type === 'auto_saved_recording') {
        // The new episode has been added, refresh will handle it
        fetchAll();
      }
    });
    
    return () => { socket.disconnect(); };
  }, [fetchAll]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !currentUser) return;
    liveEpisodes.forEach(ep => {
      if (!joinedSessionsRef.current.has(ep.id)) {
        joinedSessionsRef.current.add(ep.id);
        socket.emit('join_podcast_live', { sessionId: ep.id, userId: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
      }
    });
  }, [liveEpisodes, currentUser]);

  // ─── Expert actions
  const handleUpload = async (data: Partial<Episode>) => {
    setSubmitting(true);
    try { await api.post('/podcasts', data); setShowUpload(false); fetchAll(); }
    catch (e) { console.error("Failed to upload:", e); }
    finally { setSubmitting(false); }
  };

  const handleGoLive = async (data: { title: string; description: string; streamUrl: string }) => {
    setSubmitting(true);
    // Notify followers simulation
    const followersCount = Math.floor(Math.random() * 500) + 50;
    toast.success(`Broadcasting live! Your ${followersCount} followers have been notified.`, {
      icon: <Bell className="w-4 h-4 text-emerald-500" />,
      duration: 5000
    });
    
    try { await api.post('/podcasts/live', data); setShowGoLive(false); fetchAll(); }
    catch (e) { console.error("Failed to start live:", e); }
    finally { setSubmitting(false); }
  };

  const handleEndLive = async (id: string) => {
    try { await api.patch(`/podcasts/live/${id}/end`); fetchAll(); }
    catch (e) { console.error("Failed to end live:", e); }
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!confirm('Delete this episode?')) return;
    try { await api.delete(`/podcasts/${id}`); fetchAll(); }
    catch (e) { console.error("Failed to delete:", e); }
  };

  const handleToggleLike = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/podcasts/${id}/like`);
      const updatedEp = res.data;
      const updateList = (list: Episode[]) => list.map(ep => ep.id === id ? updatedEp : ep);
      setLiveEpisodes(updateList);
      setRecordedOriginals(updateList);
      setOtherContent(updateList);
      setRecentlyPlayed(updateList);
    } catch (err) {
      console.error("Failed to like:", err);
    }
  };

  const handleShare = async (e: React.MouseEvent, ep: Episode) => {
    e.stopPropagation();
    const shareData = { title: ep.title, text: ep.description, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) { console.error("Error sharing:", err); }
  };

  const handleGoBack = () => {
    if (onBack) { onBack(); return; }
    try { localStorage.setItem(`dashboard:${userRole}:activeTab`, 'Home Feed'); } catch { }
    window.location.hash = `#${userRole}-dashboard`;
  };

  // ─── Derived data
  const allEpisodes = useMemo(() => [...recordedOriginals, ...otherContent], [recordedOriginals, otherContent]);

  const myEpisodes = useMemo(() =>
    allEpisodes.filter(ep => ep.uploadedBy === currentUser?.id),
    [allEpisodes, currentUser]
  );

  const filterEps = (eps: Episode[]) =>
    eps.filter(ep =>
      !searchQuery ||
      ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.uploaderName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ─── Calendar data
  type CalendarDay = { day: number | null; episodes: Episode[] };
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days: CalendarDay[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, episodes: [] });
    const allWithLive = [...allEpisodes, ...liveEpisodes];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toISOString().split('T')[0];
      const dayEps = allWithLive.filter(ep => {
        try { return new Date(ep.publishDate).toISOString().split('T')[0] === dateStr; }
        catch { return false; }
      });
      days.push({ day: d, episodes: dayEps });
    }
    return days;
  }, [currentCalendarDate, allEpisodes, liveEpisodes]);

  const tabs = isExpert
    ? [
        { key: 'discover', label: 'Discover', icon: <Globe className="w-3.5 h-3.5" /> },
        { key: 'my-podcasts', label: 'My Podcasts', icon: <Mic className="w-3.5 h-3.5" /> },
        { key: 'live', label: 'Live Sessions', icon: <Radio className="w-3.5 h-3.5" /> },
        { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
        { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
      ]
    : userRole === 'expert'
    ? [
        { key: 'discover', label: 'Discover', icon: <Globe className="w-3.5 h-3.5" /> },
        { key: 'my-podcasts', label: 'My Podcasts', icon: <Mic className="w-3.5 h-3.5" /> },
        { key: 'live', label: 'Live Sessions', icon: <Radio className="w-3.5 h-3.5" /> },
        { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
      ]
    : [
        { key: 'discover', label: 'Discover', icon: <Globe className="w-3.5 h-3.5" /> },
        { key: 'live', label: 'Live Now', icon: <Radio className="w-3.5 h-3.5" /> },
      ];

  const myAnalyticsEpisodes = useMemo(() => {
    if (!isExpert) return [];
    return allEpisodes
      .filter((ep) => ep.uploadedBy === currentUser?.id)
      .slice()
      .sort((a, b) => (b.plays || 0) - (a.plays || 0));
  }, [allEpisodes, currentUser?.id, isExpert]);

  // ─── Render: Episode Card
  const renderEpisodeCard = (ep: Episode, isMineView = false) => {
    const isMine = ep.uploadedBy === currentUser?.id;
    const platform = ep.contentType === 'other' ? getPlatformLabel(ep) : null;
    return (
      <div key={ep.id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col h-full shadow-sm" onClick={() => setActiveVideo(ep)}>
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {ep.thumbnailUrl ? (
            <img src={ep.thumbnailUrl} alt={ep.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${cardGradient(ep.id)} flex items-center justify-center`}>
              <Mic className="w-12 h-12 text-white/30" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            {ep.isLive && <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 animation-pulse"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE</span>}
            {platform && <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur text-xs font-bold text-blue-700 shadow-sm">{platform.toUpperCase()}</span>}
            {isMine && <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">YOURS</span>}
          </div>
          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/70 backdrop-blur text-white text-xs font-bold shadow-sm flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 opacity-80" /> {formatViews(ep.plays)}
          </div>
        </div>
        <div className="p-3 md:p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2 md:mb-3 text-xs font-semibold text-blue-600">
            <div className="flex items-center gap-1 flex-shrink-0"><Calendar className="w-3 h-3" /> {formatDate(ep.publishDate)}</div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isMine && (
                <button onClick={(e) => { e.stopPropagation(); setReportPodcast({ id: ep.id, title: ep.title || ep.uploaderName }); }} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Report"><Flag className="w-3.5 h-3.5" /></button>
              )}
              <button onClick={(e) => handleShare(e, ep)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"><Share2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <h4 className="font-bold text-sm md:text-base text-gray-900 leading-tight mb-1 md:mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{ep.title}</h4>
          <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2 flex-1">{ep.description}</p>
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 md:w-7 h-6 md:h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">{ep.uploaderName.charAt(0)}</div>
              <span className="text-xs md:text-sm font-medium text-gray-900 truncate">{ep.uploaderName}</span>
            </div>
            {isMineView && isMine ? (
              <button onClick={(e) => { e.stopPropagation(); handleDeleteEpisode(ep.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
            ) : (
              <button onClick={(e) => handleToggleLike(e, ep.id)} className={`p-2 rounded-full transition-colors flex-shrink-0 ${ep.likes?.includes(currentUser?.id || '') ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:bg-gray-100'}`}><Heart className={`w-4 h-4 ${ep.likes?.includes(currentUser?.id || '') ? 'fill-current' : ''}`} /></button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Render: Live Card
  const renderLiveCard = (ep: Episode) => {
    const viewers = viewersBySession[ep.id] || [];
    const embedUrl = getEmbedUrl(ep.streamUrl || '');
    const isMine = ep.uploadedBy === currentUser?.id;
    return (
      <div key={ep.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group flex flex-col md:flex-row shadow-sm">
        <div className="w-full md:w-[45%] flex-shrink-0 relative bg-gray-100 aspect-video">
           {embedUrl ? (
             <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={ep.title} allow="camera; microphone; display-capture; autoplay; clipboard-write" />
           ) : (
             <div className="flex flex-col items-center justify-center h-full"> <Radio className="w-12 h-12 text-red-500/40 mb-2 animate-pulse" /> <p className="text-xs font-bold text-gray-400">Stream Pending...</p> </div>
           )}
           <div className="absolute top-2 md:top-3 left-2 md:left-3"><span className="px-2 md:px-2.5 py-1 rounded-md bg-white/90 backdrop-blur text-xs font-bold text-red-600 shadow-sm flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /> LIVE</span></div>
        </div>
        <div className="p-3 md:p-5 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2 line-clamp-2">{ep.title}</h3>
            <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{ep.description}</p>
          </div>
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 md:w-8 h-7 md:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">{ep.uploaderName.charAt(0)}</div>
              <span className="text-xs md:text-sm font-medium text-gray-900 truncate">{ep.uploaderName}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 justify-end"><Eye className="w-3.5 h-3.5" /> {viewers.length}</div>
              {isMine && <button onClick={() => handleEndLive(ep.id)} className="mt-1 text-[9px] md:text-[10px] font-black text-red-500 hover:underline flex items-center justify-end gap-1"><StopCircle className="w-3 h-3" /> <span className="hidden md:inline">END</span></button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-full bg-gray-50 font-sans w-full overflow-x-hidden">
      <main className="flex-1 flex flex-col relative w-full overflow-x-hidden">
        <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex-shrink-0 z-10 sticky top-0 w-full overflow-x-hidden">
          <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 ${hideHeader ? 'hidden' : ''}`}>
              <div className="flex items-center gap-1">
                {onMenuClick && (
                  <button 
                    onClick={onMenuClick}
                    className="p-1.5 -ml-1 hover:bg-gray-100 rounded-lg transition-colors lg:hidden flex-shrink-0"
                    title="Menu"
                  >
                    <Menu className="w-5 h-5 text-gray-700" />
                  </button>
                )}
                {onBack && (
                  <button 
                    onClick={handleGoBack} 
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
                    title="Go back"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-2xl font-black text-gray-900 tracking-tight truncate">Podcasts & Live Sessions</h1>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3 w-full md:w-auto min-w-0">
              {canPublish && (
                <>
                  <button onClick={() => {
                    if (userPlan !== 'elite') {
                      toast.error(Capacitor.getPlatform() === 'ios' ? 'Premium Feature' : 'Elite Plan Required 🔒', {
                        description: Capacitor.getPlatform() === 'ios'
                          ? "Live streaming is available with NextIgnition Premium."
                          : 'Live streaming is exclusive to Elite members. Upgrade to unlock Go Live & broadcasting.',
                        action: { label: '⚡ Upgrade Now', onClick: () => window.location.hash = '#pricing' },
                        duration: 5000,
                      });
                      return;
                    }
                    setShowGoLive(true);
                  }} className="px-2 md:px-5 py-2 md:py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg md:rounded-xl text-[10px] md:text-sm shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5 min-w-0 overflow-hidden"> <Radio className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> <span className="hidden sm:inline truncate">Go Live</span><span className="sm:hidden truncate">Live</span> </button>
                  <button onClick={() => {
                    if (userPlan !== 'elite') {
                      toast.error(Capacitor.getPlatform() === 'ios' ? 'Premium Feature' : 'Elite Plan Required 🔒', {
                        description: Capacitor.getPlatform() === 'ios'
                          ? "Uploading podcasts is available with NextIgnition Premium."
                          : 'Uploading podcasts is exclusive to Elite members. Upgrade to start publishing your content.',
                        action: { label: '⚡ Upgrade Now', onClick: () => window.location.hash = '#pricing' },
                        duration: 5000,
                      });
                      return;
                    }
                    setShowUpload(true);
                  }} className="px-2 md:px-5 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg md:rounded-xl text-[10px] md:text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 min-w-0 overflow-hidden"> <Upload className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> <span className="hidden sm:inline truncate">Upload</span><span className="sm:hidden truncate">Add</span> </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 md:mt-6 flex gap-1 bg-gray-100 p-1 rounded-lg md:rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 pb-32 lg:pb-8 w-full">
          <div className="max-w-6xl mx-auto pb-10">
            {loading ? <LoadingGrid /> : (
              <>
                {activeTab === 'discover' && (
                  <div className="space-y-8 md:space-y-12">
                    {/* NextIgnition Originals Section — always visible as the official branded section */}
                    {(() => {
                      const originals = allEpisodes.filter(ep => ep.uploaderName?.toLowerCase().includes('nextignition') || ep.tags?.some(t => t.toLowerCase().includes('nextignition')));
                      return (
                        <section className="bg-gradient-to-br from-blue-600/5 to-indigo-600/5 p-5 md:p-8 rounded-2xl md:rounded-[32px] border border-blue-100/50">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl md:rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                              <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">NextIgnition Originals</h2>
                              <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Exclusive Platform Content</p>
                            </div>
                          </div>
                          {originals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {originals.slice(0, 3).map((ep) => renderEpisodeCard(ep))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <Sparkles className="w-10 h-10 text-blue-200 mb-3" />
                              <p className="text-sm font-bold text-gray-700">Official NextIgnition podcasts are coming soon</p>
                              <p className="text-xs text-gray-500 mt-1">Curated episodes from the NextIgnition team will appear here.</p>
                            </div>
                          )}
                        </section>
                      );
                    })()}
                    {/* Recommended Section */}
                    {recommendedEpisodes.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                          <Zap className="w-5 h-5 text-amber-600" />
                          <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase">Recommended for you</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                          {recommendedEpisodes.map((ep) => renderEpisodeCard(ep))}
                        </div>
                      </section>
                    )}

                    {/* Live Now Section */}
                    <section>
                      <div className="flex items-center gap-2 mb-4 md:mb-6"> <Radio className="w-5 h-5 text-red-600 animate-pulse" /> <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase">Live Now</h2> </div>
                      {liveEpisodes.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"> {liveEpisodes.map(ep => renderLiveCard(ep))} </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-12 text-center">
                          <Radio className="w-10 h-10 md:w-12 md:h-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-xs md:text-base text-gray-500">No active live sessions. Check the calendar!</p>
                        </div>
                      )}
                    </section>

                    {/* Previous Episodes */}
                    <section>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                        <div className="flex items-center gap-2"> <Youtube className="w-5 h-5 text-blue-600" /> <h2 className="text-lg md:text-xl font-bold text-gray-900">Previous Episodes</h2> </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                           {PODCAST_CATEGORIES.map(cat => (
                             <button key={cat} onClick={() => setCommunityCategory(cat)} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0 ${communityCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>{cat}</button>
                           ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                         {recordedOriginals.concat(otherContent)
                           .filter(ep => {
                             if (communityCategory === 'All') return true;
                             if (communityCategory === 'NextIgnition') return !!(ep.tags?.some(t => t.toLowerCase() === 'nextignition' || t.toLowerCase().includes('nextignition')) || ep.title.toLowerCase().includes('nextignition') || ep.uploaderName?.toLowerCase().includes('nextignition'));
                             return ep.tags?.includes(communityCategory);
                           })
                           .map(ep => renderEpisodeCard(ep))}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'my-podcasts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {myEpisodes.length > 0 ? myEpisodes.map(ep => renderEpisodeCard(ep, true)) : <EmptyState icon={<Mic className="w-12 h-12 text-gray-300" />} title="Nothing shared yet" desc="Upload your first podcast to see it here." />}
                  </div>
                )}

                {activeTab === 'live' && (
                  <div className="space-y-6">
                    {liveEpisodes.length > 0 ? liveEpisodes.map(ep => renderLiveCard(ep)) : <EmptyState icon={<Radio className="w-12 h-12 text-gray-300" />} title="No one is live" desc="Stay tuned for upcoming discussions." />}
                  </div>
                )}

                {activeTab === 'calendar' && (
                  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* ... Minimal calendar render ... */}
                    <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg md:text-xl font-bold">{currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                      <div className="flex gap-2"><button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft /></button><button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight /></button></div>
                    </div>
                    <div className="grid grid-cols-7 text-center py-1 md:py-2 text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50"> {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d}>{d}</div>)} </div>
                    <div className="grid grid-cols-7 h-[400px] md:h-[500px]">
                       {calendarDays.map((d, i) => (
                         <div key={i} className={`p-1 md:p-2 border-r border-b border-gray-50 flex flex-col ${d.day ? 'bg-white' : 'bg-gray-50/30'}`}>
                           {d.day && <span className="text-[9px] md:text-xs font-bold text-gray-400 mb-1">{d.day}</span>}
                           {d.episodes.slice(0, 2).map(ep => <div key={ep.id} className="text-[7px] md:text-[9px] font-bold p-0.5 md:p-1 rounded bg-blue-50 text-blue-600 mb-0.5 truncate">{ep.title}</div>)}
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && isExpert && (
                  <AnalyticsDashboard
                    episodes={myAnalyticsEpisodes}
                    onRefresh={fetchAll}
                    onPlay={(ep) => setActiveVideo(ep)}
                    currentUser={currentUser}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modals & Popups */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSubmit={handleUpload} isLoading={submitting} />}
      {showGoLive && <GoLiveModal onClose={() => setShowGoLive(false)} onSubmit={handleGoLive} isLoading={submitting} />}
      
      {activeVideo && (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveVideo(null)}>
          <div className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveVideo(null)} className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"><X className="w-6 h-6" /></button>
            <div className="aspect-video w-full bg-black">
              <iframe src={getEmbedUrl(activeVideo.videoUrl || activeVideo.streamUrl || '') || ''} className="w-full h-full" allowFullScreen title={activeVideo.title} allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen" />
            </div>
            <div className="p-8 bg-gray-900 text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-3xl font-black mb-2">{activeVideo.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatDate(activeVideo.publishDate)}</span>
                    <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {formatViews(activeVideo.plays)} plays</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => handleToggleLike(e, activeVideo.id)} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeVideo.likes?.includes(currentUser?.id || '') ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}><Heart className={`w-5 h-5 ${activeVideo.likes?.includes(currentUser?.id || '') ? 'fill-current' : ''}`} /> {activeVideo.likes?.length || 0}</button>
                  <button onClick={(e) => handleShare(e, activeVideo)} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all flex items-center gap-2"><Share2 className="w-5 h-5" /> Share</button>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-gray-300 leading-relaxed max-h-40 overflow-y-auto">{activeVideo.description}</p>
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl">
                    {activeVideo.uploaderName.charAt(0)}
                  </div>
                  <div><h4 className="font-bold">{activeVideo.uploaderName}</h4><p className="text-gray-500 text-xs">Expert Contributor</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      <ReportDialog
        open={!!reportPodcast}
        onClose={() => setReportPodcast(null)}
        targetType="podcast"
        targetId={reportPodcast?.id || ''}
        targetLabel={reportPodcast?.title}
      />
    </div>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
          <div className="h-40 md:h-48 bg-gray-100" />
          <div className="p-4 md:p-5 flex-1 flex flex-col gap-3">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-8 bg-gray-100 rounded w-full mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────

function AnalyticsDashboard({
  episodes,
  onRefresh,
  onPlay,
}: {
  episodes: Episode[];
  onRefresh: () => void;
  onPlay: (ep: Episode) => void;
  currentUser?: { id: string; name: string; avatar?: string } | null;
}) {
  const totalPlays = episodes.reduce((s, e) => s + (e.plays || 0), 0);
  const totalLikes = episodes.reduce((s, e) => s + (e.likes?.length || 0), 0);
  const avgEngagement = episodes.length
    ? Math.round(((totalLikes / Math.max(totalPlays, 1)) * 100) * 10) / 10
    : 0;
  const topByPlays = [...episodes].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
  const maxPlays = Math.max(...topByPlays.map((e) => e.plays || 0), 1);

  const statCards = [
    { label: 'Total Plays', value: formatViews(totalPlays), icon: <Eye className="w-5 h-5" />, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-700' },
    { label: 'Total Likes', value: formatViews(totalLikes), icon: <Heart className="w-5 h-5" />, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-700' },
    { label: 'Episodes', value: String(episodes.length), icon: <Mic className="w-5 h-5" />, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700' },
    { label: 'Avg Engagement', value: `${avgEngagement}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ];

  if (episodes.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-12 h-12 text-gray-300" />}
        title="No analytics yet"
        desc="Publish your first episode to see performance analytics here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">Post-Session Analytics</h2>
          <p className="text-sm text-gray-500">Detailed engagement metrics for your published episodes</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 flex items-center gap-2 shadow-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.text} mb-3`}>
              {card.icon}
            </div>
            <div className="text-2xl font-black text-gray-900 leading-none mb-1">{card.value}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Bar Chart: Top Episodes by Plays */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-black text-gray-900">Top Episodes by Plays</h3>
        </div>
        <div className="space-y-3">
          {topByPlays.map((ep, idx) => {
            const pct = Math.max(Math.round(((ep.plays || 0) / maxPlays) * 100), 4);
            const engagementRate = ep.plays
              ? Math.round(((ep.likes?.length || 0) / ep.plays) * 1000) / 10
              : 0;
            const barColors = [
              'bg-gradient-to-r from-blue-500 to-indigo-500',
              'bg-gradient-to-r from-violet-500 to-purple-500',
              'bg-gradient-to-r from-emerald-500 to-teal-500',
              'bg-gradient-to-r from-amber-500 to-orange-500',
              'bg-gradient-to-r from-rose-500 to-pink-500',
            ];
            return (
              <button
                key={ep.id}
                onClick={() => onPlay(ep)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-gray-400 w-4 flex-shrink-0">#{idx + 1}</span>
                    <span className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{ep.title}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className="font-black text-gray-900">{formatViews(ep.plays || 0)} plays</span>
                    <span className={`font-bold ${engagementRate > 5 ? 'text-emerald-600' : 'text-gray-400'}`}>{engagementRate}% eng.</span>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColors[idx % barColors.length]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Episode Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-gray-900">All Episodes</h3>
          <span className="ml-auto text-xs font-bold text-gray-400">{episodes.length} total</span>
        </div>
        <div className="divide-y divide-gray-50">
          {episodes.map((ep, idx) => {
            const engRate = ep.plays ? Math.round(((ep.likes?.length || 0) / ep.plays) * 1000) / 10 : 0;
            const isTop = idx === 0;
            return (
              <button
                key={ep.id}
                onClick={() => onPlay(ep)}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${isTop ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                    {isTop ? '🏆' : `#${idx + 1}`}
                  </div>
                  {/* Thumbnail / gradient */}
                  {ep.thumbnailUrl ? (
                    <img src={ep.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br ${cardGradient(ep.id)} flex items-center justify-center`}>
                      <Mic className="w-4 h-4 text-white/60" />
                    </div>
                  )}
                  {/* Title + date */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{ep.title}</div>
                    <div className="text-xs text-gray-400">{formatDate(ep.publishDate)} · {ep.sessionType === 'live' ? '🔴 Was Live' : '📹 Recorded'}</div>
                  </div>
                  {/* Metrics */}
                  <div className="hidden md:flex items-center gap-6 flex-shrink-0 text-sm">
                    <div className="text-center">
                      <div className="font-black text-gray-900">{formatViews(ep.plays || 0)}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                    </div>
                    <div className="text-center">
                      <div className="font-black text-gray-900">{ep.likes?.length || 0}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Likes</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-black ${engRate > 5 ? 'text-emerald-600' : engRate > 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {engRate}%
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Eng. Rate</div>
                    </div>
                  </div>
                  {/* Mobile metrics */}
                  <div className="flex md:hidden items-center gap-3 flex-shrink-0 text-xs font-bold text-gray-600">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(ep.plays || 0)}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" />{ep.likes?.length || 0}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-24 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="mb-4 md:mb-5 opacity-50 bg-gray-50 p-3 md:p-4 rounded-full">{icon}</div>
      <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-xs md:text-sm text-gray-500 max-w-xs px-4">{desc}</p>
    </div>
  );
}
