import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  MessageCircle,
  Info,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { brandColors } from '../utils/colors';

interface AIDocumentAnalyzerProps {
  documentName: string;
  documentCategory: string;
  analysisData?: {
    summary?: string;
    executiveSummary?: string;
    highlights?: string[];
    strengths?: string[];
    gaps?: string[];
    redFlags?: string[];
    moatType?: string;
    investorReadinessScore?: number;
    scoreMetrics?: Array<{ label: string; score: number; note: string }>;
    analysis?: any;
  } | null;
}

export function AIDocumentAnalyzer({ documentName, documentCategory, analysisData }: AIDocumentAnalyzerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Mock AI analysis data - in real app, this would come from AI processing
  // Handle nested analysis structure from DB
  const rawData = analysisData?.analysis || analysisData;
  const analysis = rawData || {
    highlights: ["Problem and solution clarity", "Market size and positioning", "Business model viability"],
    strengths: ["Strong founder background", "First-mover advantage"],
    gaps: ["Needs clearer roadmap", "Customer acquisition cost optimization"],
    redFlags: [],
    moatType: "Network Effects",
    investorReadinessScore: 75,
    scoreMetrics: [
      { label: 'Market Timing', score: 8.5, note: 'Near-term adoption high' },
      { label: 'Founder-Market Fit', score: 7.0, note: 'Deep domain expertise' },
      { label: 'Product Moat', score: 6.5, note: 'Good barrier to entry' },
      { label: 'Business Model', score: 9.0, note: 'Scalable recurring revenue' },
      { label: 'Growth Trajectory', score: 8.0, note: 'Strong MoM growth' }
    ]
  };

  const displaySummary = analysis.summary || analysis.executiveSummary || "AI summary not available.";

  const handleRequestClarification = () => {
    if (clarificationMessage.trim()) {
      // In real app, this would send the message to the startup
      console.log('Clarification request:', clarificationMessage);
      setShowClarificationModal(false);
      setClarificationMessage('');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">AI Document Analysis</h3>
                <p className="text-xs text-white/80">Analyzing {documentCategory}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                Live
              </span>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white"
            >
              <div className="p-4 space-y-4">
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <h4 className="text-sm font-bold text-indigo-900 mb-2">Executive Summary</h4>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    {displaySummary}
                  </p>
                </div>

                {/* Investor Readiness Score */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                   <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Investor Readiness</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">AI proprietary scoring</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-3xl font-black text-indigo-600">{analysis.investorReadinessScore || 0}%</span>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                           <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${analysis.investorReadinessScore || 0}%` }}></div>
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-3">
                      {(analysis.scoreMetrics || []).map((m: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                           <div className="flex justify-between text-xs">
                              <span className="font-bold text-gray-700">{m.label}</span>
                              <span className="font-black text-indigo-600">{m.score}/10</span>
                           </div>
                           <div className="w-full h-1 bg-gray-200 rounded-full">
                              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${m.score * 10}%` }}></div>
                           </div>
                           <p className="text-[10px] text-gray-500 italic">{m.note}</p>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Moat & Red Flags */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-1.5 mb-2">
                         <Shield className="w-3.5 h-3.5 text-blue-600" />
                         <h5 className="text-xs font-bold text-blue-700">Competitive Moat</h5>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{analysis.moatType || 'Analyzing...'}</p>
                   </div>
                   {(analysis.redFlags || []).length > 0 && (
                      <div className="p-3 bg-red-50/50 rounded-lg border border-red-100">
                         <div className="flex items-center gap-1.5 mb-2">
                           <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                           <h5 className="text-xs font-bold text-red-700">Red Flags</h5>
                         </div>
                         <p className="text-[10px] text-red-900 font-medium">Potential deal-breakers detected.</p>
                      </div>
                   )}
                </div>

                {/* Highlights & Strengths */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                           <CheckCircle className="w-3 h-3 text-green-500" /> Strengths
                        </h4>
                        {(analysis.strengths || []).map((s: string, idx: number) => (
                          <div key={idx} className="flex gap-2 text-xs text-gray-700">
                             <span className="text-green-500 font-bold">•</span>
                             {s}
                          </div>
                        ))}
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                           <AlertCircle className="w-3 h-3 text-amber-500" /> Gaps
                        </h4>
                        {(analysis.gaps || []).map((g: string, idx: number) => (
                          <div key={idx} className="flex gap-2 text-xs text-gray-700">
                             <span className="text-amber-500 font-bold">•</span>
                             {g}
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setShowClarificationModal(true)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Request Clarification
                  </button>
                  <button
                    onClick={() => setShowDetails(prev => !prev)}
                    aria-expanded={showDetails}
                    className="px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    Details
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Inline Details Panel */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{documentName}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{documentCategory}</p>
                          </div>
                        </div>

                        {(analysis.highlights || []).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Target className="w-3 h-3 text-indigo-500" /> Key Highlights
                            </h4>
                            {(analysis.highlights || []).map((h: string, idx: number) => (
                              <div key={idx} className="flex gap-2 text-xs text-gray-700">
                                <span className="text-indigo-500 font-bold">•</span>
                                {h}
                              </div>
                            ))}
                          </div>
                        )}

                        {(analysis.redFlags || []).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-red-500" /> Red Flags
                            </h4>
                            {(analysis.redFlags || []).map((r: string, idx: number) => (
                              <div key={idx} className="flex gap-2 text-xs text-gray-700">
                                <span className="text-red-500 font-bold">•</span>
                                {r}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-gray-500">Moat:</span>
                            <span className="font-bold text-gray-900">{analysis.moatType || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Activity className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-gray-500">Readiness:</span>
                            <span className="font-bold text-gray-900">{analysis.investorReadinessScore || 0}%</span>
                          </div>
                        </div>

                        {(analysis.scoreMetrics || []).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                              <BarChart3 className="w-3 h-3 text-indigo-500" /> Detailed Scores
                            </h4>
                            {(analysis.scoreMetrics || []).map((m: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-baseline text-xs">
                                <span className="text-gray-700">{m.label}</span>
                                <span className="text-gray-500 italic mx-2 flex-1 truncate text-right">{m.note}</span>
                                <span className="font-black text-indigo-600">{m.score}/10</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Clarification Modal */}
      <AnimatePresence>
        {showClarificationModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Request Clarification</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ask the startup team about specific metrics or findings
                    </p>
                  </div>
                  <button
                    onClick={() => setShowClarificationModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Question
                </label>
                <textarea name="textarea-d3f42d"
                  value={clarificationMessage}
                  onChange={(e) => setClarificationMessage(e.target.value)}
                  placeholder="e.g., Can you explain the increase in burn rate despite revenue growth?"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg resize-none focus:border-purple-600 focus:outline-none"
                  rows={4}
                />

                {/* Quick Templates */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Quick Templates:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Explain the revenue deceleration',
                      'Clarify burn rate increase',
                      'Provide CAC calculation details'
                    ].map((template, index) => (
                      <button
                        key={index}
                        onClick={() => setClarificationMessage(template)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowClarificationModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestClarification}
                  disabled={!clarificationMessage.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
