import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    const otherId = req.params.userId as string;

    if (!me) return res.status(401).json({ message: 'Unauthorized' });
    if (!otherId) return res.status(400).json({ message: 'userId is required' });
    if (String(me) === String(otherId)) return res.status(400).json({ message: 'Cannot follow yourself' });

    const { data: other } = await supabase.from('users').select('id').eq('id', otherId).single();
    if (!other) return res.status(404).json({ message: 'User not found' });

    const id = `${me}_${otherId}`;
    const { error: upsertErr } = await supabase.from('follows').upsert([{ id, data: { follower: me, following: otherId } }]);
    if (upsertErr) {
      console.error('followUser upsert failed:', upsertErr);
      return res.status(500).json({ message: 'Failed to follow user', error: upsertErr.message });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to follow user', error: error?.message });
  }
};

/** Returns true if a and b follow EACH OTHER (mutual). */
export const areMutualFollowers = async (a: string, b: string): Promise<boolean> => {
  if (!a || !b) return false;
  const { data } = await supabase
    .from('follows')
    .select('id')
    .in('id', [`${a}_${b}`, `${b}_${a}`]);
  return (data?.length || 0) >= 2;
};

/** Returns true if `follower` follows `following` (one-directional). */
export const isFollowing = async (follower: string, following: string): Promise<boolean> => {
  if (!follower || !following) return false;
  if (String(follower) === String(following)) return true; // a user always "sees" their own content
  const { data } = await supabase.from('follows').select('id').eq('id', `${follower}_${following}`).maybeSingle();
  return !!data;
};

/** Returns the list of user ids that follow `userId`. */
export const getFollowerIds = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const { data } = await supabase.from('follows').select('data').eq('data->>following', userId);
  return (data || []).map((r: any) => r.data?.follower).filter(Boolean);
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    const otherId = req.params.userId as string;

    if (!me) return res.status(401).json({ message: 'Unauthorized' });
    if (!otherId) return res.status(400).json({ message: 'userId is required' });

    await supabase.from('follows').delete().eq('id', `${me}_${otherId}`);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to unfollow user', error: error?.message });
  }
};

export const getMyFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    if (!me) return res.status(401).json({ message: 'Unauthorized' });

    const { data, error } = await supabase.from('follows').select('data').eq('data->>follower', me);
    if (error) throw error;

    return res.json({ followingUserIds: data.map(r => r.data.following) });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch following', error: error?.message });
  }
};

/** Users who follow the current user. */
export const getMyFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    if (!me) return res.status(401).json({ message: 'Unauthorized' });

    const { data, error } = await supabase.from('follows').select('data').eq('data->>following', me);
    if (error) throw error;

    return res.json({ followerUserIds: data.map(r => r.data.follower) });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch followers', error: error?.message });
  }
};

/** Follower/following counts for any user (used on profile pages). */
export const getFollowCounts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('data->>following', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('data->>follower', userId),
    ]);

    return res.json({ followers: followers || 0, following: following || 0 });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch follow counts', error: error?.message });
  }
};

/** Relationship between the current user and another user. */
export const getFollowStatus = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    const otherId = req.params.userId as string;
    if (!me) return res.status(401).json({ message: 'Unauthorized' });
    if (!otherId) return res.status(400).json({ message: 'userId is required' });

    const { data } = await supabase
      .from('follows')
      .select('id')
      .in('id', [`${me}_${otherId}`, `${otherId}_${me}`]);

    const ids = new Set((data || []).map((r: any) => r.id));
    const isFollowing = ids.has(`${me}_${otherId}`);
    const isFollowedBy = ids.has(`${otherId}_${me}`);

    return res.json({ isFollowing, isFollowedBy, isMutual: isFollowing && isFollowedBy });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch follow status', error: error?.message });
  }
};
