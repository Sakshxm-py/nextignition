export type StageId = 'ideation' | 'mvp' | 'growth' | 'scaling';

export type StageStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface JourneyTask {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  updatedAt?: string;
  evidence?: unknown;
}

export interface StageProgress {
  status: StageStatus;
  tasks: JourneyTask[];
  lastUpdatedAt?: string;
}

export interface StartupJourney {
  currentStage: StageId;
  stages: Record<StageId, StageProgress>;
}
