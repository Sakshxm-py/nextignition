import { supabase } from './supabase';

/**
 * Return the ids of all users in a blocked relationship with `userId` in EITHER
 * direction — i.e. users that `userId` has blocked, plus users that have blocked
 * `userId`. A block is mutual for the purposes of interaction: if A blocked B or
 * B blocked A, they should not be able to see or contact each other.
 *
 * The `user_blocks` table stores each block as a JSON `data` column with
 * `data.blocker` / `data.blocked` string ids (and a composite `id` of
 * `${blocker}_${blocked}`). This matches the writer in userController.blockUser.
 */
export const getBlockedUserIds = async (userId: string): Promise<string[]> => {
  const id = String(userId || '');
  if (!id) return [];

  const ids = new Set<string>();

  // Users that `userId` has blocked.
  const { data: blockedByMe } = await supabase
    .from('user_blocks')
    .select('data')
    .eq('data->>blocker', id);
  (blockedByMe || []).forEach((row: any) => {
    const other = String(row?.data?.blocked || '');
    if (other) ids.add(other);
  });

  // Users that have blocked `userId`.
  const { data: blockedMe } = await supabase
    .from('user_blocks')
    .select('data')
    .eq('data->>blocked', id);
  (blockedMe || []).forEach((row: any) => {
    const other = String(row?.data?.blocker || '');
    if (other) ids.add(other);
  });

  return Array.from(ids);
};

/**
 * True if `a` and `b` are in a blocked relationship in either direction.
 */
export const areBlocked = async (a: string, b: string): Promise<boolean> => {
  const aId = String(a || '');
  const bId = String(b || '');
  if (!aId || !bId) return false;

  const { data } = await supabase
    .from('user_blocks')
    .select('id')
    .in('id', [`${aId}_${bId}`, `${bId}_${aId}`]);
  return (data?.length || 0) > 0;
};
