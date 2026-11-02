import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';

export const listNewsArticles = async (req: Request, res: Response) => {
    try {
        const { category, location, industry, limit = '20' } = req.query;
        
        let query = supabase.from('news_articles').select('id, data, created_at, updated_at').eq('data->>isPublished', 'true');
        
        if (category) query = query.eq('data->>category', category);
        if (location && location !== 'global') query = query.eq('data->>location', location);
        if (industry) query = query.filter('data->industries', 'cs', `["${industry}"]`);

        const { data: articlesRows, error } = await query;
        if (error) throw error;

        let articles = articlesRows || [];
        articles.sort((a, b) => new Date(b.data?.publishDate || 0).getTime() - new Date(a.data?.publishDate || 0).getTime());
        articles = articles.slice(0, parseInt(String(limit), 10));

        const mapped = articles.map(a => ({ ...a.data, _id: a.id, id: a.id, createdAt: a.created_at, updatedAt: a.updated_at }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getNewsArticle = async (req: Request, res: Response) => {
    try {
        const { data: articleRow, error } = await supabase.from('news_articles').select('id, data, created_at, updated_at').eq('id', req.params.id).single();
        if (error || !articleRow) {
            return res.status(404).json({ message: 'Article not found' });
        }
        
        // Increment views
        const newViews = (articleRow.data?.views || 0) + 1;
        await supabase.from('news_articles').update({
            data: { ...articleRow.data, views: newViews },
            updated_at: new Date().toISOString()
        }).eq('id', req.params.id);
        
        res.json({ ...articleRow.data, views: newViews, _id: articleRow.id, id: articleRow.id, createdAt: articleRow.created_at, updatedAt: articleRow.updated_at });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createNewsArticle = async (req: AuthRequest, res: Response) => {
    try {
        const newId = crypto.randomUUID();
        const articleData = { ...req.body, publishDate: new Date().toISOString() };
        
        const { data: row, error } = await supabase.from('news_articles').insert({
            id: newId,
            data: articleData
        }).select().single();
        
        if (error) throw error;

        res.status(201).json({ ...row.data, _id: row.id, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTrendingTopics = async (req: Request, res: Response) => {
    try {
        const { data: articlesRows, error } = await supabase.from('news_articles').select('data').eq('data->>isPublished', 'true');
        if (error) throw error;

        const tagCounts: Record<string, number> = {};
        
        (articlesRows || []).forEach(row => {
            const industries = row.data?.industries || [];
            industries.forEach((industry: string) => {
                tagCounts[industry] = (tagCounts[industry] || 0) + 1;
            });
        });

        const trending = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json(trending);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── In-memory news cache (survives the process lifetime) ────────────────────
// NewsAPI free-tier developer keys only allow localhost. In production the API
// call will return a 426. We cache the last successful response so production
// can still serve articles fetched during development / first cold-start.
interface NewsCache {
    articles: any[];
    fetchedAt: number;
    query: string;
}
let _newsCache: NewsCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function mapArticle(a: any, idx: number, forcedCategory?: string) {
    let articleCategory = 'Market Trends';
    const text = ((a.title || '') + ' ' + (a.description || '')).toLowerCase();
    if (text.includes('fund') || text.includes('invest') || text.includes('raise')) articleCategory = 'Funding';
    else if (text.includes('ai') || text.includes('infrastructure') || text.includes('gpu')) articleCategory = 'AI Infrastructure';
    else if (text.includes('regulat') || text.includes('law') || text.includes('policy')) articleCategory = 'Regulation';
    else if (text.includes('strategy') || text.includes('growth')) articleCategory = 'Strategy';

    return {
        id: `ext-${idx}`,
        category: forcedCategory || articleCategory,
        title: a.title || 'Untitled',
        summary: a.description || '',
        author: a.author || a.source?.name || 'Unknown',
        authorRole: a.source?.name || 'News Source',
        date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : 'Recent',
        readTime: `${Math.max(2, Math.ceil((a.content?.length || 500) / 1000))} min read`,
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
        featured: idx === 0,
        image: a.urlToImage || undefined,
        url: a.url,
    };
}

export const getExternalNews = async (req: Request, res: Response) => {
    const { category, q, pageSize = '20', refresh } = req.query;
    const size = Math.min(parseInt(String(pageSize), 10) || 20, 100);
    const forcedCategory = category ? String(category) : undefined;
    const forceRefresh = refresh === 'true';

    // ── 1. Serve from cache if still fresh (unless force refresh) ────────────
    if (!forceRefresh && _newsCache && Date.now() - _newsCache.fetchedAt < CACHE_TTL_MS) {
        const cached = _newsCache.articles
            .slice(0, size)
            .map((a: any, idx: number) => ({ ...a, id: `ext-${idx}`, category: forcedCategory || a.category }));
        return res.json(cached);
    }

    // ── 2. Try fetching from real NewsAPI or Public Mirror ─────────────────────────────
    const apiKey = process.env.NEWS_API_KEY;
    let url = `https://saurav.tech/NewsAPI/top-headlines/category/technology/us.json`;
    
    // If we have a real API key, use the official NewsAPI endpoint for fresher results
    if (apiKey) {
        // We use q if provided, otherwise default to tech/startups
        const query = q ? encodeURIComponent(String(q)) : 'startup OR technology';
        url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=${size}&apiKey=${apiKey}`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'NextIgnition/1.0',
                'Accept': 'application/json',
            },
        });

        // NewsAPI returns non-2xx (e.g. 426 on production) for plan restrictions
        if (!response.ok) {
            const body = await response.text();
            console.warn(`[News] NewsAPI responded ${response.status}: ${body}`);
            // Serve stale cache rather than erroring out
            if (_newsCache) return res.json(_newsCache.articles.slice(0, size));
            return res.json([]);
        }

        const data = await response.json() as { status: string; message?: string; articles?: any[] };

        if (data.status !== 'ok') {
            console.warn('[News] NewsAPI status not ok:', data.message);
            if (_newsCache) return res.json(_newsCache.articles.slice(0, size));
            return res.json([]);
        }

        const articles = (data.articles || [])
            .filter((a: any) => a.title && a.title !== '[Removed]')
            .map((a: any, idx: number) => mapArticle(a, idx, forcedCategory));

        // ── 3. Update cache ───────────────────────────────────────────────────
        _newsCache = { articles, fetchedAt: Date.now(), query: String(q || 'technology') };
        console.log(`[News] Fetched ${articles.length} articles from NewsAPI mirror, cache updated.`);

        return res.json(articles);
    } catch (error: any) {
        console.error('[News] External fetch error:', error?.message || error);
        // Network error → serve stale cache or empty
        if (_newsCache) return res.json(_newsCache.articles.slice(0, size));
        return res.json([]);
    }
};

export const getLivePulse = async (req: Request, res: Response) => {
    try {
        const pulseItems: any[] = [];

        // 1. New Posts
        const { data: posts } = await supabase.from('posts').select('id, data, created_at').order('created_at', { ascending: false }).limit(2);
        if (posts) {
            for (const p of posts) {
                pulseItems.push({
                    type: 'post',
                    icon: 'MessageSquare',
                    color: 'text-blue-50',
                    iconColor: 'text-blue-500',
                    text: `${p.data?.author?.name || 'A user'} posted "${p.data?.content?.substring(0, 30)}${p.data?.content?.length > 30 ? '...' : ''}"`,
                    createdAt: p.created_at
                });
            }
        }

        // 2. New Users
        const { data: users } = await supabase.from('users').select('id, data, created_at').order('created_at', { ascending: false }).limit(2);
        if (users) {
            for (const u of users) {
                pulseItems.push({
                    type: 'user',
                    icon: 'Activity',
                    color: 'text-purple-50',
                    iconColor: 'text-purple-500',
                    text: `${u.data?.name || 'New Member'} joined NextIgnition`,
                    createdAt: u.created_at
                });
            }
        }

        // 3. New Startups
        const { data: startups } = await supabase.from('startups').select('id, data, created_at').order('created_at', { ascending: false }).limit(2);
        if (startups) {
            for (const s of startups) {
                pulseItems.push({
                    type: 'startup',
                    icon: 'Zap',
                    color: 'text-amber-50',
                    iconColor: 'text-amber-500',
                    text: `New Startup "${s.data?.name || 'Market Participant'}" joined Discovery`,
                    createdAt: s.created_at
                });
            }
        }

        // 4. Funding
        const { data: apps } = await supabase.from('funding_applications').select('id, data, created_at').eq('data->>status', 'submitted').order('created_at', { ascending: false }).limit(1);
        if (apps && apps.length > 0) {
            const a = apps[0];
            pulseItems.push({
                type: 'funding',
                icon: 'DollarSign',
                color: 'text-green-50',
                iconColor: 'text-green-500',
                text: `${a.data?.title || 'A startup'} submitted for ${a.data?.fundingAsk || 'funding'}`,
                createdAt: a.created_at
            });
        }

        // Sort by date and take top 5
        pulseItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(pulseItems.slice(0, 6));
    } catch (error) {
        res.status(500).json({ pulse: [] });
    }
};

