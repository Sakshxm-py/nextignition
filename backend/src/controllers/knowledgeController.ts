import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';

// GET /api/knowledge-content
export const getMyKnowledgeContent = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { data: rows, error } = await supabase
            .from('posts')
            .select('id, data, created_at, updated_at')
            .eq('data->>author', userId)
            .eq('data->>isKnowledge', 'true')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.warn('Knowledge table query error (expected if table not yet created):', error.message);
            // Default to empty array for any query error to prevent dashboard crashes
            return res.json([]);
        }
        
        // Resolve the author into an object (name/avatar) so the card renders a
        // proper name instead of the raw user id.
        const { data: authorRow } = await supabase.from('users').select('id, data').eq('id', userId).single();
        const authorObj = {
            _id: userId,
            id: userId,
            name: authorRow?.data?.name,
            avatar: authorRow?.data?.avatar,
        };

        const items = (rows || []).map(r => ({
            ...r.data,
            _id: r.id,
            id: r.id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            author: authorObj,
            authorId: userId,
        }));
        res.json(items);
    } catch (error: any) {
        console.error('Error in getMyKnowledgeContent:', error);
        res.status(500).json({ message: error.message });
    }
};

// Determines whether a user account is an official / platform account whose
// uploaded resources should surface under the "NextIgnition" tab automatically.
// Official accounts are flagged either by data.isOfficial, an admin role, or by
// being listed in the OFFICIAL_RESOURCE_EMAILS env var (comma-separated).
function isOfficialAccount(userData: any): boolean {
    if (!userData) return false;
    if (userData.isOfficial === true || userData.isNextIgnitionOfficial === true) return true;
    if (userData.role === 'admin' || (Array.isArray(userData.roles) && userData.roles.includes('admin'))) return true;
    const officialEmails = (process.env.OFFICIAL_RESOURCE_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const email = String(userData.email || '').toLowerCase();
    return !!email && officialEmails.includes(email);
}

// POST /api/knowledge-content
export const createKnowledgeContent = async (req: AuthRequest, res: Response) => {
    try {
        const { title, summary, content, type, status, industry, tags, isPublic, imageUrl, readTime, isNextIgnition } = req.body;
        const userId = req.user.id;

        // Load the author so we can (a) store a display name and (b) decide whether
        // this upload is an official "NextIgnition" resource.
        const { data: userRow } = await supabase.from('users').select('data').eq('id', userId).single();
        const official = isOfficialAccount(userRow?.data);

        const newId = crypto.randomUUID();
        const docData: Record<string, any> = {
            author: userId,
            authorName: userRow?.data?.name || undefined,
            title,
            summary: summary || '',
            content,
            type,
            status: status || 'draft',
            industry,
            tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
            isPublic: isPublic !== false,
            imageUrl: imageUrl || undefined,
            readTime: readTime || undefined,
            views: 0,
            likes: [],
            isKnowledge: true,
            // Only official/platform accounts can publish under the NextIgnition tab.
            // Honor an explicit opt-out, otherwise official uploads default to true.
            isNextIgnition: official ? (isNextIgnition !== false) : false,
        };

        const { data: row, error } = await supabase.from('posts').insert({ id: newId, data: docData }).select().single();
        if (error) throw error;

        res.status(201).json({ ...row.data, _id: row.id, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at });
    } catch (error: any) {
        console.error('Error in createKnowledgeContent:', error);
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/knowledge-content/:id
export const updateKnowledgeContent = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content, type, status, industry, tags } = req.body;
        const { id } = req.params;
        const userId = req.user.id;

        const { data: existing, error: fetchErr } = await supabase.from('posts').select('id, data').eq('id', id).eq('data->>author', userId).eq('data->>isKnowledge', 'true').single();
        if (fetchErr || !existing) return res.status(404).json({ message: 'Content not found' });

        const updates = { ...existing.data };
        if (title) updates.title = title;
        if (content) updates.content = content;
        if (type) updates.type = type;
        if (status) updates.status = status;
        if (industry) updates.industry = industry;
        if (tags) updates.tags = tags;

        const { data: row, error } = await supabase.from('posts').update({ data: updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;

        res.json({ ...row.data, _id: row.id, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/knowledge-content/:id
export const deleteKnowledgeContent = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: existing, error } = await supabase.from('posts').delete().eq('id', id).eq('data->>author', userId).eq('data->>isKnowledge', 'true').select();
        
        if (error || !existing || existing.length === 0) {
            return res.status(404).json({ message: 'Content not found' });
        }

        res.json({ message: 'Content deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/knowledge/:id/like
export const likeKnowledgeContent = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: existing, error: fetchErr } = await supabase.from('posts').select('id, data').eq('id', id).eq('data->>isKnowledge', 'true').single();
        if (fetchErr || !existing) return res.status(404).json({ message: 'Content not found' });

        const data = { ...existing.data };
        const likes = Array.isArray(data.likes) ? data.likes : [];
        const isLiked = likes.includes(userId);

        const newLikes = isLiked ? likes.filter((l: string) => l !== userId) : [...likes, userId];
        data.likes = newLikes;

        const { error: updateErr } = await supabase.from('posts').update({ data }).eq('id', id);
        if (updateErr) throw updateErr;

        res.json({ message: isLiked ? 'Unliked' : 'Liked', likes: newLikes });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPublicKnowledgeContent = async (req: any, res: Response) => {
    try {
        const { data: rows, error } = await supabase
            .from('posts')
            .select('id, data, created_at, updated_at')
            .eq('data->>status', 'published')
            .eq('data->>isKnowledge', 'true');
            
        if (error) {
            if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                return res.json([]);
            }
            throw error;
        }

        let items = rows || [];
        items.sort((a, b) => (b.data?.views || 0) - (a.data?.views || 0));

        // Populate authors
        const authorIds = [...new Set(items.map(i => i.data?.author).filter(Boolean))];
        const authorsMap = new Map();
        if (authorIds.length > 0) {
            const { data: usersData } = await supabase.from('users').select('id, data').in('id', authorIds);
            (usersData || []).forEach(u => authorsMap.set(u.id, u.data));
        }

        const mapped = items.map(r => {
            const authorData = authorsMap.get(r.data?.author);
            return {
                ...r.data,
                _id: r.id,
                id: r.id,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                author: {
                    _id: r.data?.author,
                    name: authorData?.name,
                    avatar: authorData?.avatar
                }
            };
        });

        res.json(mapped);
    } catch (error: any) {
        console.error('Error in getPublicKnowledgeContent:', error);
        res.status(500).json({ message: error.message });
    }
};
