import { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { summarizeUserProfile } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ProfileSummarizerPage() {
  const [profileText, setProfileText] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const canUseTool = useMemo(() => {
    return Boolean(localStorage.getItem('token'));
  }, []);

  const handleSummarize = async () => {
    const token = localStorage.getItem('token');
    const trimmed = profileText.trim();
    if (!token && !trimmed) {
      setError('Paste your profile text to summarize, or log in to summarize your saved profile.');
      return;
    }

    setError('');
    setSummary('');
    setIsSummarizing(true);

    try {
      const res = await summarizeUserProfile(trimmed || undefined);
      const text = String(res?.summary || res?.result || res?.profileSummary || '');
      setSummary(text);
      if (!text) {
        setError('No summary returned. Please complete your profile and try again.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to summarize your profile right now.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          onClick={() => {
            window.location.hash = '#home';
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold mb-6"
          style={{ color: brandColors.electricBlue }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="rounded-3xl border border-gray-200 p-8">
          <div className="flex items-start gap-3 mb-6">
            <div
              className="p-3 rounded-2xl"
              style={{ backgroundColor: `${brandColors.electricBlue}22` }}
            >
              <Sparkles className="w-6 h-6" style={{ color: brandColors.electricBlue }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Profile Summarizer</h1>
              <p className="text-gray-600 mt-1">Generate a sharper, investor-ready snapshot of your profile.</p>
            </div>
          </div>

          {!canUseTool && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
              Tip: You can paste your profile text below without logging in.
            </div>
          )}

          <label className="block text-sm font-semibold mt-5 mb-2">Profile text (optional)</label>
          <textarea name="textarea-105df3"
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2"
            style={{ focusRingColor: brandColors.electricBlue } as any}
            placeholder="Paste your bio, experience, skills, achievements, links..."
          />

          <button
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: brandColors.electricBlue }}
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Summarizing...
              </>
            ) : (
              'Summarize my profile'
            )}
          </button>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          )}

          {summary && (
            <div className="mt-8 rounded-3xl border border-gray-100 bg-slate-50/50 p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900">Suggested Profile Summary</h2>
              </div>
              <div className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-600 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:list-disc prose-ol:list-decimal">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
