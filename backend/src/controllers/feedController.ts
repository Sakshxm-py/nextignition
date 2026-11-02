import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { io } from '../utils/socket';
import crypto from 'crypto';
import { uploadPublicFile } from '../utils/storage';
import { createNotification } from './notificationController';
import { getBlockedUserIds } from '../utils/blocks';
import { containsProfanity } from '../utils/contentFilter';

export const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const { content, industry, tags, type, poll: pollStr, milestone: milestoneStr, document: docStr } = req.body;

        // Content filter: reject posts containing prohibited language.
        if (containsProfanity(String(content || ''))) {
            return res.status(400).json({ message: 'Your message contains language that violates our community guidelines.' });
        }

        let poll = pollStr ? JSON.parse(pollStr) : undefined;
        let milestone = milestoneStr ? JSON.parse(milestoneStr) : undefined;
        let document = docStr ? JSON.parse(docStr) : undefined;

        let image = req.body.image;
        let video = req.body.video ? JSON.parse(req.body.video) : undefined;
        let images: string[] = req.body.images ? JSON.parse(req.body.images) : undefined;

        const file = (req as any).file as Express.Multer.File;
        
        if (file) {
            const ext = file.originalname.split('.').pop() || 'bin';
            const objectPath = `feed/${req.user.id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
            const uploaded = await uploadPublicFile({
                bucket: 'stories', 
                objectPath,
                buffer: file.buffer,
                contentType: file.mimetype,
            });
            
            if (file.mimetype.startsWith('video/')) {
                video = { url: uploaded.publicUrl, duration: '0:00' };
            } else if (file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/')) {
                document = { title: file.originalname, type: ext.toUpperCase(), url: uploaded.publicUrl, size: `${(file.size / 1024 / 1024).toFixed(1)}MB` };
            } else {
                image = uploaded.publicUrl;
                images = [uploaded.publicUrl];
            }
        }

        const id = crypto.randomUUID();
        const postType = type || (image || images?.length ? 'image' : video ? 'video' : poll ? 'poll' : milestone ? 'milestone' : document ? 'document' : 'text');

        const postData = {
            id,
            author: req.user.id,
            content,
            type: postType,
            image,
            images,
            video,
            poll,
            milestone,
            document,
            industry,
            tags,
            likes: [],
            comments: [],
            shares: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('posts')
            .insert([{ id, data: postData }])
            .select()
            .single();

        if (error) throw error;

        // Populate real author details
        const { data: userRow, error: userError } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (userError) {
            console.error('Error fetching user data:', userError);
        }
        const u = userRow?.data || {};
        const populatedPost = { ...postData, author: { _id: req.user.id, id: req.user.id, name: u.name || 'User', role: u.role || req.user.role, avatar: u.avatar || u.profile?.avatar || 'U' } };
        io.emit('feed_post_created', populatedPost);
        res.status(201).json(populatedPost);
    } catch (error) {
        console.error('createPost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getFeed = async (req: AuthRequest, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('data')
            .limit(100);

        if (error) {
            console.error('getFeed error:', error);
            throw error;
        }

        // Block enforcement: exclude posts authored by users in a blocked
        // relationship with the requester (either direction).
        const blockedSet = req.user?.id
            ? new Set(await getBlockedUserIds(String(req.user.id)))
            : new Set<string>();

        const posts = (data || [])
            .map((d: any) => ({
                ...d.data,
                id: d.id || d.data.id || d.data._id,
                _id: d.id || d.data.id || d.data._id
            }))
            .filter((p: any) => !p.isStory && !p.isKnowledge)
            .filter((p: any) => {
                const authorId = typeof p.author === 'string' ? p.author : p.author?.id || p.author?._id;
                return !(authorId && blockedSet.has(String(authorId)));
            })
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // ── Bookmark status: inject isBookmarked for authenticated users
        let savedSet = new Set<string>();
        const userId = req.user?.id;
        if (userId) {
            const { data: savedRows, error: savedErr } = await supabase
                .from('saved_items')
                .select('item_id')
                .eq('user_id', userId)
                .eq('item_type', 'post');
            // Silently ignore if table doesn't exist yet
            if (!savedErr) {
                savedSet = new Set((savedRows || []).map((r: any) => r.item_id));
            }
        }

        // Populate authors and check for bookmarks and polls
        const allAuthorIds = new Set(posts.map((p: any) => typeof p.author === 'string' ? p.author : p.author?.id || p.author?._id).filter(Boolean));
        if (allAuthorIds.size > 0) {
            const { data: userRows, error: userError } = await supabase.from('users').select('id, data').in('id', Array.from(allAuthorIds));
            if (userError) {
                console.error('Error fetching users:', userError);
            }
            const userMap: Record<string, any> = {};
            if (userRows) {
                userRows.forEach(r => {
                    const u = r.data || {};
                    userMap[r.id] = { id: r.id, _id: r.id, name: u.name || 'User', role: u.role || '', avatar: u.avatar || u.profile?.avatar || 'U' };
                });
            }
            for (const post of posts) {
                const authorId = typeof post.author === 'string' ? post.author : post.author?._id || post.author?.id;
                if (authorId && userMap[authorId]) {
                    post.author = userMap[authorId];
                }
                if (Array.isArray(post.comments)) {
                    for (const comment of post.comments) {
                        const commentUserId = typeof comment.user === 'string' ? comment.user : comment.user?._id || comment.user?.id;
                        if (commentUserId && userMap[commentUserId]) {
                            comment.user = userMap[commentUserId];
                        }
                    }
                }
                // Mark saved posts and poll votes
                post.isBookmarked = savedSet.has(post.id);
                if (post.type === 'poll' && post.poll && req.user) {
                    post.poll.userVoted = post.poll.voters?.[req.user.id] ?? null;
                }
            }
        } else {
            // No authors to populate but still mark bookmarks
            for (const post of posts) {
                post.isBookmarked = savedSet.has(post.id);
                if (post.type === 'poll' && post.poll && req.user) {
                    post.poll.userVoted = post.poll.voters?.[req.user.id] ?? null;
                }
            }
        }

        res.json(posts);
    } catch (error) {
        console.error('getFeed execution error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};

export const likePost = async (req: AuthRequest, res: Response) => {
    try {
        const { data: existing, error } = await supabase.from('posts').select('data').eq('id', req.params.id).single();
        if (error) {
            console.error('Error fetching post:', error);
            return res.status(500).json({ message: 'Failed to fetch post' });
        }
        if (!existing) return res.status(404).json({ message: 'Post not found' });

        const post = existing.data;
        const likeIndex = post.likes.indexOf(req.user.id);
        if (likeIndex === -1) {
            post.likes.push(req.user.id);
        } else {
            post.likes.splice(likeIndex, 1);
        }

        const { error: updateError } = await supabase.from('posts').update({ data: post }).eq('id', req.params.id);
        if (updateError) {
            console.error('Error updating post:', updateError);
            return res.status(500).json({ message: 'Failed to update post' });
        }

        if (likeIndex === -1 && post.author !== req.user.id) {
            const authorId = typeof post.author === 'string' ? post.author : post.author?._id || post.author?.id;
            const { data: userRow, error: userError } = await supabase.from('users').select('data').eq('id', req.user.id).single();
            if (userError) {
                console.error('Error fetching user data:', userError);
            }
            const u = userRow?.data || {};
            await createNotification(
                authorId,
                'like',
                'New Like',
                `${u.name || 'Someone'} liked your post.`,
                `#feed/${req.params.id}`,
                req.user.id
            );
        }

        res.json(post);
    } catch (error) {
        console.error('likePost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addComment = async (req: AuthRequest, res: Response) => {
    try {
        const { text } = req.body;
        // Content filter: reject comments containing prohibited language.
        if (containsProfanity(String(text || ''))) {
            return res.status(400).json({ message: 'Your message contains language that violates our community guidelines.' });
        }
        const { data: existing, error: fetchError } = await supabase.from('posts').select('data').eq('id', req.params.id).single();
        if (fetchError) {
            console.error('Error fetching post:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch post' });
        }
        if (!existing) return res.status(404).json({ message: 'Post not found' });

        const post = existing.data;
        const { data: commentUserRow, error: userError } = await supabase.from('users').select('data').eq('id', req.user.id).single();
        if (userError) {
            console.error('Error fetching user data:', userError);
        }
        const cu = commentUserRow?.data || {};
        post.comments.push({
            user: { id: req.user.id, _id: req.user.id, name: cu.name || 'User', avatar: cu.avatar || cu.profile?.avatar || 'U' },
            text,
            createdAt: new Date().toISOString(),
        });

        const { error: updateError } = await supabase.from('posts').update({ data: post }).eq('id', req.params.id);
        if (updateError) {
            console.error('Error updating post:', updateError);
            return res.status(500).json({ message: 'Failed to update post' });
        }

        if (post.author !== req.user.id) {
            const authorId = typeof post.author === 'string' ? post.author : post.author?._id || post.author?.id;
            await createNotification(
                authorId,
                'comment',
                'New Comment',
                `${cu.name || 'Someone'} commented on your post: "${text.substring(0, 30)}..."`,
                `#feed/${req.params.id}`,
                req.user.id
            );
        }

        res.json(post);
    } catch (error) {
        console.error('addComment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const votePoll = async (req: AuthRequest, res: Response) => {
    try {
        const { optionIndex } = req.body;
        if (optionIndex === undefined) return res.status(400).json({ message: 'Option index required' });

        const { data: existing, error: fetchError } = await supabase.from('posts').select('data').eq('id', req.params.id).single();
        if (fetchError || !existing) return res.status(404).json({ message: 'Post not found' });

        const post = existing.data;
        if (post.type !== 'poll' || !post.poll) return res.status(400).json({ message: 'Not a poll post' });

        post.poll.voters = post.poll.voters || {};
        
        if (post.poll.voters[req.user.id] !== undefined) {
            return res.status(400).json({ message: 'Already voted' });
        }

        post.poll.voters[req.user.id] = optionIndex;
        post.poll.options[optionIndex].votes = (post.poll.options[optionIndex].votes || 0) + 1;
        post.poll.totalVotes = (post.poll.totalVotes || 0) + 1;

        post.poll.options.forEach((opt: any) => {
            opt.percentage = Math.round((opt.votes / post.poll.totalVotes) * 100);
        });

        const { error: updateError } = await supabase.from('posts').update({ data: post }).eq('id', req.params.id);
        if (updateError) return res.status(500).json({ message: 'Failed to save vote' });

        res.json(post);
    } catch (error) {
        console.error('votePoll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const sharePost = async (req: AuthRequest, res: Response) => {
    try {
        const { data: existing } = await supabase.from('posts').select('data').eq('id', req.params.id).single();
        if (!existing) return res.status(404).json({ message: 'Post not found' });

        const post = existing.data;
        post.shares = (post.shares || 0) + 1;
        await supabase.from('posts').update({ data: post }).eq('id', req.params.id);

        io.emit('feed_post_shared', { postId: String(req.params.id), shares: post.shares });
        res.json({ postId: String(req.params.id), shares: post.shares });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Fetch a single post by id (used by shareable /#post/:id links). Public via maybeAuth.
export const getPostById = async (req: AuthRequest, res: Response) => {
    try {
        const { data: row, error } = await supabase
            .from('posts')
            .select('data')
            .eq('id', req.params.id)
            .single();

        if (error || !row) return res.status(404).json({ message: 'Post not found' });

        const post: any = {
            ...row.data,
            id: req.params.id,
            _id: req.params.id,
        };

        // Populate the author (and comment authors) the same way getFeed does.
        const authorId = typeof post.author === 'string' ? post.author : post.author?._id || post.author?.id;
        const commentUserIds = (post.comments || [])
            .map((c: any) => (typeof c.user === 'string' ? c.user : c.user?._id || c.user?.id))
            .filter(Boolean);
        const idsToFetch = Array.from(new Set([authorId, ...commentUserIds].filter(Boolean)));

        if (idsToFetch.length > 0) {
            const { data: userRows } = await supabase.from('users').select('id, data').in('id', idsToFetch);
            const userMap: Record<string, any> = {};
            (userRows || []).forEach((r: any) => {
                const u = r.data || {};
                userMap[r.id] = { id: r.id, _id: r.id, name: u.name || 'User', role: u.role || '', avatar: u.avatar || u.profile?.avatar || 'U' };
            });
            if (authorId && userMap[authorId]) post.author = userMap[authorId];
            if (Array.isArray(post.comments)) {
                for (const comment of post.comments) {
                    const cid = typeof comment.user === 'string' ? comment.user : comment.user?._id || comment.user?.id;
                    if (cid && userMap[cid]) comment.user = userMap[cid];
                }
            }
        }

        if (post.type === 'poll' && post.poll && req.user) {
            post.poll.userVoted = post.poll.voters?.[req.user.id] ?? null;
        }

        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createStory = async (req: AuthRequest, res: Response) => {
    try {
        const { content } = req.body;
        const file = (req as any).file as Express.Multer.File;
        let image = '';
        let mediaType: 'image' | 'video' = 'image';

        if (file) {
            const ext = file.originalname.split('.').pop() || 'bin';
            const objectPath = `stories/${req.user.id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
            const uploaded = await uploadPublicFile({
                bucket: 'stories', // Assumes 'stories' bucket exists or fallback logic is handled
                objectPath,
                buffer: file.buffer,
                contentType: file.mimetype,
            });
            image = uploaded.publicUrl;
            mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        }

        const id = crypto.randomUUID();
        const storyData = {
            id,
            author: req.user.id,
            image,
            mediaType,
            content,
            createdAt: new Date().toISOString()
        };

        const { error } = await supabase
            .from('stories')
            .insert([{ id, data: storyData }]);

        if (error) {
            // fallback: if stories table doesn't exist, use posts
            await supabase.from('posts').insert([{ id, data: { ...storyData, isStory: true } }]);
        }

        const populated = { ...storyData, author: { _id: req.user.id, name: 'User', avatar: 'U' } };
        res.status(201).json(populated);
    } catch (error) {
        console.error('Create story error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getStories = async (req: AuthRequest, res: Response) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Fetch stories from 'stories' or 'posts' where isStory is true
        let { data, error } = await supabase
            .from('stories')
            .select('data')
            .gte('data->>createdAt', twentyFourHoursAgo)
            .order('data->>createdAt', { ascending: false })
            .limit(50);
        
        if (error) {
            // Fallback to posts
            const fallb = await supabase
                .from('posts')
                .select('data')
                .eq('data->>isStory', 'true')
                .gte('data->>createdAt', twentyFourHoursAgo)
                .order('data->>createdAt', { ascending: false })
                .limit(50);
            data = fallb.data || [];
        }

        const stories = (data || []).map((d: any) => d.data);

        // Filter stories: only those authored by the user OR people they follow
        const { data: followsData } = await supabase
            .from('follows')
            .select('data')
            .eq('data->>follower', req.user.id);
        
        const followingIds = new Set((followsData || []).map((f: any) => f.data.following));
        followingIds.add(req.user.id);

        const hasAnyFollowing = (followsData || []).length > 0;
        const filteredStories = hasAnyFollowing ? stories.filter(s => followingIds.has(s.author)) : stories;
        
        // Populate authors
        const authorIds = [...new Set(filteredStories.map((s: any) => s.author))];
        if (authorIds.length > 0) {
            const { data: userRows } = await supabase.from('users').select('id, data').in('id', authorIds);
            const userMap: Record<string, any> = {};
            if (userRows) {
                for (const u of userRows) {
                    userMap[u.id] = { _id: u.id, name: u.data.name, avatar: u.data.avatar || u.data.profile?.avatar };
                }
            }

            for (const story of filteredStories) {
                if (story.author && userMap[story.author]) {
                    story.author = userMap[story.author];
                }
            }
        }

        res.json(filteredStories);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const toggleSavePost = async (req: AuthRequest, res: Response) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user.id;

        // Check if already saved
        const { data: existing, error: checkErr } = await supabase
            .from('saved_items')
            .select('*')
            .eq('user_id', userId)
            .eq('item_id', postId)
            .eq('item_type', 'post')
            .maybeSingle();

        // Gracefully handle missing table (PGRST205, 42P01, or generic 'not found' on the table)
        const isTableMissing = (e: any) =>
            e && (
            e.code === 'PGRST205' ||
            e.code === '42P01' ||
            e.details?.includes('saved_items') ||
            e.message?.toLowerCase().includes('saved_items') ||
            e.message?.toLowerCase().includes('does not exist')
            );

        if (isTableMissing(checkErr)) {
            return res.json({ saved: false });
        }

        if (existing) {
            await supabase
                .from('saved_items')
                .delete()
                .eq('user_id', userId)
                .eq('item_id', postId)
                .eq('item_type', 'post');
            
            io.emit('bookmark_status_changed', { postId, isBookmarked: false, userId });
            return res.json({ saved: false });
        } else {
            await supabase
                .from('saved_items')
                .insert([{ 
                    user_id: userId, 
                    item_id: postId, 
                    item_type: 'post',
                    created_at: new Date().toISOString()
                }]);
            
            io.emit('bookmark_status_changed', { postId, isBookmarked: true, userId });
            return res.json({ saved: true });
        }
    } catch (error) {
        console.error('toggleSavePost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getSavedPosts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;

        const { data: savedRows, error: savedError } = await supabase
            .from('saved_items')
            .select('item_id')
            .eq('user_id', userId)
            .eq('item_type', 'post');

        // If table doesn't exist yet, return empty array gracefully
        if (savedError) {
            const msg = (savedError.message || '').toLowerCase();
            if (
                savedError.code === 'PGRST205' ||
                savedError.code === '42P01' ||
                msg.includes('saved_items') ||
                msg.includes('not found') ||
                msg.includes('does not exist')
            ) {
                return res.json([]);
            }
            throw savedError;
        }

        const postIds = (savedRows || []).map(r => r.item_id);
        if (postIds.length === 0) return res.json([]);

        const { data: postRows, error: postError } = await supabase
            .from('posts')
            .select('data')
            .in('id', postIds);

        if (postError) throw postError;

        const posts = (postRows || []).map((d: any) => ({ 
            ...d.data, 
            id: d.id || d.data.id || d.data._id,
            _id: d.id || d.data.id || d.data._id,
            isBookmarked: true 
        }));
        
        const authorIds = [...new Set(posts.map((p: any) => typeof p.author === 'string' ? p.author : p.author?.id || p.author?._id).filter(Boolean))];

        if (authorIds.length > 0) {
            const { data: userRows } = await supabase.from('users').select('id, data').in('id', authorIds);
            const userMap: Record<string, any> = {};
            if (userRows) {
                for (const u of userRows) {
                    userMap[u.id] = { _id: u.id, id: u.id, name: u.data.name, avatar: u.data.avatar || u.data.profile?.avatar, role: u.data.role, isVerified: !!u.data?.isVerified };
                }
            }

            for (const post of posts) {
                const authorId = typeof post.author === 'string' ? post.author : post.author?._id || post.author?.id;
                if (authorId && userMap[authorId]) {
                    post.author = userMap[authorId];
                }
            }
        }

        res.json(posts);
    } catch (error) {
        console.error('getSavedPosts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
