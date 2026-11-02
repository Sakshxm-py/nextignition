import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Upload, FileText, Sparkles } from 'lucide-react';
import { analyzePitchDeck } from '../services/aiService';
import { brandColors } from '../utils/colors';

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

export function PitchDeckSummarizerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summaryText = useMemo(() => {
    if (!result) return '';
    return result.summary || result.executiveSummary || '';
  }, [result]);

  const highlights = useMemo(() => {
    if (!result) return [] as string[];
    return normalizeList(result.highlights || result.keyHighlights || result.insights);
  }, [result]);

  const strengths = useMemo(() => {
    if (!result) return [] as string[];
    return normalizeList(result.strengths);
  }, [result]);

  const gaps = useMemo(() => {
    if (!result) return [] as string[];
    return normalizeList(result.gaps);
  }, [result]);

  const serverScoreMetrics = useMemo(() => {
    if (!result) return [] as { label: string; score: number; note: string }[];
    const raw = (result as any).scoreMetrics;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((m: any) => ({
        label: String(m?.label || ''),
        score: Number(m?.score),
        note: String(m?.note || ''),
      }))
      .filter((m: any) => m.label && Number.isFinite(m.score));
  }, [result]);

  const scoreMetrics = useMemo(() => {
    if (!result) return [] as { label: string; score: number; note: string }[];
    if (serverScoreMetrics.length > 0) return serverScoreMetrics;

    const fullText = [summaryText, ...highlights, ...strengths, ...gaps].join(' ').toLowerCase();
    const readinessRaw = Number(result.investorReadinessScore);
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
  }, [result, summaryText, highlights, strengths, gaps, serverScoreMetrics]);

  const handleAnalyze = async () => {
    if (!file) {
      fileInputRef.current?.click();
      setError('');
      return;
    }

    setError('');
    setResult(null);
    setIsAnalyzing(true);

    try {
      const data = await analyzePitchDeck(file);
      setResult(data || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to analyze this pitch deck right now.');
    } finally {
      setIsAnalyzing(false);
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
              style={{ backgroundColor: `${brandColors.navyBlue}22` }}
            >
              <Sparkles className="w-6 h-6" style={{ color: brandColors.navyBlue }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Pitch Deck Summarizer</h1>
              <p className="text-gray-600 mt-1">
                Upload your deck to generate an executive summary and key highlights.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 bg-gray-50">
            <label className="block text-sm font-semibold mb-3">Pitch deck file</label>
            <input name="input-dc64d3"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setResult(null);
                setError('');
              }}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white file:text-gray-900"
            />

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: brandColors.navyBlue }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Analyze pitch deck
                </>
              )}
            </button>

            {file && (
              <div className="mt-3 text-sm text-gray-700 inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {file.name}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-5">
              {summaryText && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold mb-2">Executive Summary</h2>
                  <p className="text-gray-700 leading-relaxed">{summaryText}</p>
                </div>
              )}

              {scoreMetrics.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold mb-3">Pitch Deck Score Metrics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scoreMetrics.map((metric) => (
                      <div key={metric.label} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-gray-900">{metric.label}</p>
                          <p className="font-bold" style={{ color: brandColors.navyBlue }}>
                            {metric.score.toFixed(1)}/10
                          </p>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, metric.score * 10)}%`, backgroundColor: brandColors.navyBlue }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-600">{metric.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {highlights.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold mb-2">Key Highlights</h2>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    {highlights.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {strengths.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold mb-2">Strengths</h2>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    {strengths.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {gaps.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold mb-2">Gaps & Suggestions</h2>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    {gaps.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!summaryText && highlights.length === 0 && strengths.length === 0 && gaps.length === 0 && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold mb-2">Analysis Result</h2>
                  <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
