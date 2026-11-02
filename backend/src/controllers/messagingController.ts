import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { io } from '../utils/socket';
import { createNotification } from './notificationController';
import { areMutualFollowers } from './followController';
import crypto from 'crypto';
import { uploadPublicFile } from '../utils/storage';
import { stripSensitiveUserFields } from '../utils/sanitizeUser';
import { getBlockedUserIds } from '../utils/blocks';
import { containsProfanity } from '../utils/contentFilter';

const CHAT_ATTACHMENTS_BUCKET = process.env.CHAT_ATTACHMENTS_BUCKET || 'chat-attachments';

const getExtFromFileName = (fileName: string | undefined) => {
  const safe = String(fileName || '').trim();
  const match = safe.match(/\.([a-zA-Z0-9]{1,10})$/);
  return match ? match[1].toLowerCase() : '';
};

const hydrateConversation = async (conv: any) => {
  const participantIds: string[] = Array.isArray(conv?.participants)
    ? conv.participants.map((p: any) => (typeof p === 'string' ? p : p?._id)).filter(Boolean)
    : [];

  if (participantIds.length === 0) {
    return { ...conv, _id: conv?.id || conv?._id };
  }

  const { data: userRows, error: usersError } = await supabase
    .from('users')
    .select('id, data')
    .in('id', participantIds);

  if (usersError) {
    console.error('Error hydrating conversation users:', usersError);
  }

  const byId = new Map<string, any>();
  (userRows || []).forEach((r: any) => {
    const id = String(r?.id || r?.data?.id || '').trim();
    if (!id) return;
    byId.set(id, { _id: id, ...r.data });
  });

  const participants = participantIds.map((id) => byId.get(id) || { _id: id, name: 'User' });

  return {
    ...conv,
    _id: conv?.id || conv?._id,
    participants,
  };
};

export const getOrCreateConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { participants, otherUserId, type = 'direct', metadata } = req.body || {};
    const myId = String(req.user?.id || '').trim();
    if (!myId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const participantList: string[] = Array.isArray(participants)
      ? participants.map((p: any) => String(p).trim()).filter(Boolean)
      : (otherUserId ? [String(otherUserId).trim()].filter(Boolean) : []);

    if (participantList.length === 0) {
      return res.status(400).json({ message: 'participants (array) or otherUserId (string) is required' });
    }

    const allParticipants = [...new Set([...participantList, myId])].sort();
    const id = allParticipants.join('_');

    const { data: existing, error: existingError } = await supabase.from('conversations').select('id, data').eq('id', id).single();
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing conversation:', existingError);
      return res.status(500).json({ message: 'Failed to check conversation' });
    }
    if (existing) {
      const hydrated = await hydrateConversation(existing.data);
      return res.json(hydrated);
    }

    // Security check for direct messages: both users must follow each other.
    if (type === 'direct') {
      const otherId = allParticipants.find(p => p !== myId);
      if (!otherId) {
        return res.status(400).json({ message: 'Direct conversation requires another participant' });
      }

      // Deal-room conversations connect a founder and an interested investor who
      // are already engaged in a deal, so they bypass the mutual-follow gate.
      const isDealRoom = metadata?.source === 'deal_room';
      if (!isDealRoom) {
        const mutual = await areMutualFollowers(myId, otherId);
        if (!mutual) {
          return res.status(403).json({
            code: 'MUTUAL_FOLLOW_REQUIRED',
            message: 'You can only message someone when you both follow each other.',
          });
        }
      }
    }

    const convData = { id, participants: allParticipants, type, metadata, createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString(), unreadCount: {} };
    const { error: insertError } = await supabase.from('conversations').insert([{ id, data: convData }]);
    if (insertError) {
      console.error('Error creating conversation:', insertError);
      return res.status(500).json({ message: 'Failed to create conversation' });
    }
    const hydrated = await hydrateConversation(convData);

    // Notify all participants about the new conversation in real-time
    allParticipants.forEach((pId: string) => {
      io.to(`user_${pId}`).emit('new_conversation', hydrated);
    });

    res.status(201).json(hydrated);
  } catch (error: any) {
    console.error('getOrCreateConversation failed:', error?.response?.data || error?.message || error);
    res.status(500).json({ message: 'Failed to start conversation' });
  }
};

