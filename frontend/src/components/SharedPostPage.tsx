import { useEffect, useState } from 'react';
import api from '../services/api';
import { getCurrentUser } from '../services/authService';
import { ArrowLeft, Heart, MessageCircle, FileText } from 'lucide-react';

interface SharedAuthor {
  name?: string;
  role?: string;
  avatar?: string;
}

interface SharedPost {
  id?: string;
  _id?: string;
  author?: SharedAuthor;
  title?: string;
  summary?: string;
  content?: string;
  type?: string;
  image?: string;
  images?: string[];
  video?: { url?: string; thumbnail?: string };
  document?: { name?: string; url?: string };
  milestone?: { title?: string; description?: string };
  poll?: { question?: string; options?: { text?: string; votes?: number }[] };
  likes?: string[];
  comments?: any[];
  createdAt?: string;
}

const isImageUrl = (v?: string) => !!v && /^(https?:)?\/\//.test(v);

export function SharedPostPage() {
  const [post, setPost] = useState<SharedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUser = getCurrentUser();
  // Extract ID from URL hash (#post/:id)
  const postId = (window.location.hash || '').replace('#', '').replace('post/', '');

  useEffect(() => {
    let mounted = true;

    if (!postId || postId === 'post') {
      setLoading(false);
      setError('Post link is missing an ID.');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/feed/${postId}`);
        if (mounted) setPost(res.data);
      } catch (err) {
        if (mounted) setError('This post could not be found. It may have been removed.');
        console.error('Error fetching shared post:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [postId]);

  const goToApp = () => {
    if (currentUser && !(currentUser as any).isGuest) {
      window.location.hash = `${(currentUser as any).role || 'founder'}-dashboard`;
    } else {
      window.location.hash = 'login';
    }
  };

  const goHome = () => { window.location.hash = 'home'; };

  const author = post?.author || {};
  const authorName = author.name || 'NextIgnition Member';
  const avatar = author.avatar || authorName.charAt(0).toUpperCase();
  const images = post?.images || (post?.image ? [post.image] : []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5" /> NextIgnition
          </button>
          <button
            onClick={goToApp}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            {currentUser && !(currentUser as any).isGuest ? 'Open App' : 'Sign in'}
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error || !post ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
            <p className="text-gray-700 font-medium mb-2">Post unavailable</p>
            <p className="text-gray-500 text-sm mb-6">{error || 'This post could not be loaded.'}</p>
            <button
              onClick={goToApp}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Explore NextIgnition
            </button>
          </div>
        ) : (
          <article className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Author */}
            <div className="flex items-center gap-3 p-5">
              {isImageUrl(avatar) ? (
                <img src={avatar} alt={authorName} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                  {avatar}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 leading-tight">{authorName}</p>
                <p className="text-sm text-gray-500 capitalize">
                  {author.role || 'Member'}
                  {post.createdAt ? ` · ${new Date(post.createdAt).toLocaleDateString()}` : ''}
                </p>
              </div>
            </div>

            {/* Title (resources / knowledge content) */}
            {post.title && (
              <h1 className="px-5 pt-1 pb-2 text-xl font-bold text-gray-900 leading-snug">{post.title}</h1>
            )}

            {/* Summary (resources) */}
            {post.summary && (
              <p className="px-5 pb-3 text-gray-600 italic leading-relaxed">{post.summary}</p>
            )}

            {/* Content */}
            {post.content && (
              <p className="px-5 pb-4 text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            )}

            {/* Milestone */}
            {post.type === 'milestone' && post.milestone && (
              <div className="mx-5 mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="font-semibold text-amber-800">🏆 {post.milestone.title}</p>
                {post.milestone.description && (
                  <p className="text-sm text-amber-700 mt-1">{post.milestone.description}</p>
                )}
              </div>
            )}

            {/* Images */}
            {images.length > 0 && (
              <div className="grid grid-cols-1 gap-1">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="post media" className="w-full object-cover max-h-[520px]" />
                ))}
              </div>
            )}

            {/* Video */}
            {post.video?.url && (
              <video src={post.video.url} controls className="w-full max-h-[520px] bg-black" />
            )}

            {/* Document */}
            {post.document?.url && (
              <a
                href={post.document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-5 mb-4 flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50"
              >
                <FileText className="w-6 h-6 text-indigo-600" />
                <span className="text-sm font-medium text-gray-800">{post.document.name || 'View document'}</span>
              </a>
            )}

            {/* Poll */}
            {post.type === 'poll' && post.poll && (
              <div className="mx-5 mb-4">
                <p className="font-semibold text-gray-900 mb-2">{post.poll.question}</p>
                <div className="space-y-2">
                  {(post.poll.options || []).map((opt, i) => (
                    <div key={i} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm">
                      {opt.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement summary */}
            <div className="flex items-center gap-6 px-5 py-4 border-t border-gray-100 text-gray-500 text-sm">
              <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" /> {(post.likes || []).length}</span>
              <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> {(post.comments || []).length}</span>
            </div>

            {/* CTA */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-3">Join the conversation on NextIgnition.</p>
              <button
                onClick={goToApp}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                {currentUser && !(currentUser as any).isGuest ? 'Open in App' : 'Sign in to engage'}
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}

export default SharedPostPage;
