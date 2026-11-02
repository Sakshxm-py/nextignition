import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createNotification } from './notificationController';
import { io } from '../utils/socket';
import crypto from 'crypto';
import { uploadPublicFile } from '../utils/storage';
import { getBlockedUserIds } from '../utils/blocks';
import { containsProfanity } from '../utils/contentFilter';

const withId = <T extends Record<string, any>>(obj: T) => {
  const id = obj?.id ?? obj?._id;
  return { ...obj, _id: id };
};

// Single source of truth for community membership/visibility. Centralised so the
// read and write paths can't drift apart (which is how force-join-on-read and
// missing membership checks crept in).
const getCommunityAccess = (commData: any, userId?: string) => {
  const settings = commData?.settings || {};
  const openJoin =
    String(settings.visibility || 'public') === 'public' &&
    String(settings.joinPolicy || 'open') === 'open';
  const members: string[] = Array.isArray(commData?.members) ? commData.members.map(String) : [];
  const admins: string[] = Array.isArray(commData?.admins) ? commData.admins.map(String) : [];
  const uid = userId ? String(userId) : undefined;
  const isAdmin = !!uid && (admins.includes(uid) || String(commData?.creator) === uid);
  const isMember = !!uid && (isAdmin || members.includes(uid));
  return { openJoin, isMember, isAdmin };
};

// The canonical set of communities. These are the ONLY communities that should
// exist on the platform. getCommunities() ensures each one exists and removes
// any community whose name is not in this list. Order here = display order.
const CANONICAL_COMMUNITIES: { name: string; description: string }[] = [
  {
    name: 'Next Ignition Founder Lounge',
    description:
      'The central hub for all Next Ignition members. Connect with founders, builders, experts, and startup enthusiasts from around the world. Share updates, ask questions, discuss ideas, celebrate wins, and grow together in a startup-focused ecosystem.',
  },
  {
    name: 'Startup Feedback & Validation',
    description:
      'Got a startup idea, MVP, landing page, pitch deck, or business model? Share it here and receive honest feedback from founders, experts, and potential users. Validate faster, avoid costly mistakes, and improve your chances of success.',
  },
  {
    name: 'Fundraising & Investor Talk',
    description:
      'Everything related to startup funding and investment. Discuss fundraising strategies, investor expectations, pitch deck reviews, term sheets, grants, accelerators, and startup finance. Learn from experienced founders and industry experts.',
  },
  {
    name: 'Build & Growth',
    description:
      'A community focused on execution and scaling. Discuss product development, MVP building, marketing, sales, growth hacking, AI tools, automation, hiring, operations, and strategies to grow startups efficiently.',
  },
  {
    name: 'Events, Podcasts & Opportunities',
    description:
      'Discover startup events, webinars, workshops, podcasts, networking sessions, hackathons, accelerator programs, grants, partnerships, job opportunities, and other valuable resources to help you grow personally and professionally.',
  },
];


const ensureDefaultChannels = async (communityId: string, creatorId: string) => {
  const { data: existing, error: channelError } = await supabase
    .from('channels')
    .select('id, data')
    .eq('data->>communityId', communityId);

  if (channelError) {
    console.error('Error checking existing channels:', channelError);
    return;
  }
  if (existing && existing.length > 0) return;

  const now = new Date().toISOString();
  const mkId = () => crypto.randomUUID();
  const defaults = [
    {
      id: mkId(),
      data: {
        id: '',
        name: 'general',
        type: 'text',
        description: 'General discussion',
        communityId,
        creator: creatorId,
        visibility: 'public',
        members: [],
        pendingMembers: [],
        createdAt: now,
      },
    },
    {
      id: mkId(),
      data: {
        id: '',
        name: 'voice-lounge',
        type: 'voice',
        description: 'Hop in to talk live',
        communityId,
        creator: creatorId,
        visibility: 'public',
        members: [],
        pendingMembers: [],
        createdAt: now,
      },
    },
  ];

  for (const row of defaults) {
    row.data.id = row.id;
    const { error: insErr } = await supabase.from('channels').insert([{ id: row.id, data: row.data }]);
    if (insErr) {
        console.error(`[ensureDefaultChannels] Error inserting channel ${row.data.name}:`, insErr);
    }
  }
};



const isDemoName = (name: any) => String(name || '').toLowerCase().includes('demo');

