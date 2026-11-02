import api from './api';

// LinkedIn-style account engagement: profile views, post impressions,
// search appearances + follower growth. See backend engagementController.

export interface EngagementMetric {
  count: number;
  prevCount: number;
  trendPct: number;
}

export interface EngagementViewer {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  viewedAt: string | null;
}

export interface MyEngagement {
  periodDays: number;
  profileViews: EngagementMetric;
  postImpressions: EngagementMetric;
  searchAppearances: EngagementMetric;
  followers: { total: number; newThisPeriod: number; prevPeriod: number; trendPct: number };
  recentViewers: EngagementViewer[];
  totalViewers: number;
}

/** Aggregated engagement for the current user. Returns null on failure. */
export const getMyEngagement = async (): Promise<MyEngagement | null> => {
  try {
    const res = await api.get('/engagement/me');
    return res.data as MyEngagement;
  } catch {
    return null;
  }
};

/** Report posts that were seen in the feed. Fire-and-forget. */
export const recordImpressions = (postIds: string[]): void => {
  const ids = (postIds || []).filter(Boolean);
  if (ids.length === 0) return;
  api.post('/engagement/impressions', { postIds: ids }).catch(() => {});
};

/** Report profiles that appeared in a search/discover result list. Fire-and-forget. */
export const recordSearchAppearances = (userIds: string[]): void => {
  const ids = (userIds || []).map((x) => String(x)).filter(Boolean);
  if (ids.length === 0) return;
  api.post('/engagement/search-appearances', { userIds: ids }).catch(() => {});
};

/** Explicitly record a profile view (server also records this on GET /auth/profile/:id). */
export const recordProfileView = (userId: string): void => {
  if (!userId) return;
  api.post(`/engagement/profile-view/${userId}`).catch(() => {});
};
