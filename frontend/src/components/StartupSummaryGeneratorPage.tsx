import { useState } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { generateSummary } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function StartupSummaryGeneratorPage() {
  const [idea, setIdea] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    const trimmed = idea.trim();
    if (!trimmed) {
      setError('Please describe your startup idea first.');
      return;
    }

    setError('');
    setSummary('');
    setIsGenerating(true);

    try {
      const res = await generateSummary(trimmed);
      setSummary(String(res?.summary || res?.result || ''));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to generate a summary right now.');
    } finally {
      setIsGenerating(false);
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
              style={{ backgroundColor: `${brandColors.atomicOrange}22` }}
            >
              <Sparkles className="w-6 h-6" style={{ color: brandColors.atomicOrange }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Startup Summary Generator</h1>
              <p className="text-gray-600 mt-1">Turn your idea into an investor-ready summary.</p>
            </div>
          </div>

          <label className="block text-sm font-semibold mb-2">Your startup idea</label>
          <textarea name="textarea-f7bb58"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2"
            style={{ focusRingColor: brandColors.atomicOrange } as any}
            placeholder="Describe the problem, your solution, target users, and why now..."
          />

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: brandColors.atomicOrange }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate summary'
            )}
          </button>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          )}

          {summary && (
            <div className="mt-8 rounded-3xl border border-gray-100 bg-slate-50/50 p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900">Investor-Ready Analysis</h2>
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