const hydrateMessagesWithUsers = async (messages: any[]) => {
  const senderIds = Array.from(
    new Set(
      messages
        .map((m) => String(m?.userId?._id || m?.userId?.id || m?.sender || ''))
        .filter(Boolean)
    )
  );

  if (!senderIds.length) return messages;

  const { data: users, error: fetchErr } = await supabase.from('users').select('id, data').in('id', senderIds);
  if (fetchErr) {
      console.error('[hydrateMessagesWithUsers] fetch users error:', fetchErr);
  }
  const userMap = new Map<string, any>((users || []).map((u: any) => [String(u.id), u.data]));

  return messages.map((m) => {
    const id = String(m?.userId?._id || m?.userId?.id || m?.sender || '');
    const u = userMap.get(id);
    if (!u) return m;
    return {
      ...m,
      sender: m.sender || id,
      userId: {
        _id: id,
        name: u.name || 'User',
        role: u.role || '',
        avatar: u.avatar || '',
      },
    };
  });
};

// Hard-delete a community and all of its dependent rows (channels, messages,
// invites) in FK-safe order. Used to purge non-canonical communities.
const purgeCommunity = async (communityId: string) => {
  const { data: channels } = await supabase
    .from('channels')
    .select('id')
    .eq('data->>communityId', communityId);
  const channelIds = (channels || []).map((c: any) => c.id);
  if (channelIds.length > 0) {
    await supabase.from('community_messages').delete().in('data->>channelId', channelIds);
    await supabase.from('channels').delete().in('id', channelIds);
  }
  await supabase.from('community_invites').delete().eq('data->>communityId', communityId);
  await supabase.from('communities').delete().eq('id', communityId);
};

export const getCommunities = async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase.from('communities').select('id, data').order('created_at', { ascending: false });
    if (error) throw error;

    let communities = (data || []).map((row: any) => {
      const payload = row?.data || {};
      const id = payload?.id || row?.id;
      return withId({ ...payload, id });
    });

    // Enforce the canonical set: hard-delete any community whose name is not in
    // CANONICAL_COMMUNITIES (and all of its dependent data). This keeps the
    // platform to exactly the five intended communities and self-heals if a
    // stray community is ever (re)introduced.
    const canonicalNames = new Set(CANONICAL_COMMUNITIES.map((c) => c.name));
    const strays = communities.filter((c: any) => !canonicalNames.has(c.name));
    for (const stray of strays) {
      await purgeCommunity(stray.id);
    }
    communities = communities.filter((c: any) => canonicalNames.has(c.name));

    // Ensure every canonical community exists; create any that are missing.
    for (const canonical of CANONICAL_COMMUNITIES) {
      if (communities.some((c: any) => c.name === canonical.name)) continue;
      const id = crypto.randomUUID();
      const comm = {
        id,
        name: canonical.name,
        description: canonical.description,
        members: [],
        memberCount: 0,
        settings: { visibility: 'public', joinPolicy: 'open' },
        createdAt: new Date().toISOString(),
        creator: 'system',
      };
      await supabase.from('communities').insert([{ id, data: comm }]);
      await ensureDefaultChannels(id, 'system');
      communities.push(withId(comm));
    }

    // Return canonical communities in listed order.
    const rank = (name: string) => {
      const i = CANONICAL_COMMUNITIES.findIndex((c) => c.name === name);
      return i === -1 ? CANONICAL_COMMUNITIES.length : i;
    };
    communities.sort((a: any, b: any) => rank(a.name) - rank(b.name));

    res.json(communities);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch communities' }); }
};

export const createCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const requestedName = String(req.body?.name || '').trim();
    if (!requestedName) {
      return res.status(400).json({ message: 'Community name is required' });
    }
    // A canonical community is system-owned (getCommunities treats it as such).
    // Re-creating one with the same name would hand the caller creator/admin
    // rights over a core community — block it (case-insensitive).
    const canonicalNames = new Set(CANONICAL_COMMUNITIES.map((c) => c.name.toLowerCase()));
    if (canonicalNames.has(requestedName.toLowerCase())) {
      return res.status(409).json({ message: 'A community with this name already exists' });
    }
    const id = crypto.randomUUID();
    const communityData = {
      id,
      ...req.body,
      creator: req.user.id,
      admins: [req.user.id],
      createdAt: new Date().toISOString(),
      members: [req.user.id],
      memberCount: 1,
      settings: {
        visibility: 'public',
        joinPolicy: 'open',
      },
    };
    await supabase.from('communities').insert([{ id, data: communityData }]);
    await ensureDefaultChannels(id, req.user.id);
    res.status(201).json(withId(communityData));
  } catch (error) { res.status(500).json({ message: 'Failed to create community' }); }
};

