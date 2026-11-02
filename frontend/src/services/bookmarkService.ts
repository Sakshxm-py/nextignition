import api from './api';

export interface BookmarkedProfile {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  isVerified?: boolean;
  profile?: {
    bio?: string;
    location?: string;
    skills?: string[];
    highlights?: string[];
  };
  bio?: string;
  location?: string;
  startupName?: string;
}

/**
 * Toggles a bookmark for a user profile.
 * @param targetUserId The ID of the user to bookmark/unbookmark.
 * @param targetType The role/type of the user (e.g., 'founder', 'investor', 'expert').
 * @returns Object with { saved: boolean } indicating the new state.
 */
export const toggleProfileBookmark = async (targetUserId: string, targetType?: string) => {
  const response = await api.post(`/bookmarks/toggle/${targetUserId}`, { targetType });
  return response.data;
};

/**
 * Checks the bookmark status for a specific user profile.
 * @param targetUserId The ID of the user to check.
 */
export const checkProfileBookmarkStatus = async (targetUserId: string) => {
  const response = await api.get(`/bookmarks/status/${targetUserId}`);
  return response.data.isSaved;
};

/**
 * Fetches all bookmarked profiles for the current user.
 */
export const getSavedProfiles = async (): Promise<BookmarkedProfile[]> => {
  const response = await api.get('/bookmarks');
  return response.data;
};
