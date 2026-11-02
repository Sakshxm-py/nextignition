import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Target,
  DollarSign,
  PieChart,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap
} from 'lucide-react';
import { AIPortfolioAnalysisModal } from './AIPortfolioAnalysisModal';

type AIPortfolioInsightsProps = {
  portfolioStartups: any[];
};

export function AIPortfolioInsights({ portfolioStartups }: AIPortfolioInsightsProps) {
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const safePortfolio = Array.isArray(portfolioStartups) ? portfolioStartups : [];

  const totalInvested = safePortfolio
    .map((s: any) => Number(s?.funding?.raised ?? s?.fundingRaised ?? 0))
    .filter((n: number) => Number.isFinite(n))
    .reduce((acc: number, n: number) => acc + n, 0);

  const currentValueRaw = safePortfolio
    .map((s: any) => Number(s?.currentValue ?? s?.current_value ?? NaN))
    .filter((n: number) => Number.isFinite(n));

  const currentValue = currentValueRaw.length
    ? currentValueRaw.reduce((acc: number, n: number) => acc + n, 0)
    : null;

  const scores = safePortfolio
    .map((s: any) => Number(s?.aiScore ?? s?.ai_score ?? NaN))
    .filter((n: number) => Number.isFinite(n));

  const riskCounts = scores.reduce(
    (acc: { low: number; medium: number; high: number }, score: number) => {
      const clamped = Math.max(0, Math.min(100, score));
      if (clamped >= 75) acc.low += 1;
      else if (clamped >= 50) acc.medium += 1;
      else acc.high += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  const riskTotal = Math.max(riskCounts.low + riskCounts.medium + riskCounts.high, 1);
  const riskDistribution = {
    low: Math.round((riskCounts.low / riskTotal) * 100),
    medium: Math.round((riskCounts.medium / riskTotal) * 100),
    high: Math.max(0, 100 - Math.round((riskCounts.low / riskTotal) * 100) - Math.round((riskCounts.medium / riskTotal) * 100))
  };

  const overallIRR = null;
  const alerts: any[] = [];
  const recommendations: any[] = [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-xl m-[16px] m-[0px]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Portfolio Health Dashboard</h2>
            <p className="text-white/80 text-sm">Powered by Ignisha AI</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
          Live
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium text-white/80">Overall IRR</span>
          </div>
          <div className="text-2xl font-bold">{overallIRR === null ? 'N/A' : `${overallIRR}%`}</div>
          {Capacitor.getPlatform() !== 'ios' && (
            <div className="text-xs text-white/60 mt-1">Calculated returns coming soon</div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium text-white/80">Total Invested</span>
          </div>
          <div className="text-2xl font-bold">
            {totalInvested >= 1000000 ? `$${(totalInvested / 1000000).toFixed(1)}M` : `$${Math.round(totalInvested).toLocaleString()}`}
          </div>
          <div className="text-xs text-white/60 mt-1">Across {safePortfolio.length} companies</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium text-white/80">Current Value</span>
          </div>
          <div className="text-2xl font-bold">
            {currentValue === null
              ? 'N/A'
              : currentValue >= 1000000
                ? `$${(currentValue / 1000000).toFixed(1)}M`
                : `$${Math.round(currentValue).toLocaleString()}`}
          </div>
          <div className="text-xs text-white/60 mt-1">
            {currentValue === null || totalInvested <= 0
              ? 'Add valuations to enable returns'
              : `${(((currentValue / totalInvested) - 1) * 100).toFixed(1)}% return`}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4" />
            <span className="text-xs font-medium text-white/80">Risk Profile</span>
          </div>
          <div className="flex gap-1 mt-2">
            <div
              className="h-2 bg-green-400 rounded-full"
              style={{ width: `${riskDistribution.low}%` }}
              title="Low Risk"
            />
            <div
              className="h-2 bg-yellow-400 rounded-full"
              style={{ width: `${riskDistribution.medium}%` }}
              title="Medium Risk"
            />
            <div
              className="h-2 bg-red-400 rounded-full"
              style={{ width: `${riskDistribution.high}%` }}
              title="High Risk"
            />
          </div>
          <div className="text-xs text-white/60 mt-2">Based on available AI scores</div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-bold text-lg">Priority Alerts</h3>
          <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-bold">
            {alerts.length}
          </span>
        </div>
        {alerts.length ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white/80">{alert.message}</p>
                  </div>
                  <button className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-sm text-white/80">
            No alerts available yet.
          </div>
        )}
      </div>

      {/* AI Recommendations */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold text-lg">AI Recommendations</h3>
        </div>
        {recommendations.length ? (
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-sm flex-1">{rec.title}</h4>
                </div>
                <p className="text-sm text-white/80">{rec.description}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-sm text-white/80">
            No recommendations yet.
          </div>
        )}
      </div>

      {/* View Full Analysis CTA */}
      <button
        className="w-full py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
        onClick={() => {
          setIsAnalysisModalOpen(true);
        }}
      >
        View Full Analysis
        <ChevronRight className="w-5 h-5" />
      </button>

      <AIPortfolioAnalysisModal 
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        portfolioStartups={portfolioStartups}
      />
    </motion.div>
  );
}
