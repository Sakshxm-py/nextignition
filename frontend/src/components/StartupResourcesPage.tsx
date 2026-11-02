import { Capacitor } from '@capacitor/core';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Search, BookOpen, FileText, Lightbulb, Rss,
  Clock, Eye, Heart, Share2, Tag, Filter,
  X, Loader2, ChevronRight, Sparkles, TrendingUp,
  BookMarked, PenLine, GraduationCap, Plus, Globe,
  ShieldCheck, User, Trash2, Menu
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { SharePostModal, type SharablePost } from './SharePostModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resource {
  id: string;
  _id?: string;
  title: string;
  summary?: string;
  content?: string;
  type: 'article' | 'case_study' | 'blog';
  author?: string | { id?: string; _id?: string; name?: string; avatar?: string };
  authorRole?: string;
  authorId?: string;
  tags?: string[];
  readTime?: number;
  views?: number;
  likes?: string[];
  isPublic?: boolean;
  isNextIgnition?: boolean;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
}

interface StartupResourcesPageProps {
  userRole?: 'founder' | 'expert' | 'investor';
  onBack?: () => void;
  onMenuClick?: () => void;
  hideHeader?: boolean;
  currentUser?: { id: string; name: string; avatar?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  article: {
    label: 'Article',
    icon: FileText,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  case_study: {
    label: 'Case Study',
    icon: GraduationCap,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  blog: {
    label: 'Blog Post',
    icon: PenLine,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
};

const CATEGORIES = [
  { key: 'all', label: 'All Resources', icon: BookMarked },
  { key: 'nextignition', label: 'NextIgnition', icon: Sparkles },
  { key: 'article', label: 'Articles', icon: FileText },
  { key: 'case_study', label: 'Case Studies', icon: GraduationCap },
  { key: 'blog', label: 'Blogs', icon: PenLine },
];

const GRADIENT_COLORS = [
  'from-blue-600 to-indigo-800',
  'from-purple-600 to-pink-800',
  'from-emerald-600 to-teal-800',
  'from-orange-600 to-red-800',
  'from-sky-600 to-cyan-800',
];
function cardGradient(id: string) {
  return GRADIENT_COLORS[id.charCodeAt(0) % GRADIENT_COLORS.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResourceCard({ resource, currentUserId, onLike, onShare, onDelete, onClick }: {
  resource: Resource;
  currentUserId?: string;
  onLike: (id: string) => void;
  onShare: (r: Resource) => void;
  onDelete?: (id: string) => void;
  onClick: (r: Resource) => void;
}) {
  const id = resource.id || resource._id || '';
  const typeInfo = TYPE_CONFIG[resource.type] || TYPE_CONFIG.article;
  const Icon = typeInfo.icon;
  const isLiked = currentUserId ? resource.likes?.includes(currentUserId) : false;
  const authorId = typeof resource.author === 'object' ? (resource.author?._id || resource.author?.id) : resource.authorId || resource.author;
  const isAuthor = currentUserId && (String(authorId) === String(currentUserId));

  return (
    <article
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full shadow-sm"
      onClick={() => onClick(resource)}
    >
      <div className={`relative h-44 bg-gradient-to-br ${cardGradient(id)} flex items-center justify-center flex-shrink-0`}>
        {resource.imageUrl ? (
          <img src={resource.imageUrl} alt={resource.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <Icon className="w-16 h-16 text-white/20" />
        )}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${typeInfo.bg} ${typeInfo.color} border ${typeInfo.border} shadow-sm`}>
          <Icon className="w-3 h-3" />
          {typeInfo.label}
        </div>
        {resource.readTime && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur text-white text-[10px] font-bold">
            <Clock className="w-3 h-3" />
            {resource.readTime} MIN
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {resource.title}
        </h3>
        {resource.summary && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1 mb-4">
            {resource.summary}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 text-xs font-semibold shadow-inner`}>
              {(typeof resource.author === 'object' ? resource.author?.name || 'N' : resource.author || 'N')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 truncate max-w-[100px]">
                {typeof resource.author === 'object' ? resource.author?.name : resource.author || 'Contributor'}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">{timeAgo(resource.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`p-2 rounded-xl transition-all ${isLiked ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:bg-gray-100'}`}
              onClick={e => { e.stopPropagation(); onLike(id); }}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-all"
              onClick={e => { e.stopPropagation(); onShare(resource); }}
            >
              <Share2 className="w-4 h-4" />
            </button>
            {isAuthor && onDelete && (
              <button
                className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                onClick={e => { e.stopPropagation(); onDelete(id); }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ReadModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const typeInfo = TYPE_CONFIG[resource.type] || TYPE_CONFIG.article;
  const Icon = typeInfo.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${typeInfo.bg}`}>
              <Icon className={`w-6 h-6 ${typeInfo.color}`} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 leading-tight">{resource.title}</h3>
              <p className="text-sm text-gray-400 font-medium">
                {typeof resource.author === 'object' ? resource.author?.name : resource.author || 'Contributor'} · {typeInfo.label}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-gray-200 transition-colors text-gray-400"><X className="w-6 h-6" /></button>
        </div>
        <div className="overflow-y-auto p-10 flex-1 scrollbar-hide">
          {resource.summary && (
            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 mb-8">
               <p className="text-lg text-blue-900 leading-relaxed font-semibold italic">"{resource.summary}"</p>
            </div>
          )}
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
            {resource.content || 'Content coming soon...'}
          </div>
          {resource.tags && resource.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-gray-100 flex flex-wrap gap-2">
              {resource.tags.map(t => (
                <span key={t} className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-bold tracking-tight">#{String(t || '').toUpperCase()}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateResourceModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: Partial<Resource>) => void; isLoading: boolean; }) {
  const [form, setForm] = useState({ title: '', summary: '', content: '', type: 'blog' as const, isPublic: true, tags: '' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white"><Plus className="w-6 h-6" /></div>
            <h3 className="text-xl font-bold text-gray-900">Create Resource</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl"><X className="w-6 h-6 text-gray-400" /></button>
        </div>
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">TITLE</label>
              <input name="input-1c8332" value={form.title} onChange={e => set('title', e.target.value)} className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 font-bold focus:border-blue-500 outline-none transition-all" placeholder="Enter title..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">TYPE</label>
              <select name="select-36defd" value={form.type} onChange={e => set('type', e.target.value)} className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 font-bold focus:border-blue-500 outline-none transition-all">
                <option value="blog">Blog Post</option>
                <option value="article">Article</option>
                <option value="case_study">Case Study</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">SUMMARY</label>
            <input name="input-bf6f79" value={form.summary} onChange={e => set('summary', e.target.value)} className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 font-bold focus:border-blue-500 outline-none transition-all" placeholder="Short description..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">CONTENT</label>
            <textarea name="textarea-95b0c7" value={form.content} onChange={e => set('content', e.target.value)} rows={6} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-4 font-medium focus:border-blue-500 outline-none transition-all resize-none" placeholder="Write your content here..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">TAGS (comma separated)</label>
            <input name="input-b0e12d" value={form.tags} onChange={e => set('tags', e.target.value)} className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 font-bold focus:border-blue-500 outline-none transition-all" placeholder="growth, tech, funding..." />
          </div>
        </div>
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900">Cancel</button>
          <button onClick={() => onSubmit({ ...form, tags: form.tags.split(',').map(t => t.trim()) })} disabled={!form.title || isLoading} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CREATE RESOURCE'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

import { useFeatureAccess } from '../hooks/useFeatureAccess';

export function StartupResourcesPage({ userRole = 'founder', onBack, onMenuClick, hideHeader, currentUser }: StartupResourcesPageProps) {
  const { userPlan } = useFeatureAccess();
  const [activeTab, setActiveTab] = useState('all');
  const [activeSection, setActiveSection] = useState<'explore' | 'my-content'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [shareResource, setShareResource] = useState<Resource | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeSection === 'explore' ? '/knowledge/public' : '/knowledge';
      const res = await api.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : [];
      setResources(data.map((r: any) => ({ ...r, id: r._id || r.id })));
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleCreate = async (data: Partial<Resource>) => {
    setSubmitting(true);
    try {
      await api.post('/knowledge', { ...data, status: 'published' });
      toast.success('Resource created successfully!');
      setShowCreate(false);
      fetchResources();
    } catch {
      toast.error('Failed to create resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (id: string) => {
    if (!currentUser) { toast.error('Please log in to like resources'); return; }
    try {
      await api.post(`/knowledge/${id}/like`);
      setResources(prev => prev.map(r => {
        if (r.id !== id) return r;
        const liked = r.likes?.includes(currentUser.id);
        return {
          ...r,
          likes: liked ? r.likes?.filter(l => l !== currentUser.id) : [...(r.likes || []), currentUser.id],
        };
      }));
    } catch { }
  };

  // Open the in-app share sheet (DMs + Communities), reusing the post-share modal.
  const handleShare = (resource: Resource) => setShareResource(resource);

  const sharableResource: SharablePost | null = shareResource
    ? {
        apiId: shareResource.id || shareResource._id,
        id: shareResource.id || shareResource._id || '',
        author: {
          name:
            typeof shareResource.author === 'object'
              ? shareResource.author?.name || 'NextIgnition'
              : shareResource.author || 'NextIgnition',
        },
        content: shareResource.summary || shareResource.content || '',
        title: shareResource.title,
        kind: 'resource',
      }
    : null;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      await api.delete(`/knowledge/${id}`);
      toast.success('Resource deleted successfully');
      fetchResources();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  // A resource is "NextIgnition" official content when the backend flags it as
  // such. Fall back to the legacy keyword heuristic for older content created
  // before the explicit flag existed.
  const isNextIgnitionResource = (r: Resource) =>
    r.isNextIgnition === true ||
    !!(r.tags?.some(t => t.toLowerCase().includes('nextignition')) ||
       r.title?.toLowerCase().includes('nextignition') ||
       (typeof r.author === 'string' && r.author.toLowerCase().includes('nextignition')) ||
       (typeof r.author === 'object' && r.author?.name?.toLowerCase().includes('nextignition')));

  const filtered = resources.filter(r => {
    let matchTab = false;
    if (activeTab === 'all') matchTab = true;
    else if (activeTab === 'nextignition') matchTab = isNextIgnitionResource(r);
    else matchTab = r.type === activeTab;
    const matchSearch = !searchQuery || r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || r.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  const nextignitionResources = resources.filter(isNextIgnitionResource);

  return (
    <div className="flex min-h-full bg-gray-50">
      <main className="flex-1 flex flex-col relative w-full">
        <header className={`bg-white border-b border-gray-200 px-6 flex-shrink-0 z-10 w-full sticky top-0 ${hideHeader ? 'py-4' : 'pb-8 pt-12 md:py-9'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {!hideHeader && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {onMenuClick && (
                  <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden flex-shrink-0"
                    title="Menu"
                  >
                    <Menu className="w-6 h-6 text-gray-700" />
                  </button>
                )}
                {onBack && (
                  <button
                    onClick={() => onBack()}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
                    title="Go back"
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-3xl font-bold text-gray-900 tracking-tight truncate">Startup Resources</h1>
                <p className="hidden md:block text-xs text-gray-500 font-medium mt-0.5">Your hub for expert-curated knowledge</p>
              </div>
            </div>
            )}
            <div className={`flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto flex-shrink-0 md:mt-0 ${hideHeader ? '' : 'mt-3'}`}>
              <button onClick={() => { setActiveSection('explore'); setActiveTab('all'); }} className={`flex-1 md:flex-none justify-center px-5 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${activeSection === 'explore' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Globe className="w-4 h-4" /> EXPLORE</button>
              <button onClick={() => { setActiveSection('my-content'); setActiveTab('all'); }} className={`flex-1 md:flex-none justify-center px-5 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${activeSection === 'my-content' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><User className="w-4 h-4" /> MY CONTENT</button>
            </div>
          </div>

          <div className="mt-4 md:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide max-w-full">
               {CATEGORIES.filter(cat => !(cat.key === 'nextignition' && activeSection === 'my-content')).map(cat => (
                 <button key={cat.key} onClick={() => setActiveTab(cat.key)} className={`px-4 md:px-5 py-2 rounded-xl text-[11px] md:text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                   cat.key === 'nextignition'
                     ? activeTab === cat.key
                       ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
                       : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                     : activeTab === cat.key
                     ? 'bg-white text-blue-600 shadow-sm'
                     : 'text-gray-400 hover:text-gray-600'
                 }`}>
                   {cat.key === 'nextignition' && <Sparkles className="w-3 h-3" />}
                   {cat.label.toUpperCase()}
                 </button>
               ))}
             </div>
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="relative flex-1 sm:w-64">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input name="input-561bc9" type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-100 border-none rounded-2xl py-3 pl-12 pr-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" />
               </div>
               {activeSection === 'my-content' && (
                 <button onClick={() => {
                   if (userPlan !== 'elite') {
                     toast.error(Capacitor.getPlatform() === 'ios' ? 'Premium Feature' : 'Elite Plan Required 🔒', {
                       description: Capacitor.getPlatform() === 'ios'
                         ? "Publishing resources is available with NextIgnition Premium."
                         : 'Publishing resources is exclusive to Elite members. Upgrade to unlock unlimited content creation.',
                       action: { label: '⚡ Upgrade Now', onClick: () => window.location.hash = '#pricing' },
                       duration: 5000,
                     });
                     return;
                   }
                   setShowCreate(true);
                 }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2 whitespace-nowrap">
                   <Plus className="w-4 h-4" />
                 </button>
               )}
             </div>
          </div>
        </header>

        <div className="flex-1 p-8 pb-32 lg:pb-12 scrollbar-hide">
          <div className="max-w-7xl mx-auto pb-20">
            {/* NextIgnition Guides Section */}
            {activeSection === 'explore' && !loading && nextignitionResources.length > 0 && (
              <section className="mb-10 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 p-8 rounded-[32px] border border-blue-100/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">NextIgnition Guides</h2>
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Curated by the Platform</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {nextignitionResources.slice(0, 4).map(r => (
                    <ResourceCard key={r.id} resource={r} currentUserId={currentUser?.id} onLike={handleLike} onShare={handleShare} onDelete={handleDelete} onClick={setSelectedResource} />
                  ))}
                </div>
              </section>
            )}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"><LoadingGrid /></div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filtered.map(r => <ResourceCard key={r.id} resource={r} currentUserId={currentUser?.id} onLike={handleLike} onShare={handleShare} onDelete={handleDelete} onClick={setSelectedResource} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center mb-6"><BookOpen className="w-12 h-12 text-gray-200" /></div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{activeSection === 'explore' ? 'No Resources Found' : 'You haven\'t posted anything yet'}</h3>
                <p className="text-gray-500 max-w-sm font-medium">Explore the latest insights from global experts or start sharing your own startup journey.</p>
                {activeSection === 'my-content' && <button onClick={() => {
                   if (userPlan !== 'elite') {
                     toast.error(Capacitor.getPlatform() === 'ios' ? 'Premium Feature' : 'Elite Plan Required 🔒', { description: Capacitor.getPlatform() === 'ios' ? "Publishing resources is available with NextIgnition Premium." : 'Publishing resources is exclusive to Elite members. Upgrade to unlock unlimited content creation.', action: { label: '⚡ Upgrade Now', onClick: () => window.location.hash = '#pricing' }, duration: 5000 });
                     return;
                   }
                   setShowCreate(true);
                 }} className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl shadow-xl hover:opacity-90 transition-all">Create Your First Resource</button>}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedResource && <ReadModal resource={selectedResource} onClose={() => setSelectedResource(null)} />}
      {showCreate && <CreateResourceModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} isLoading={submitting} />}
      <SharePostModal post={sharableResource} isOpen={!!shareResource} onClose={() => setShareResource(null)} />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
}

function LoadingGrid() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse shadow-sm">
          <div className="h-44 bg-gray-50" />
          <div className="p-6 space-y-4">
            <div className="h-4 bg-gray-50 rounded w-1/3" />
            <div className="h-6 bg-gray-50 rounded w-full" />
            <div className="h-4 bg-gray-50 rounded w-2/3" />
          </div>
        </div>
      ))}
    </>
  );
}