export const deleteCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req.params;
    const { data: commRow, error: fetchErr } = await supabase.from('communities').select('id, data').eq('id', communityId).single();
    if (fetchErr || !commRow) return res.status(404).json({ message: 'Community not found' });

    const isCreator = String(commRow.data.creator) === String(req.user.id);
    const isAdmin = (commRow.data.admins || []).map(String).includes(String(req.user.id));
    if (!isCreator && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the community creator can delete it' });
    }

    // Delete related channels and messages
    const { data: channels } = await supabase.from('channels').select('id').eq('data->>communityId', communityId);
    if (channels && channels.length > 0) {
      const channelIds = channels.map((c: any) => c.id);
      await supabase.from('community_messages').delete().in('data->>channelId', channelIds);
      await supabase.from('channels').delete().in('id', channelIds);
    }

    await supabase.from('communities').delete().eq('id', communityId);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ message: 'Failed to delete community' }); }
};

export const sendCommunityInvite = async (req: AuthRequest, res: Response) => {
  try {
    const communityId = req.params.communityId || req.body.communityId;
    const targetUserId = req.body.targetUserId;
    if (!communityId || !targetUserId) {
      return res.status(400).json({ message: 'communityId and targetUserId are required' });
    }
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', communityId).single();
    if (commRow) {
      // Any member (or admin) of the community can invite others — no chat required.
      const isAdmin = commRow.data.admins?.includes(req.user.id) || commRow.data.creator === req.user.id;
      const isMember = (commRow.data.members || []).includes(req.user.id);
      if (!isAdmin && !isMember && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Join this community before inviting others to it.' });
      }

      const id = crypto.randomUUID();
      const inviteData = { id, communityId, inviter: req.user.id, targetUser: targetUserId, status: 'pending', createdAt: new Date().toISOString() };
      await supabase.from('community_invites').insert([{ id, data: inviteData }]);

      await createNotification(targetUserId, 'community_invite', 'Community Invite', `You've been invited to join ${commRow.data.name}`, `/communities/${communityId}`, req.user.id, { communityId, inviteId: id });
      res.json({ ok: true, inviteId: id });
    } else {
      res.status(404).json({ message: 'Community not found' });
    }
  } catch (error) { res.status(500).json({ message: 'Failed to send invite' }); }
};

