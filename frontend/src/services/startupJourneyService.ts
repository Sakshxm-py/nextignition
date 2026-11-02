import { StageId, StageProgress, StartupJourney } from '../types/startupJourney';
import { updateStartup } from './startupService';
import { getCurrentUser } from './authService';

const CREATED_PROFILES_KEY = 'createdProfiles';
const ACTIVE_PROFILE_KEY = 'activeStartupProfile';

const getUserKeySuffix = () => {
  try {
    const user = getCurrentUser();
    const id = user?.id || user?._id || user?.user?.id || user?.user?._id;
    const email = user?.email || user?.user?.email;
    const role = user?.role || user?.user?.role;
    return String(id || email || role || 'anonymous');
  } catch {
    return 'anonymous';
  }
};

const scopedKey = (baseKey: string) => `${baseKey}:${getUserKeySuffix()}`;

const nowIso = () => new Date().toISOString();

export const getActiveStartupProfileId = () =>
  localStorage.getItem(scopedKey(ACTIVE_PROFILE_KEY)) ||
  (getUserKeySuffix() === 'anonymous' ? localStorage.getItem(ACTIVE_PROFILE_KEY) : null) ||
  null;

export const setActiveStartupProfileId = (profileId: string) => {
  localStorage.setItem(scopedKey(ACTIVE_PROFILE_KEY), profileId);
};

