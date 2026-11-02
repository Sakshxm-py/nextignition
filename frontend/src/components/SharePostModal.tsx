import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Send, Link as LinkIcon, Check, Users, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { getCurrentUser } from '../services/authService';
import { Avatar } from './common/Avatar';

/** Minimal shape of a post (or resource) needed to build a shareable message. */
export interface SharablePost {
  apiId?: string;
  id: string;
  author: { name: string };
  content: string;
  /** Optional title — used for resources to lead with a heading. */
  title?: string;
  /** What is being shared. Defaults to 'post'. */
  kind?: 'post' | 'resource';
}

interface ShareTarget {
  /** Stable key for selection state. */
  key: string;
  kind: 'dm' | 'community';
  name: string;
  subtitle?: string;
  avatar?: string;
  /** Existing direct conversation id (preferred — always sendable). */
  conversationId?: string;
  /** Other user's id, used to get-or-create a conversation when none exists. */
  userId?: string;
  /** Community id (for community targets). */
  communityId?: string;
}

interface SharePostModalProps {
  post: SharablePost | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after at least one successful share so the parent can bump counts. */
  onShared?: () => void;
}

const buildShareMessage = (post: SharablePost): string => {
  const url = `${window.location.origin}/#post/${post.apiId || post.id}`;
  const excerpt = (post.content || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const body = excerpt ? `"${excerpt}${excerpt.length >= 140 ? '…' : ''}"\n` : '';
  if (post.kind === 'resource') {
    const title = (post.title || '').replace(/\s+/g, ' ').trim();
    const heading = title ? `: ${title}` : '';
    return `📚 Shared a resource${heading} by ${post.author?.name || 'a member'}\n${body}${url}`;
  }
  return `📢 Shared a post by ${post.author?.name || 'a member'}:\n${body}${url}`;
};

export function SharePostModal({ post, isOpen, onClose, onShared }: SharePostModalProps) {
  const [people, setPeople] = useState<ShareTarget[]>([]);
  const [communities, setCommunities] = useState<ShareTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, ShareTarget>>({});
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Load share destinations whenever the sheet opens.
  useEffect(() => {
    if (!isOpen) return;
    setSelected({});
    setQuery('');
    setCopied(false);
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [convos, peopleRes, comms, me] = await Promise.allSettled([
          api.get('/messaging/conversations'),
          api.get('/messaging/users/messaging'),
          api.get('/communities'),
          getCurrentUser(),
        ]);

        const myId =
          me.status === 'fulfilled'
            ? String((me.value as any)?.id || (me.value as any)?._id || '')
            : '';

        if (active) {
          const list: ShareTarget[] = [];
          const userIdsWithConvo = new Set<string>();

          // 1) Existing conversations — these can always be messaged.
          if (convos.status === 'fulfilled') {
            for (const c of (convos.value.data as any[]) || []) {
              const other = (c.participants || []).find(
                (p: any) => p?._id && String(p._id) !== myId
              );
              if (!other?._id) continue;
              userIdsWithConvo.add(String(other._id));
              list.push({
                key: `conv:${c._id}`,
                kind: 'dm',
                conversationId: c._id || c.id,
                userId: String(other._id),
                name: other.name || 'User',
                subtitle: other.role || '',
                avatar: other.avatar,
              });
            }
          }

          // 2) Other people you can message (no conversation yet). A conversation
          //    is created on send. Skip anyone already listed above.
          if (peopleRes.status === 'fulfilled') {
            for (const u of (peopleRes.value.data as any[]) || []) {
              const uid = String(u?._id || u?.id || '');
              if (!uid || uid === myId || userIdsWithConvo.has(uid)) continue;
              userIdsWithConvo.add(uid);
              list.push({
                key: `user:${uid}`,
                kind: 'dm',
                userId: uid,
                name: u.name || 'User',
                subtitle: u.role || '',
                avatar: u.avatar,
              });
            }
          }

          setPeople(list);
        }

        if (active && comms.status === 'fulfilled') {
          const list: ShareTarget[] = ((comms.value.data as any[]) || []).map((c: any) => ({
            key: `community:${c._id}`,
            kind: 'community' as const,
            communityId: c._id,
            name: c.name || 'Community',
            subtitle: 'Community',
            avatar: c.icon,
          }));
          setCommunities(list);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (t: ShareTarget) => !q || t.name.toLowerCase().includes(q);
    return {
      people: people.filter(match),
      communities: communities.filter(match),
    };
  }, [people, communities, query]);

  const toggle = (t: ShareTarget) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[t.key]) delete next[t.key];
      else next[t.key] = t;
      return next;
    });

  const selectedList = Object.values(selected);

  const sendToTarget = async (t: ShareTarget, message: string) => {
    if (t.kind === 'dm') {
      // Reuse the existing conversation, or create one for this user.
      let conversationId = t.conversationId;
      if (!conversationId && t.userId) {
        const res = await api.post('/messaging/conversations', { otherUserId: t.userId });
        conversationId = res.data?._id || res.data?.id;
      }
      if (!conversationId) throw new Error('No conversation');
      await api.post(`/messaging/conversations/${conversationId}/messages`, {
        content: message,
        type: 'text',
      });
      return;
    }
    // Community: post into the community's first text channel.
    const res = await api.get(`/communities/${t.communityId}/channels`);
    const channels = (res.data as any[]) || [];
    const textChannel = channels.find((c: any) => c.type === 'text') || channels[0];
    if (!textChannel?._id) throw new Error('No channel available');
    await api.post(`/communities/${t.communityId}/channels/${textChannel._id}/messages`, {
      content: message,
    });
  };

  const handleSend = async () => {
    if (!post || selectedList.length === 0 || sending) return;
    setSending(true);
    const message = buildShareMessage(post);
    let ok = 0;
    let failed = 0;
    let mutualFollowBlocked = 0;
    await Promise.all(
      selectedList.map(async (t) => {
        try {
          await sendToTarget(t, message);
          ok += 1;
        } catch (e: any) {
          failed += 1;
          if (e?.response?.data?.code === 'MUTUAL_FOLLOW_REQUIRED') mutualFollowBlocked += 1;
        }
      })
    );

    // Best-effort: bump the post's share count once.
    if (ok > 0 && post.apiId) {
      try {
        await api.post(`/feed/${post.apiId}/share`);
      } catch {
        /* non-fatal */
      }
      onShared?.();
    }

    setSending(false);
    if (ok > 0 && failed === 0) {
      setToast(`Shared to ${ok} ${ok === 1 ? 'chat' : 'chats'}`);
      setTimeout(() => {
        setToast('');
        onClose();
      }, 900);
    } else if (ok > 0) {
      setToast(
        mutualFollowBlocked > 0
          ? `Shared to ${ok}. ${mutualFollowBlocked} need you to follow each other.`
          : `Shared to ${ok}, ${failed} failed`
      );
    } else if (mutualFollowBlocked > 0) {
      setToast('You can only message people who follow you back.');
    } else {
      setToast('Could not share. Try again.');
    }
  };

  const handleCopyLink = async () => {
    if (!post) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/#post/${post.apiId || post.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!isOpen || !post) return null;

  const renderRow = (t: ShareTarget) => {
    const isSel = !!selected[t.key];
    return (
      <button
        key={t.key}
        onClick={() => toggle(t)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
          isSel ? 'bg-indigo-50' : 'hover:bg-gray-50'
        }`}
      >
        {t.kind === 'community' ? (
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg shrink-0">
            {t.avatar && t.avatar.length <= 3 ? t.avatar : '👥'}
          </div>
        ) : (
          <Avatar src={t.avatar} name={t.name} size="md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{t.name}</p>
          {t.subtitle ? <p className="text-xs text-gray-500 truncate capitalize">{t.subtitle}</p> : null}
        </div>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isSel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
          }`}
        >
          {isSel && <Check className="w-3 h-3 text-white" />}
        </div>
      </button>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{post.kind === 'resource' ? 'Share resource' : 'Share post'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people and communities"
              className="bg-transparent flex-1 text-sm outline-none"
            />
          </div>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <>
              {filtered.people.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <MessageCircle className="w-3.5 h-3.5" /> Messages
                  </div>
                  {filtered.people.map(renderRow)}
                </div>
              )}
              {filtered.communities.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <Users className="w-3.5 h-3.5" /> Communities
                  </div>
                  {filtered.communities.map(renderRow)}
                </div>
              )}
              {filtered.people.length === 0 && filtered.communities.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400 px-6">
                  No people or communities to share with yet.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3 flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            onClick={handleSend}
            disabled={selectedList.length === 0 || sending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)' }}
          >
            <Send className="w-4 h-4" />
            {sending
              ? 'Sending…'
              : selectedList.length > 0
              ? `Send${selectedList.length > 1 ? ` (${selectedList.length})` : ''}`
              : 'Send'}
          </button>
        </div>

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-20 bg-gray-900 text-white text-xs px-4 py-2 rounded-full shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