export const respondToCommunityInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteId, response } = req.body;
    const { data: invRow } = await supabase.from('community_invites').select('id, data').eq('id', inviteId).single();
    if (!invRow || invRow.data.targetUser !== req.user.id) return res.status(404).json({ message: 'Invite not found' });

    if (response === 'accept') {
      const { data: commRow } = await supabase.from('communities').select('id, data').eq('id', invRow.data.communityId).single();
      if (commRow) {
        const comm = { ...commRow.data, members: [...(commRow.data.members || []), req.user.id], memberCount: (commRow.data.memberCount || 0) + 1 };
        await supabase.from('communities').update({ data: comm }).eq('id', invRow.data.communityId);
      }
    }
    await supabase.from('community_invites').update({ data: { ...invRow.data, status: response } }).eq('id', inviteId);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const joinCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const { data: commRow } = await supabase.from('communities').select('id, data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Not found' });
    if (commRow.data.members?.includes(req.user.id)) return res.json(commRow.data);
    const comm = { ...commRow.data, members: [...(commRow.data.members || []), req.user.id], memberCount: (commRow.data.memberCount || 0) + 1 };
    await supabase.from('communities').update({ data: comm }).eq('id', commRow.id);
    res.json(withId(comm));
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const requestJoinCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const { data: commRow } = await supabase.from('communities').select('id, data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Not found' });

    const visibility = String(commRow.data?.settings?.visibility || 'public');
    const joinPolicy = String(commRow.data?.settings?.joinPolicy || 'open');
    // If the community is open/public, we should join immediately (no request flow)
    if (visibility === 'public' && joinPolicy === 'open') {
      if (commRow.data.members?.includes(req.user.id)) return res.json({ ok: true, status: 'member' });
      const comm = {
        ...commRow.data,
        members: [...(commRow.data.members || []), req.user.id],
        memberCount: (commRow.data.memberCount || 0) + 1,
      };
      await supabase.from('communities').update({ data: comm }).eq('id', commRow.id);
      return res.json({ ok: true, status: 'member' });
    }
    
    if (commRow.data.members?.includes(req.user.id)) return res.json({ message: 'Already a member' });
    if (commRow.data.pendingMembers?.includes(req.user.id)) return res.json({ message: 'Request already pending' });

    const comm = { 
      ...commRow.data, 
      pendingMembers: [...(commRow.data.pendingMembers || []), req.user.id] 
    };
    await supabase.from('communities').update({ data: comm }).eq('id', commRow.id);
    res.json({ ok: true, status: 'pending' });
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const handleJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action } = req.body; // action: 'approve' | 'deny'
    const { data: commRow } = await supabase.from('communities').select('id, data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Not found' });

    const isAdmin = commRow.data.admins?.includes(req.user.id) || commRow.data.creator === req.user.id;
    if (!isAdmin) return res.status(403).json({ message: 'Not authorized' });

    const pending = commRow.data.pendingMembers || [];
    if (!pending.includes(userId)) return res.status(404).json({ message: 'No pending request found for this user' });

    const newPending = pending.filter((id: string) => id !== userId);
    let newMembers = commRow.data.members || [];
    let newMemberCount = commRow.data.memberCount || 0;

    if (action === 'approve') {
      if (!newMembers.includes(userId)) {
        newMembers.push(userId);
        newMemberCount++;
      }
    }

    const comm = { 
      ...commRow.data, 
      pendingMembers: newPending,
      members: newMembers,
      memberCount: newMemberCount
    };

    await supabase.from('communities').update({ data: comm }).eq('id', commRow.id);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const toggleMessageBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { data: msgRow } = await supabase.from('community_messages').select('id, data').eq('id', messageId).single();
    if (!msgRow) return res.status(404).json({ message: 'Message not found' });

    const bookmarkedBy: string[] = msgRow.data?.bookmarkedBy || [];
    const userId = req.user.id;
    const isBookmarked = bookmarkedBy.includes(userId);

    const updatedBookmarkedBy = isBookmarked
      ? bookmarkedBy.filter((id: string) => id !== userId)
      : [...bookmarkedBy, userId];

    const updated = {
      ...msgRow.data,
      bookmarkedBy: updatedBookmarkedBy,
      updatedAt: new Date().toISOString()
    };

    await supabase.from('community_messages').update({ data: updated }).eq('id', msgRow.id);
    res.json({ ok: true, isBookmarked: !isBookmarked });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle bookmark' });
  }
};

export const toggleMessageBriefcase = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { data: msgRow } = await supabase.from('community_messages').select('id, data').eq('id', messageId).single();
    if (!msgRow) return res.status(404).json({ message: 'Message not found' });

    const savedBy: string[] = msgRow.data?.savedBy || [];
    const userId = req.user.id;
    const isSaved = savedBy.includes(userId);

    const updatedSavedBy = isSaved
      ? savedBy.filter((id: string) => id !== userId)
      : [...savedBy, userId];

    const updated = {
      ...msgRow.data,
      savedBy: updatedSavedBy,
      updatedAt: new Date().toISOString()
    };

    await supabase.from('community_messages').update({ data: updated }).eq('id', msgRow.id);
    res.json({ ok: true, isSaved: !isSaved });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle briefcase' });
  }
};