export const getMyConversations = async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase.from('conversations').select('data').filter('data->participants', 'cs', `[ "${req.user.id}" ]`).order('data->>lastMessageAt', { ascending: false });
    if (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ message: 'Failed to fetch conversations' });
    }
    let convs = data ? data.map(d => d.data) : [];
    // Exclude conversations with users in a blocked relationship.
    const blockedIds = await getBlockedUserIds(String(req.user.id));
    if (blockedIds.length) {
      const blockedSet = new Set(blockedIds);
      convs = convs.filter((c: any) => {
        const others = (c?.participants || []).map(String).filter((p: string) => p !== String(req.user.id));
        return !others.some((p: string) => blockedSet.has(p));
      });
    }
    const hydrated = await Promise.all(convs.map((c: any) => hydrateConversation(c)));
    res.json(hydrated);
  } catch (error: any) {
    console.error('getMyConversations failed:', error?.response?.data || error?.message || error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    // Authorization: only participants may read a conversation's messages.
    const { data: convRow } = await supabase.from('conversations').select('data').eq('id', req.params.conversationId).single();
    const participants = (convRow?.data?.participants || []).map(String);
    if (!convRow || !participants.includes(String(req.user.id))) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    // Block enforcement: don't surface messages from a conversation with a
    // user in a blocked relationship with the requester.
    const blockedIds = await getBlockedUserIds(String(req.user.id));
    if (blockedIds.length) {
      const others = participants.filter((p: string) => p !== String(req.user.id));
      if (others.some((p: string) => blockedIds.includes(p))) {
        return res.json([]);
      }
    }
    const { data, error } = await supabase.from('direct_messages').select('data').eq('data->>conversationId', req.params.conversationId).order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
    res.json(data ? data.map(d => d.data) : []);
  } catch (error: any) {
    console.error('getMessages failed:', error?.response?.data || error?.message || error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { content, type = 'text', metadata } = req.body;
    const trimmed = String(content || '').trim();
    if (!trimmed) {
      return res.status(400).json({ message: 'content is required' });
    }
    // Content filter: reject messages containing prohibited language.
    if (containsProfanity(trimmed)) {
      return res.status(400).json({ message: 'Your message contains language that violates our community guidelines.' });
    }
    // Authorization: only participants may post into a conversation.
    const { data: convAuth } = await supabase.from('conversations').select('data').eq('id', req.params.conversationId).single();
    const authParticipants = (convAuth?.data?.participants || []).map(String);
    if (!convAuth || !authParticipants.includes(String(req.user.id))) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    // Block enforcement: refuse if any other participant is in a blocked
    // relationship with the sender (either direction).
    const blockedIds = await getBlockedUserIds(String(req.user.id));
    if (blockedIds.length) {
      const blockedOther = authParticipants.some((pId: string) => pId !== String(req.user.id) && blockedIds.includes(pId));
      if (blockedOther) {
        return res.status(403).json({ message: "You can't message this user." });
      }
    }
    const id = crypto.randomUUID();
    const messageData = { id, conversationId: req.params.conversationId, sender: req.user.id, content: trimmed, type, metadata, createdAt: new Date().toISOString() };

    const { error: insertError } = await supabase.from('direct_messages').insert([{ id, data: messageData }]);
    if (insertError) {
      console.error('Error inserting message:', insertError);
      return res.status(500).json({ message: 'Failed to send message' });
    }

    const { data: convRow, error: convError } = await supabase.from('conversations').select('id, data').eq('id', req.params.conversationId).single();
    if (convError) {
      console.error('Error fetching conversation:', convError);
    }
    if (convRow) {
      const convData = convRow.data;
      const unreadCount = convData.unreadCount || {};

      // Increment unread count for everyone EXCEPT the sender
      (convData.participants || []).forEach((pId: string) => {
        if (pId !== req.user.id) {
          unreadCount[pId] = (unreadCount[pId] || 0) + 1;
        }
      });

      const conv = {
        ...convData,
        lastMessage: { content: trimmed, sender: req.user.id, timestamp: new Date().toISOString() },
        lastMessageAt: new Date().toISOString(),
        unreadCount
      };

      const { error: updateError } = await supabase.from('conversations').update({ data: conv }).eq('id', convRow.id);
      if (updateError) {
        console.error('Error updating conversation:', updateError);
      }

      conv.participants.forEach((pId: string) => {
        if (pId !== req.user.id) io.to(`user_${pId}`).emit('new_direct_message', messageData);
      });
    }
    res.status(201).json(messageData);
  } catch (error: any) {
    console.error('sendMessage failed:', error?.response?.data || error?.message || error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

export const markConversationRead = async (req: AuthRequest, res: Response) => {
  try {
    const { data: convRow, error: convError } = await supabase.from('conversations').select('id, data').eq('id', req.params.conversationId).single();
    if (convError && convError.code !== 'PGRST116') {
      console.error('Error fetching conversation:', convError);
      return res.status(500).json({ message: 'Failed to fetch conversation' });
    }
    if (convRow) {
      const unread = { ...(convRow.data.unreadCount || {}), [req.user.id]: 0 };
      const { error: updateError } = await supabase.from('conversations').update({ data: { ...convRow.data, unreadCount: unread } }).eq('id', convRow.id);
      if (updateError) {
        console.error('Error updating conversation:', updateError);
      }
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('markConversationRead error:', error);
    res.status(500).json({ message: 'Failed' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const qRaw = req.query.q || req.query.query;
    const q = String(qRaw || '').toLowerCase();
    const { data, error } = await supabase.from('users').select('data').filter('data->>name', 'ilike', `%${q}%`).limit(20);
    if (error) {
      console.error('Error searching users:', error);
      return res.status(500).json({ message: 'Failed to search users' });
    }
    res.json(data ? data.map(d => ({ ...stripSensitiveUserFields(d.data), _id: d.data?.id })) : []);
  } catch (error: any) {
    console.error('searchUsers failed:', error?.response?.data || error?.message || error);
    res.status(500).json({ message: 'Failed to search users' });
  }
};

export const getMessagingUsers = async (req: AuthRequest, res: Response) => {
  try {
    // Return all users instead of just followed users
    const { data: users, error } = await supabase.from('users').select('data').limit(50);
    if (error) {
      console.error('Error fetching messaging users:', error);
      return res.status(500).json({ message: 'Failed to load messaging users' });
    }
    const blockedIds = new Set(await getBlockedUserIds(String(req.user.id)));
    const mappedUsers = users
      ? users
          .map(u => ({ ...stripSensitiveUserFields(u.data), _id: u.data?.id || (u as any).id }))
          .filter(u => u._id !== req.user.id && !blockedIds.has(String(u._id)))
      : [];
    res.json(mappedUsers);
  } catch (error: any) {
    console.error('getMessagingUsers failed:', error?.response?.data || error?.message || error);
    res.status(500).json({ message: 'Failed to load messaging users' });
  }
};

export const sendAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const files = (req as any).files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ message: 'No files uploaded' });

    const attachments = [] as { url: string; originalName: string; mimeType: string; size?: number; path?: string; bucket?: string }[];
    for (const f of files) {
      const ext = getExtFromFileName(f.originalname) || 'bin';
      const objectPath = `conversations/${req.params.conversationId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
      const uploaded = await uploadPublicFile({
        bucket: CHAT_ATTACHMENTS_BUCKET,
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
    const messageData = { id, conversationId: req.params.conversationId, sender: req.user.id, content: `Sent ${files.length} attachments`, type: 'attachment', metadata: { attachments }, createdAt: new Date().toISOString() };

    const { error: insertError } = await supabase.from('direct_messages').insert([{ id, data: messageData }]);
    if (insertError) {
      console.error('Error inserting attachment message:', insertError);
      return res.status(500).json({ message: 'Failed to send attachment' });
    }

    // Update conversation unread count
    const { data: convRow, error: convError } = await supabase.from('conversations').select('id, data').eq('id', req.params.conversationId).single();
    if (convError) {
      console.error('Error fetching conversation:', convError);
    }
    if (convRow) {
      const convData = convRow.data;
      const unreadCount = convData.unreadCount || {};
      (convData.participants || []).forEach((pId: string) => {
        if (pId !== req.user.id) unreadCount[pId] = (unreadCount[pId] || 0) + 1;
      });
      const conv = {
        ...convData,
        lastMessage: { content: messageData.content, sender: req.user.id, timestamp: new Date().toISOString() },
        lastMessageAt: new Date().toISOString(),
        unreadCount
      };
      const { error: updateError } = await supabase.from('conversations').update({ data: conv }).eq('id', convRow.id);
      if (updateError) {
        console.error('Error updating conversation:', updateError);
      }

      conv.participants.forEach((pId: string) => {
        if (pId !== req.user.id) io.to(`user_${pId}`).emit('new_direct_message', messageData);
      });
    }

    res.status(201).json(messageData);
  } catch (error) {
    console.error('sendAttachment error:', error);
    res.status(500).json({ message: 'Failed' });
  }
};

export const inviteToCommunityViaMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, conversationId } = req.body;
    const { data: commRow, error: commError } = await supabase.from('communities').select('data').eq('id', communityId).single();
    if (commError && commError.code !== 'PGRST116') {
      console.error('Error fetching community:', commError);
      return res.status(500).json({ message: 'Failed to fetch community' });
    }
    if (!commRow) return res.status(404).json({ message: 'Not found' });

    const messageData = { id: crypto.randomUUID(), conversationId, sender: req.user.id, content: `Join ${commRow.data.name}`, type: 'invite', metadata: { communityId, community: commRow.data }, createdAt: new Date().toISOString() };
    const { error: insertError } = await supabase.from('direct_messages').insert([{ id: messageData.id, data: messageData }]);
    if (insertError) {
      console.error('Error inserting invite message:', insertError);
      return res.status(500).json({ message: 'Failed to send invite' });
    }
    res.status(201).json(messageData);
  } catch (error) {
    console.error('inviteToCommunityViaMessage error:', error);
    res.status(500).json({ message: 'Failed' });
  }
};

export const archiveConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { data: convRow, error: convError } = await supabase.from('conversations').select('id, data').eq('id', req.params.conversationId).single();
    if (convError && convError.code !== 'PGRST116') {
      console.error('Error fetching conversation:', convError);
      return res.status(500).json({ message: 'Failed to fetch conversation' });
    }
    if (convRow) {
      const conv = { ...convRow.data, archived: true, archivedBy: [...(convRow.data.archivedBy || []), req.user.id] };
      const { error: updateError } = await supabase.from('conversations').update({ data: conv }).eq('id', convRow.id);
      if (updateError) {
        console.error('Error archiving conversation:', updateError);
      }
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('archiveConversation error:', error);
    res.status(500).json({ message: 'Failed' });
  }
};

export const deleteConversation = async (req: AuthRequest, res: Response) => {
  try {
    // Delete messages first
    const { error: deleteMessagesError } = await supabase.from('direct_messages').delete().eq('data->>conversationId', req.params.conversationId);
    if (deleteMessagesError) {
      console.error('Error deleting messages:', deleteMessagesError);
    }
    // Delete conversation
    const { error: deleteConvError } = await supabase.from('conversations').delete().eq('id', req.params.conversationId);
    if (deleteConvError) {
      console.error('Error deleting conversation:', deleteConvError);
      return res.status(500).json({ message: 'Failed to delete conversation' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('deleteConversation error:', error);
    res.status(500).json({ message: 'Failed' });
  }
};

export const togglePinConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { data: convRow, error: convError } = await supabase.from('conversations').select('id, data').eq('id', req.params.conversationId).single();
    if (convError && convError.code !== 'PGRST116') {
      console.error('Error fetching conversation:', convError);
      return res.status(500).json({ message: 'Failed to fetch conversation' });
    }
    if (convRow) {
      const pinnedBy = convRow.data.pinnedBy || [];
      const index = pinnedBy.indexOf(req.user.id);
      if (index === -1) {
        pinnedBy.push(req.user.id);
      } else {
        pinnedBy.splice(index, 1);
      }
      const conv = { ...convRow.data, pinnedBy };
      const { error: updateError } = await supabase.from('conversations').update({ data: conv }).eq('id', convRow.id);
      if (updateError) {
        console.error('Error toggling pin:', updateError);
      }
      return res.json({ pinned: index === -1 });
    }
    res.status(404).json({ message: 'Conversation not found' });
  } catch (error) {
    console.error('togglePinConversation error:', error);
    res.status(500).json({ message: 'Failed' });
  }
};
