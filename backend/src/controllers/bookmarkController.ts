import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

/**
 * Toggles a profile bookmark/save using the existing 'saved_items' table.
 */
export const toggleProfileBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const targetUserId = req.params.targetUserId;
    const { targetType } = req.body; // 'founder', 'investor', 'expert', etc.

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });

    // Check if it exists in saved_items
    const { data: existing, error: checkErr } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', targetUserId)
      .eq('item_type', 'profile')
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      // Remove it
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('item_id', targetUserId)
        .eq('item_type', 'profile');
      if (error) throw error;
      return res.json({ saved: false, message: 'Bookmark removed' });
    } else {
      // Add it
      const { error } = await supabase
        .from('saved_items')
        .insert([{
          user_id: userId,
          item_id: targetUserId,
          item_type: 'profile',
          created_at: new Date().toISOString()
        }]);
      if (error) throw error;
      return res.json({ saved: true, message: 'Profile saved' });
    }
  } catch (error: any) {
    console.error('Error in toggleProfileBookmark:', error);
    return res.status(500).json({ message: 'Failed to toggle bookmark', error: error.message });
  }
};

/**
 * Toggles a startup bookmark/save.
 */
export const toggleStartupBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const startupId = req.params.startupId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!startupId) return res.status(400).json({ message: 'startupId is required' });

    // Check if it exists in saved_items
    const { data: existing, error: checkErr } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', startupId)
      .eq('item_type', 'startup')
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      // Remove it
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('item_id', startupId)
        .eq('item_type', 'startup');
      if (error) throw error;
      return res.json({ saved: false, message: 'Startup removed from saved' });
    } else {
      // Add it
      const { error } = await supabase
        .from('saved_items')
        .insert([{
          user_id: userId,
          item_id: startupId,
          item_type: 'startup',
          created_at: new Date().toISOString()
        }]);
      if (error) throw error;
      return res.json({ saved: true, message: 'Startup saved' });
    }
  } catch (error: any) {
    console.error('Error in toggleStartupBookmark:', error);
    return res.status(500).json({ message: 'Failed to toggle startup bookmark', error: error.message });
  }
};

/**
 * Fetches all bookmarked profiles for the current user.
 */
export const getSavedProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch saved profiles
    const { data: savedRows, error: sError } = await supabase
      .from('saved_items')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_type', 'profile');

    if (sError) throw sError;
    if (!savedRows || savedRows.length === 0) return res.json([]);

    const targetIds = savedRows.map(r => r.item_id);

    // Fetch user details. Data is stored in the 'data' JSONB column.
    const { data: userRows, error: uError } = await supabase
      .from('users')
      .select('id, data')
      .in('id', targetIds);

    if (uError) throw uError;

    // Map user data to a flatter structure for the frontend
    const profiles = (userRows || []).map(row => {
      const u = row.data || {};
      return {
        id: row.id,
        name: u.name || 'User',
        avatar: u.avatar || u.profile?.avatar || '',
        role: u.role || 'Member',
        isVerified: !!u.isVerified,
        bio: u.bio || '',
        location: u.location || u.profile?.location || '',
        startupName: u.startupName || '',
        profile: u.profile || {}
      };
    });

    return res.json(profiles);
  } catch (error: any) {
    console.error('Error in getSavedProfiles:', error);
    return res.status(500).json({ message: 'Failed to fetch saved profiles', error: error.message });
  }
};

/**
 * Fetches all bookmarked startups for the current user.
 */
export const getSavedStartups = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { data: savedRows, error: sError } = await supabase
      .from('saved_items')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_type', 'startup');

    if (sError) throw sError;

    // Also include startups bookmarked from the Funding Portal (stored in the
    // separate funding_bookmarks table) so both saved lists surface here.
    const { data: fundingRows } = await supabase
      .from('funding_bookmarks')
      .select('data')
      .eq('data->>investor', userId);

    const targetIds = [...new Set([
      ...(savedRows || []).map(r => r.item_id),
      ...(fundingRows || []).map((r: any) => r.data?.startup).filter(Boolean),
    ])];

    if (targetIds.length === 0) return res.json([]);

    // Fetch startup details
    const { data: startupRows, error: stError } = await supabase
      .from('startups')
      .select('id, data')
      .in('id', targetIds);

    if (stError) throw stError;

    // Populate founder names for each startup
    const startups = startupRows || [];
    const founderIds = [...new Set(startups.map((d: any) => d.data.founder).filter(Boolean))];
    const { data: users, error: usersError } = await supabase.from('users').select('id, data').in('id', founderIds);
    const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u.data]));

    const results = startups.map((row: any) => {
      const s = row.data;
      const founder = userMap[s.founder];
      const industry = Array.isArray(s.industry) 
        ? s.industry 
        : (typeof s.industry === 'string' ? [s.industry] : []);

      return {
        ...s,
        industry,
        id: row.id,
        founder: founder ? {
          id: s.founder,
          name: founder.name || 'Founder',
          avatar: founder.avatar || '',
          verified: !!founder.isVerified
        } : { id: s.founder, name: 'Founder' }
      };
    });

    return res.json(results);
  } catch (error: any) {
    console.error('Error in getSavedStartups:', error);
    return res.status(500).json({ message: 'Failed to fetch saved startups', error: error.message });
  }
};

/**
 * Checks if a specific profile is bookmarked.
 */
export const checkBookmarkStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const targetUserId = req.params.targetUserId;
    if (!userId || !targetUserId) return res.status(200).json({ isSaved: false });

    const { data, error } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', targetUserId)
      .eq('item_type', 'profile')
      .maybeSingle();

    return res.json({ isSaved: !!data && !error });
  } catch {
    return res.json({ isSaved: false });
  }
};

/**
 * Checks if a specific startup is bookmarked.
 */
export const checkStartupBookmarkStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const startupId = req.params.startupId;
    if (!userId || !startupId) return res.status(200).json({ isSaved: false });

    const { data, error } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', startupId)
      .eq('item_type', 'startup')
      .maybeSingle();

    return res.json({ isSaved: !!data && !error });
  } catch {
    return res.json({ isSaved: false });
  }
};