export const leaveCommunity = async (req: AuthRequest, res: Response) => {
  try {
    const { data: commRow } = await supabase.from('communities').select('id, data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Not found' });
    const comm = { ...commRow.data, members: commRow.data.members?.filter((m: string) => m !== req.user.id), memberCount: Math.max(0, (commRow.data.memberCount || 1) - 1) };
    await supabase.from('communities').update({ data: comm }).eq('id', commRow.id);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const getCommunityChannels = async (req: AuthRequest, res: Response) => {
  try {
    const communityId = req.params.communityId;
    
    // Check membership
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Community not found' });

    // Reads must NOT mutate membership. Open communities are viewable by any
    // authenticated user; closed ones require existing membership. Actual joining
    // happens via the explicit join endpoints (or on first write).
    const { openJoin, isMember, isAdmin } = getCommunityAccess(commRow.data, req.user?.id);
    if (!isMember && !openJoin) {
      return res.status(403).json({ message: 'Not a member', restricted: true });
    }

    const { data } = await supabase.from('channels').select('data').eq('data->>communityId', communityId);
    const rawChannels = data ? data.map((d: any) => d.data) : [];

    const channels = (rawChannels || []).map((ch: any) => {
      const visibility = String(ch?.visibility || 'public');
      if (visibility !== 'private') {
        return { ...ch, restricted: false };
      }

      const members: string[] = ch?.members || [];
      const pendingMembers: string[] = ch?.pendingMembers || [];
      const canAccess = isAdmin || String(ch?.creator) === String(req.user.id) || members.includes(req.user.id);
      const pending = pendingMembers.includes(req.user.id);
      return {
        ...ch,
        restricted: !canAccess,
        pending,
      };
    });
    if (!channels.length) {
      const creatorId = req.user?.id || 'system';
      await ensureDefaultChannels(String(communityId || ''), String(creatorId || 'system'));
      const { data: after } = await supabase.from('channels').select('data').eq('data->>communityId', communityId);
      const finalChannels = after ? after.map((d: any) => d.data) : [];
      return res.json(finalChannels.map((c: any) => withId(c)));
    }
    res.json(channels.map((c: any) => withId(c)));
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const createCommunityChannel = async (req: AuthRequest, res: Response) => {
  try {
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Community not found' });
    const isAdmin = commRow.data.admins?.includes(req.user.id) || commRow.data.creator === req.user.id;
    if (!isAdmin && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only admins can create channels' });
    }

    const id = crypto.randomUUID();
    const data = {
      id,
      ...req.body,
      communityId: req.params.communityId,
      creator: req.user.id,
      visibility: req.body?.visibility || 'public',
      members: [],
      pendingMembers: [],
      createdAt: new Date().toISOString(),
    };
    await supabase.from('channels').insert([{ id, data }]);
    res.status(201).json(withId(data));
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const requestJoinChannel = async (req: AuthRequest, res: Response) => {
  try {
    const { data: chanRow } = await supabase.from('channels').select('id, data').eq('id', req.params.channelId).single();
    if (!chanRow) return res.status(404).json({ message: 'Channel not found' });

    const channel = chanRow.data;
    const visibility = String(channel?.visibility || 'public');
    if (visibility !== 'private') {
      return res.json({ ok: true, status: 'open' });
    }

    // Must be a member of the community to request a private channel
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', channel.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Community not found' });
    const isMember = commRow.data.members?.includes(req.user.id) || commRow.data.creator === req.user.id || commRow.data.admins?.includes(req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Not a member', restricted: true });

    const members: string[] = channel?.members || [];
    const pendingMembers: string[] = channel?.pendingMembers || [];
    if (members.includes(req.user.id)) return res.json({ ok: true, status: 'member' });
    if (pendingMembers.includes(req.user.id)) return res.json({ ok: true, status: 'pending' });

    const updated = {
      ...channel,
      pendingMembers: [...pendingMembers, req.user.id],
      updatedAt: new Date().toISOString(),
    };

    await supabase.from('channels').update({ data: updated }).eq('id', chanRow.id);
    return res.json({ ok: true, status: 'pending' });
  } catch {
    return res.status(500).json({ message: 'Failed' });
  }
};

export const handleChannelJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action } = req.body as { userId: string; action: 'approve' | 'deny' };

    const { data: chanRow } = await supabase.from('channels').select('id, data').eq('id', req.params.channelId).single();
    if (!chanRow) return res.status(404).json({ message: 'Channel not found' });

    const channel = chanRow.data;
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', channel.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Community not found' });

    const isAdmin = commRow.data.admins?.includes(req.user.id) || commRow.data.creator === req.user.id || String(channel?.creator) === String(req.user.id);
    if (!isAdmin) return res.status(403).json({ message: 'Not authorized' });

    const pending: string[] = channel?.pendingMembers || [];
    if (!pending.includes(userId)) return res.status(404).json({ message: 'No pending request' });

    const newPending = pending.filter((id: string) => id !== userId);
    const members: string[] = channel?.members || [];
    const newMembers = action === 'approve' && !members.includes(userId) ? [...members, userId] : members;

    const updated = {
      ...channel,
      pendingMembers: newPending,
      members: newMembers,
      updatedAt: new Date().toISOString(),
    };

    await supabase.from('channels').update({ data: updated }).eq('id', chanRow.id);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Failed' });
  }
};

