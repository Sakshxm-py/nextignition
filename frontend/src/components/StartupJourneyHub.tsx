import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Lock, TrendingUp } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { StageId, StartupJourney } from '../types/startupJourney';
import {
  canAccessStage,
  getCompletionPercent,
  setCurrentStage,
  updateTaskDone,
} from '../services/startupJourneyService';
import { getUsersByRole } from '../services/userService';

type UserRole = 'founder' | 'expert' | 'investor';

interface StartupJourneyHubProps {
  userRole: UserRole;
  profileId: string;
  journey: StartupJourney;
  industry?: string;
  onRefresh: () => void;
  onNavigate?: (tab: string, subTab?: string) => void;
}

const STAGES: { id: StageId; title: string }[] = [
  { id: 'ideation', title: 'Ideation' },
  { id: 'mvp', title: 'MVP Development' },
  { id: 'growth', title: 'Growth & Fundraising' },
  { id: 'scaling', title: 'Scaling & Operations' },
];

const stageColor = (stageId: StageId) => {
  if (stageId === 'ideation') return brandColors.electricBlue;
  if (stageId === 'mvp') return brandColors.atomicOrange;
  if (stageId === 'growth') return brandColors.navyBlue;
  return '#10b981';
};

const tokenize = (s?: string) =>
  String(s || '')
    .toLowerCase()
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

export function StartupJourneyHub({ userRole, profileId, journey, industry, onRefresh, onNavigate }: StartupJourneyHubProps) {
  const canEdit = userRole === 'founder';

  const [experts, setExperts] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [ex, inv] = await Promise.all([
          getUsersByRole('expert').catch(() => []),
          getUsersByRole('investor').catch(() => []),
        ]);
        if (!cancelled) {
          setExperts(Array.isArray(ex) ? ex : []);
          setInvestors(Array.isArray(inv) ? inv : []);
        }
      } catch {
        if (!cancelled) {
          setExperts([]);
          setInvestors([]);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendedExperts = useMemo(() => {
    const tokens = new Set(tokenize(industry));
    return (experts || [])
      .map((u) => {
        const uTokens = new Set(tokenize(u?.industry || u?.data?.industry));
        const overlap = [...tokens].filter((t) => uTokens.has(t)).length;
        const score = overlap * 10;
        return { u, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [experts, industry]);

  const recommendedInvestors = useMemo(() => {
    const tokens = new Set(tokenize(industry));
    return (investors || [])
      .map((u) => {
        const uTokens = new Set(tokenize(u?.industry || u?.data?.industry));
        const overlap = [...tokens].filter((t) => uTokens.has(t)).length;
        const score = overlap * 10;
        return { u, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [investors, industry]);

  const handleSelectStage = async (stageId: StageId) => {
    if (!canAccessStage(journey, stageId)) return;
    await setCurrentStage(profileId, stageId);
    onRefresh();
  };

  const handleToggleTask = async (stageId: StageId, taskId: string, done: boolean) => {
    if (!canEdit) return;
    await updateTaskDone(profileId, stageId, taskId, done);
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
            Startup Journey
          </h2>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Current stage: <span className="font-semibold">{STAGES.find((s) => s.id === journey.currentStage)?.title}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {STAGES.map((s) => {
          const locked = !canAccessStage(journey, s.id);
          const pct = getCompletionPercent(journey, s.id);
          const color = stageColor(s.id);
          const active = journey.currentStage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSelectStage(s.id)}
              disabled={locked}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                active ? 'border-gray-900' : locked ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'
              }`}
              style={active ? { boxShadow: `0 12px 24px ${color}20` } : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold">{s.title}</div>
                {locked ? <Lock className="w-4 h-4 text-gray-400" /> : pct === 100 ? <CheckCircle className="w-4 h-4" style={{ color }} /> : null}
              </div>
              <div className="text-xs text-gray-600">{pct}% complete</div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="font-bold mb-2">Tasks</div>
          <div className="space-y-2">
            {(journey.stages[journey.currentStage]?.tasks || []).map((t) => (
              <label key={t.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                <input name="input-a4125e"
                  type="checkbox"
                  checked={!!t.done}
                  disabled={!canEdit}
                  onChange={(e) => handleToggleTask(journey.currentStage, t.id, e.target.checked)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${t.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{t.title}</div>
                  {t.description ? <div className="text-xs text-gray-500">{t.description}</div> : null}
                </div>
                {t.done ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
              </label>
            ))}
          </div>
          {!canEdit ? <div className="text-xs text-gray-500 mt-2">View-only for {userRole}.</div> : null}
        </div>

        <div>
          <div className="font-bold mb-2">Recommendations</div>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="font-semibold mb-2">Experts to match</div>
              {(recommendedExperts.length ? recommendedExperts : []).map(({ u }, idx) => (
                <div key={u?.id || u?._id || idx} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">
                    {u?.name || u?.data?.name || 'Expert'}
                  </span>
                  <button
                    className="text-xs text-blue-600 hover:underline font-medium"
                    onClick={() => onNavigate?.('Discover', 'Experts')}
                  >
                    Connect
                  </button>
                </div>
              ))}
              {!recommendedExperts.length ? <div className="text-sm text-gray-500">No expert recommendations yet.</div> : null}
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="font-semibold mb-2">Investors to match</div>
              {(recommendedInvestors.length ? recommendedInvestors : []).map(({ u }, idx) => (
                <div key={u?.id || u?._id || idx} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">
                    {u?.name || u?.data?.name || 'Investor'}
                  </span>
                  <button
                    className="text-xs text-blue-600 hover:underline font-medium"
                    onClick={() => onNavigate?.('Discover', 'Investors')}
                  >
                    Connect
                  </button>
                </div>
              ))}
              {!recommendedInvestors.length ? <div className="text-sm text-gray-500">No investor recommendations yet.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