export const readCreatedProfiles = (): any[] => {
  try {
    const raw =
      localStorage.getItem(scopedKey(CREATED_PROFILES_KEY)) ||
      (getUserKeySuffix() === 'anonymous' ? localStorage.getItem(CREATED_PROFILES_KEY) : null);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeCreatedProfiles = (profiles: any[]) => {
  localStorage.setItem(scopedKey(CREATED_PROFILES_KEY), JSON.stringify(profiles || []));
};

export const defaultJourney = (): StartupJourney => {
  const stage = (status: StageProgress['status'], tasks: { id: string; title: string }[]): StageProgress => ({
    status,
    tasks: tasks.map((t) => ({ ...t, done: false })),
    lastUpdatedAt: nowIso(),
  });

  return {
    currentStage: 'ideation',
    stages: {
      ideation: stage('available', [
        { id: 'idea', title: 'Define your idea clearly' },
        { id: 'customer', title: 'Identify target customer' },
        { id: 'canvas', title: 'Complete business model canvas' },
        { id: 'validation', title: 'List competitors / validation notes' },
      ]),
      mvp: stage('locked', [
        { id: 'scope', title: 'Define MVP scope' },
        { id: 'features', title: 'List core features' },
        { id: 'timeline', title: 'Set timeline & budget' },
      ]),
      growth: stage('locked', [
        { id: 'traction', title: 'Add traction metrics' },
        { id: 'deck', title: 'Upload / prepare pitch deck' },
        { id: 'investors', title: 'Investor outreach readiness' },
      ]),
      scaling: stage('locked', [
        { id: 'ops', title: 'Define operations scaling plan' },
        { id: 'hiring', title: 'Hiring plan / key roles' },
        { id: 'expansion', title: 'Market expansion plan' },
      ]),
    },
  };
};

export const normalizeStageId = (stage?: string): StageId => {
  const s = String(stage || '').trim().toLowerCase();
  if (s === 'mvp') return 'mvp';
  if (s === 'growth' || s === 'fundraising' || s === 'funding') return 'growth';
  if (s === 'scaling' || s === 'operations' || s === 'scale') return 'scaling';
  return 'ideation';
};

export const ensureJourney = (profile: any): any => {
  if (profile?.journey?.stages) return profile;

  const j = defaultJourney();
  const currentStage = normalizeStageId(profile?.journey?.currentStage || profile?.stage);
  j.currentStage = currentStage;

  if (currentStage !== 'ideation') {
    j.stages.ideation.status = 'completed';
    j.stages.mvp.status = 'available';
  }
  if (currentStage === 'growth' || currentStage === 'scaling') {
    j.stages.mvp.status = 'completed';
    j.stages.growth.status = 'available';
  }
  if (currentStage === 'scaling') {
    j.stages.growth.status = 'completed';
    j.stages.scaling.status = 'available';
  }

  return { ...(profile || {}), journey: j };
};

export const getJourneyForProfile = (profileId: string): StartupJourney | null => {
  const profiles = readCreatedProfiles();
  const p = profiles.find((x) => String(x?.id) === String(profileId));
  if (!p) return null;
  const normalized = ensureJourney(p);
  return normalized.journey as StartupJourney;
};

export const getProfileById = (profileId: string): any | null => {
  const profiles = readCreatedProfiles();
  const p = profiles.find((x) => String(x?.id) === String(profileId));
  return p ? ensureJourney(p) : null;
};

export const upsertProfile = (profile: any) => {
  const normalized = ensureJourney(profile);
  const profiles = readCreatedProfiles();
  const idx = profiles.findIndex((x) => String(x?.id) === String(normalized?.id));
  if (idx >= 0) profiles[idx] = normalized;
  else profiles.unshift(normalized);
  writeCreatedProfiles(profiles);
};

const computeCompletion = (journey: StartupJourney, stageId: StageId): number => {
  const tasks = journey?.stages?.[stageId]?.tasks || [];
  const total = tasks.length || 0;
  if (!total) return 0;
  const done = tasks.filter((t) => !!t.done).length;
  return Math.round((done / total) * 100);
};

const isStageCompleted = (journey: StartupJourney, stageId: StageId): boolean => computeCompletion(journey, stageId) === 100;

const nextStage = (stageId: StageId): StageId | null => {
  if (stageId === 'ideation') return 'mvp';
  if (stageId === 'mvp') return 'growth';
  if (stageId === 'growth') return 'scaling';
  return null;
};

export const setCurrentStage = async (profileId: string, stageId: StageId) => {
  const profiles = readCreatedProfiles();
  const idx = profiles.findIndex((x) => String(x?.id) === String(profileId));
  if (idx < 0) return;
  const normalized = ensureJourney(profiles[idx]);
  const journey: StartupJourney = normalized.journey;
  if (!canAccessStage(journey, stageId)) return;
  journey.currentStage = stageId;
  journey.stages[stageId].lastUpdatedAt = nowIso();
  profiles[idx] = { ...normalized, journey };
  writeCreatedProfiles(profiles);

  if (normalized?.id && typeof normalized?.id === 'string' && !String(normalized.id).startsWith('profile-')) {
    try {
      await updateStartup(normalized.id, { journey: journey });
    } catch {
      // ignore
    }
  }
};

export const completeStage = async (profileId: string, stageId: StageId) => {
  const profiles = readCreatedProfiles();
  const idx = profiles.findIndex((x) => String(x?.id) === String(profileId));
  if (idx < 0) return;

  const normalized = ensureJourney(profiles[idx]);
  const journey: StartupJourney = normalized.journey;
  if (!canAccessStage(journey, stageId)) return;

  const stage = journey.stages[stageId];
  stage.tasks = (stage.tasks || []).map((t) => ({ ...t, done: true, updatedAt: nowIso() }));
  stage.status = 'completed';
  stage.lastUpdatedAt = nowIso();

  const ns = nextStage(stageId);
  if (ns) {
    if (journey.stages[ns].status === 'locked') journey.stages[ns].status = 'available';
    journey.currentStage = ns;
  }

  profiles[idx] = { ...normalized, journey };
  writeCreatedProfiles(profiles);

  if (normalized?.id && typeof normalized?.id === 'string' && !String(normalized.id).startsWith('profile-')) {
    try {
      await updateStartup(normalized.id, { journey: journey });
    } catch {
      // ignore
    }
  }
};

export const updateTaskDone = async (profileId: string, stageId: StageId, taskId: string, done: boolean) => {
  const profiles = readCreatedProfiles();
  const idx = profiles.findIndex((x) => String(x?.id) === String(profileId));
  if (idx < 0) return;

  const normalized = ensureJourney(profiles[idx]);
  const journey: StartupJourney = normalized.journey;

  const stage = journey.stages[stageId];
  stage.tasks = (stage.tasks || []).map((t) => (t.id === taskId ? { ...t, done, updatedAt: nowIso() } : t));
  stage.lastUpdatedAt = nowIso();

  if (computeCompletion(journey, stageId) > 0 && stage.status === 'available') {
    stage.status = 'in_progress';
  }

  if (isStageCompleted(journey, stageId)) {
    stage.status = 'completed';
    const ns = nextStage(stageId);
    if (ns) {
      if (journey.stages[ns].status === 'locked') {
        journey.stages[ns].status = 'available';
      }
      journey.currentStage = ns;
    }
  }

  const updatedProfile = { ...normalized, journey };
  profiles[idx] = updatedProfile;
  writeCreatedProfiles(profiles);

  if (updatedProfile?.id && typeof updatedProfile?.id === 'string' && !String(updatedProfile.id).startsWith('profile-')) {
    try {
      await updateStartup(updatedProfile.id, { journey: updatedProfile.journey });
    } catch {
      // ignore
    }
  }
};

export const canAccessStage = (journey: StartupJourney, stageId: StageId): boolean => {
  const status = journey?.stages?.[stageId]?.status;
  return status !== 'locked';
};

export const getCompletionPercent = (journey: StartupJourney, stageId: StageId): number => computeCompletion(journey, stageId);