export const getChannelMessages = async (req: AuthRequest, res: Response) => {
  try {
    const channelId = req.params.channelId;
    
    // Auth check via community reference
    const { data: chanRow } = await supabase.from('channels').select('data').eq('id', channelId).single();
    if (!chanRow) return res.status(404).json({ message: 'Channel not found' });
    
    const communityId = chanRow.data.communityId;
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', communityId).single();
    
    if (commRow) {
      // Read-only: never join the caller as a side effect of reading messages.
      const { openJoin, isMember, isAdmin } = getCommunityAccess(commRow.data, req.user?.id);
      if (!isMember && !openJoin) return res.status(403).json({ message: 'Not a member', restricted: true });

      const channelVisibility = String(chanRow.data?.visibility || 'public');
      if (channelVisibility === 'private') {
        const members: string[] = chanRow.data?.members || [];
        const canAccess = isAdmin || (req.user?.id && (String(chanRow.data?.creator) === String(req.user.id) || members.map(String).includes(String(req.user.id))));
        if (!canAccess) {
          const pendingMembers: string[] = chanRow.data?.pendingMembers || [];
          const pending = req.user?.id && pendingMembers.map(String).includes(String(req.user.id));
          return res.status(403).json({ message: 'Channel restricted', restricted: true, pending });
        }
      }
    }

    const { data } = await supabase.from('community_messages').select('data').eq('data->>channelId', req.params.channelId).order('created_at', { ascending: true });
    let raw = data ? data.map((d: any) => d.data) : [];
    // Block enforcement: hide messages authored by users in a blocked
    // relationship with the requester (either direction).
    if (req.user?.id) {
      const blockedSet = new Set(await getBlockedUserIds(String(req.user.id)));
      if (blockedSet.size) {
        raw = raw.filter((m: any) => {
          const senderId = String(m?.sender || m?.userId?._id || m?.userId?.id || '');
          return !(senderId && blockedSet.has(senderId));
        });
      }
    }
    const hydrated = await hydrateMessagesWithUsers(raw);
    res.json(hydrated.map((m: any) => withId(m)));
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const sendChannelMessage = async (req: AuthRequest, res: Response) => {
  try {
    // Auth check: must be member of community AND (if private channel) must have access
    const { data: chanRow } = await supabase.from('channels').select('data').eq('id', req.params.channelId).single();
    if (!chanRow) return res.status(404).json({ message: 'Channel not found' });

    const communityId = chanRow.data.communityId;
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', communityId).single();
    if (commRow) {
      let { openJoin, isMember, isAdmin } = getCommunityAccess(commRow.data, req.user.id);
      // Posting is a write — the first post into an open community joins the user
      // here (instead of as a hidden side effect of a GET).
      if (!isMember) {
        if (!openJoin) return res.status(403).json({ message: 'Not a member', restricted: true });
        const next = {
          ...commRow.data,
          members: [...(commRow.data.members || []), req.user.id],
          memberCount: (commRow.data.memberCount || 0) + 1,
        };
        await supabase.from('communities').update({ data: next }).eq('id', communityId);
        commRow.data = next;
        isMember = true;
      }

      const channelVisibility = String(chanRow.data?.visibility || 'public');
      if (channelVisibility === 'private') {
        const members: string[] = chanRow.data?.members || [];
        const canAccess = isAdmin || String(chanRow.data?.creator) === String(req.user.id) || members.map(String).includes(String(req.user.id));
        if (!canAccess) {
          const pendingMembers: string[] = chanRow.data?.pendingMembers || [];
          const pending = pendingMembers.map(String).includes(String(req.user.id));
          return res.status(403).json({ message: 'Channel restricted', restricted: true, pending });
        }
      }
    }

    // Content filter: reject community messages containing prohibited language.
    if (containsProfanity(String(req.body?.content || ''))) {
      return res.status(400).json({ message: 'Your message contains language that violates our community guidelines.' });
    }

    const id = crypto.randomUUID();
    const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
    const u = userRow?.data;
    const messageData = {
      id,
      channelId: req.params.channelId,
      sender: req.user.id,
      userId: {
        _id: req.user.id,
        name: u?.name || 'User',
        role: u?.role || '',
        avatar: u?.avatar || '',
      },
      pinned: false,
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    await supabase.from('community_messages').insert([{ id, data: messageData }]);

    // Process mentions and notify users
    const content = String(req.body.content || '');
    if (content.includes('@') && commRow?.data?.members?.length) {
      const { data: memberUsers } = await supabase.from('users').select('id, data').in('id', commRow.data.members);
      if (memberUsers) {
        for (const member of memberUsers) {
          const userName = member.data?.name;
          if (userName && content.includes(`@${userName}`) && member.id !== req.user.id) {
            await createNotification(
              member.id,
              'community_mention',
              `Mentioned in #${chanRow.data.name}`,
              `${u?.name || 'Someone'} mentioned you: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`,
              `#community-chat/${communityId}?channel=${req.params.channelId}&message=${id}`,
              req.user.id,
              { communityId, channelId: req.params.channelId, messageId: id }
            );
          }
        }
      }
    }

    io.to(`channel_${req.params.channelId}`).emit('new_channel_message', messageData);
    res.status(201).json(withId(messageData));
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const sendChannelAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { data: chanRow } = await supabase.from('channels').select('data').eq('id', req.params.channelId).single();
    if (!chanRow) return res.status(404).json({ message: 'Channel not found' });

    const communityId = chanRow.data.communityId;
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', communityId).single();
    if (commRow) {
      const { openJoin, isMember } = getCommunityAccess(commRow.data, req.user.id);
      if (!isMember) {
        if (!openJoin) return res.status(403).json({ message: 'Not a member', restricted: true });
        const next = {
          ...commRow.data,
          members: [...(commRow.data.members || []), req.user.id],
          memberCount: (commRow.data.memberCount || 0) + 1,
        };
        await supabase.from('communities').update({ data: next }).eq('id', communityId);
        commRow.data = next;
      }
    }

    const files = (req as any).files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ message: 'No files uploaded' });

    const attachments = [] as { url: string; originalName: string; mimeType: string; size?: number; path?: string; bucket?: string }[];
    for (const f of files) {
      const ext = f.originalname.split('.').pop() || 'bin';
      const objectPath = `community_attachments/${communityId}/${req.params.channelId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
      const uploaded = await uploadPublicFile({
        bucket: 'chat-attachments',
        objectPath,
        buffer: f.buffer,
        contentType: f.mimetype,
      });
      attachments.push({
        url: uploaded.publicUrl,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        path: uploaded.path,
        bucket: uploaded.bucket,
      });
    }

    const id = crypto.randomUUID();
    const { data: userRow } = await supabase.from('users').select('data').eq('id', req.user.id).single();
    const u = userRow?.data;
    
    // Determine type (if it's an audio recording, the frontend sends type='audio' via formData)
    const type = req.body.type || 'attachment';

    const messageData = {
      id,
      channelId: req.params.channelId,
      sender: req.user.id,
      userId: {
        _id: req.user.id,
        name: u?.name || 'User',
        role: u?.role || '',
        avatar: u?.avatar || '',
      },
      pinned: false,
      content: req.body.type === 'audio' ? 'Sent a voice message' : `Sent ${files.length} attachment(s)`,
      type,
      metadata: { attachments },
      createdAt: new Date().toISOString(),
    };
    await supabase.from('community_messages').insert([{ id, data: messageData }]);

    io.to(`channel_${req.params.channelId}`).emit('new_channel_message', messageData);
    res.status(201).json(withId(messageData));
  } catch (error) { 
    console.error('sendChannelAttachment error:', error);
    res.status(500).json({ message: 'Failed' }); 
  }
};

export const getCommunityMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { data: commRow } = await supabase.from('communities').select('data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Not found' });

    // The roster (names, avatars, roles of fellow members) is member-only. Open
    // communities expose it to any authenticated user; closed ones to members.
    const { openJoin, isMember } = getCommunityAccess(commRow.data, req.user?.id);
    if (!isMember && !openJoin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Not a member' });
    }

    const { data: users } = await supabase.from('users').select('id, data').in('id', commRow.data.members || []);
    // Project a safe whitelist only — never spread the full user record (it holds
    // email, phone, auth fields, etc.); blanking `password` alone is not enough.
    res.json(users ? users.map((u: any) => {
      const id = u.data?.id || u.id;
      return {
        _id: id,
        id,
        name: u.data?.name || 'User',
        avatar: u.data?.avatar || '',
        role: u.data?.role || '',
        headline: u.data?.headline || '',
      };
    }) : []);
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
};

export const getPinnedMessages = async (req: Request, res: Response) => {
  try {
    const { data } = await supabase
      .from('community_messages')
      .select('data')
      .eq('data->>channelId', req.params.channelId);

    const pinned = (data ? data.map((d: any) => d.data) : []).filter((m: any) => !!m?.pinned);
    const hydrated = await hydrateMessagesWithUsers(pinned);
    res.json(hydrated.map((m: any) => withId(m)));
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

export const togglePinMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { data: msgRow } = await supabase.from('community_messages').select('id, data').eq('id', req.params.messageId).single();
    if (!msgRow) return res.status(404).json({ message: 'Not found' });

    // Pinning is a moderation action — restrict to community/channel admins.
    const { data: chanRow } = await supabase.from('channels').select('data').eq('id', msgRow.data.channelId).single();
    const { data: commRow } = chanRow?.data?.communityId
      ? await supabase.from('communities').select('data').eq('id', chanRow.data.communityId).single()
      : { data: null };
    const { isAdmin } = getCommunityAccess(commRow?.data, req.user?.id);
    const isChannelCreator = !!chanRow && String(chanRow.data?.creator) === String(req.user?.id);
    if (!isAdmin && !isChannelCreator && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to pin messages' });
    }

    const updated = { ...msgRow.data, pinned: !msgRow.data?.pinned, updatedAt: new Date().toISOString() };
    await supabase.from('community_messages').update({ data: updated }).eq('id', msgRow.id);
    const hydrated = (await hydrateMessagesWithUsers([updated]))[0] || updated;
    res.json(withId(hydrated));
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

export const getCommunitySettings = async (req: AuthRequest, res: Response) => {
  try {
    const { data: commRow } = await supabase.from('communities').select('id, data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Not found' });
    res.json({ settings: commRow.data?.settings || {}, admins: commRow.data?.admins || [], creator: commRow.data?.creator });
  } catch {
    res.status(500).json({ message: 'Failed' });
  }
};

export const updateCommunitySettings = async (req: AuthRequest, res: Response) => {
  try {
    const { data: commRow } = await supabase.from('communities').select('id, data').eq('id', req.params.communityId).single();
    if (!commRow) return res.status(404).json({ message: 'Not found' });

    const admins: string[] = commRow.data?.admins || [];
    const isAdmin = String(commRow.data?.creator) === String(req.user.id) || admins.includes(req.user.id);
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const nextSettings = { ...(commRow.data?.settings || {}), ...(req.body?.settings || {}) };
    const updated = { ...commRow.data, settings: nextSettings, updatedAt: new Date().toISOString() };
    await supabase.from('communities').update({ data: updated }).eq('id', commRow.id);
    res.json(withId(updated));
  } catch {
    res.status(500).json({ message: 'Failed' });
  }
};
export const deleteCommunityMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    
    // Get the message first
    const { data: msgRow, error: findErr } = await supabase
      .from('community_messages')
      .select('data')
      .eq('id', messageId)
      .single();
      
    if (findErr || !msgRow) return res.status(404).json({ message: 'Message not found' });
    
    // Simple temporary auth: Only let the author delete it
    const isAuthor = msgRow.data.sender === req.user.id || 
                     msgRow.data.userId?._id === req.user.id || 
                     msgRow.data.userId?.id === req.user.id;
                     
    if (!isAuthor) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    const { error } = await supabase.from('community_messages').delete().eq('id', messageId);
    if (error) throw error;
    
    // Broadcast delete event
    io.to(`community:${msgRow.data.communityId}`).emit('message_deleted', { 
      channelId: msgRow.data.channelId, 
      messageId 
    });
    
    res.json({ success: true, messageId });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};
