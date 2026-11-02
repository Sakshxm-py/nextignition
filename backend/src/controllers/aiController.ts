import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';
import fs from 'fs/promises';
import crypto from 'crypto';
import { supabase } from '../utils/supabase';
import { extractDeckTextFromBuffer } from '../utils/deckTextExtractor';
import { formatAiRequestContext } from '../utils/aiRequestContext';
import { getGlobalSettings } from '../utils/settingsService';

// Import bytez.js once at module load to avoid dynamic require() overhead on every call
let _bytezSdk: any = null;
try {
    const moduleRef = require('bytez.js');
    const Bytez = moduleRef?.default || moduleRef;
    _bytezSdk = (apiKey: string) => new Bytez(apiKey);
} catch {
    // bytez.js not available — will fall back gracefully
}

// Cache API keys at module load — they never change at runtime
const CACHED_OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^['"`]+|['"`]+$/g, '').trim();
const CACHED_GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
const CACHED_BYTEZ_KEY = (process.env.BYTEZ_API_KEY || '').trim();

// Simple in-process user context cache (60s TTL)
const _userContextCache = new Map<string, { contextText: string; user: any; expiry: number }>();
const USER_CONTEXT_TTL_MS = 60_000;

// ... (existing imports and helpers)

export const analyzeBusinessDocument = async (req: AuthRequest, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    const { docType, documentId } = req.body;

    if (!file && !req.body.content) {
        return res.status(400).json({ message: 'Document content or file is required.' });
    }

    try {
        const userId = String(req.user?.id || '');
        const allowed = await checkAiLimit(userId);
        if (!allowed) {
            return res.status(429).json({ message: 'Daily AI query limit reached. Upgrade your plan or try again tomorrow!' });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);
        const analysisPrompt = `You are an expert venture capitalist and business analyst. 
        Analyze this "${docType}" document and provide an investor-grade quality assessment.
        
        Return STRICT JSON with this shape:
        {
          "score": 0,
          "executiveSummary": "string",
          "strengths": ["string", "string"],
          "gaps": ["string", "string"],
          "recommendations": ["string", "string"]
        }
        
        Rules:
        - Score must be 0-100 based on investor standards.
        - executiveSummary should be 2-3 sentences.
        - Provide 3-5 specific strengths and gaps.
        - Provide actionable recommendations.
        - Output JSON only.`;

        let documentText = '';
        if (file) {
            const extracted = await extractDeckTextFromBuffer(file.buffer, file.originalname, file.mimetype);
            documentText = extracted.text;
        } else {
            documentText = req.body.content;
        }

        const aiResponse = await callTextModelWithFallback([
            { role: 'system', content: `${analysisPrompt}\n\n${requestContextText}` },
            { role: 'user', content: `Document Type: ${docType}\n\nContent:\n${documentText}` }
        ]);

        const analysis = aiResponse ? parseJsonFromText(aiResponse) : null;

        if (!analysis) {
            throw new Error('AI failed to return valid analysis JSON.');
        }

        // Persist analysis if documentId is provided
        if (documentId) {
            const analysisData = {
                user: req.user?.id,
                docType,
                analysis,
                source: file?.originalname || 'text',
                updatedAt: new Date().toISOString()
            };
            const { error: upsertErr } = await supabase.from('document_analyses').upsert([{ id: documentId, data: analysisData }]);
            if (upsertErr) console.error('Failed to persist document analysis:', upsertErr);
        }

        res.json(analysis);
    } catch (error: any) {
        console.error('Pitch Deck Analysis Error:', error.message);
        res.status(500).json({ message: 'Failed to analyze pitch deck', error: error.message });
    }
};

export const toggleSaveSession = async (req: AuthRequest, res: Response) => {
    try {
        const { id: sessionId } = req.params;
        const userId = req.user.id;

        const { data: existing, error: fetchErr } = await supabase
            .from('saved_items')
            .select('*')
            .eq('user_id', userId)
            .eq('item_id', sessionId)
            .eq('item_type', 'ai_session')
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error('toggleSaveSession fetch error:', fetchErr);
            return res.status(500).json({ message: 'Failed to check saved status' });
        }

        if (existing) {
            const { error: deleteErr } = await supabase
                .from('saved_items')
                .delete()
                .eq('user_id', userId)
                .eq('item_id', sessionId)
                .eq('item_type', 'ai_session');
            if (deleteErr) {
                console.error('toggleSaveSession delete error:', deleteErr);
                return res.status(500).json({ message: 'Failed to unsave session' });
            }
            return res.json({ saved: false });
        } else {
            const { error: insertErr } = await supabase
                .from('saved_items')
                .insert([{ 
                    user_id: userId, 
                    item_id: sessionId, 
                    item_type: 'ai_session',
                    created_at: new Date().toISOString()
                }]);
            if (insertErr) {
                console.error('toggleSaveSession insert error:', insertErr);
                return res.status(500).json({ message: 'Failed to save session' });
            }
            return res.json({ saved: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const enhancePrompt = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user?.id || '');
        const allowed = await checkAiLimit(userId);
        if (!allowed) {
            return res.status(429).json({ message: 'Daily AI query limit reached. Upgrade your plan or try again tomorrow!' });
        }

        const { prompt } = req.body;
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ message: 'Prompt is required' });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);

        const systemPrompt = `You are an expert prompt engineer and startup mentor. 
Your task is to take a user's rough startup-related query and transform it into a highly effective, structured, and deep-dive prompt for an LLM.

Rules:
- Make it professional yet ambitious.
- Add specific technical or business constraints that would make the AI's response more valuable.
- Use structured thinking (e.g., "Analyze X considering Y and Z").
- DO NOT add your own conversational filler (No "Sure thing!", No "Here is your enhanced prompt:").
- ONLY return the final enhanced prompt text itself.
- Ensure the tone matches Ignisha AI (elite, direct, insightful).

Context: ${requestContextText}`;

        const aiResponse = await callTextModelWithFallback([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Original Prompt: ${prompt}\n\nEnhanced Prompt:` }
        ]);

        if (!aiResponse) {
            return res.status(503).json({ message: 'AI provider unavailable' });
        }

        // Clean up common AI artifacts just in case
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
        cleaned = cleaned.replace(/^Here'?s? an enhanced prompt:?\s*/i, '');
        cleaned = cleaned.replace(/^Enhanced Prompt:?\s*/i, '');

        res.json({ enhanced: cleaned });
    } catch (error: any) {
        console.error('Enhance Prompt Error:', error.message);
        res.status(500).json({ message: 'Failed to enhance prompt' });
    }
};

export const enhancePost = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user?.id || '');
        const allowed = await checkAiLimit(userId);
        if (!allowed) {
            return res.status(429).json({ message: 'Daily AI query limit reached. Upgrade your plan or try again tomorrow!' });
        }

        const { content } = req.body;
        if (!content || !String(content).trim()) {
            return res.status(400).json({ message: 'Post content is required' });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);

        const systemPrompt = `You are an expert social media manager and startup copywriter. 
Your task is to take a user's rough draft for a social media post and transform it into 3 distinct, high-impact versions.

Versions to generate:
1. Professional & Authoritative: Focus on expertise and value.
2. Enthusiastic & Engaging: Use energetic language and emojis to drive interaction.
3. Concise & Punchy: Short, direct, and powerful.

Rules:
- Keep the core message of the user's post.
- Each version should be unique in tone and structure.
- Use relevant emojis where appropriate.
- DO NOT add any conversational filler.
- Return ONLY a JSON array of 3 strings.

Format: ["Version 1 text", "Version 2 text", "Version 3 text"]

Context: ${requestContextText}`;

        const aiResponse = await callTextModelWithFallback([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Post Draft: ${content}\n\nEnhanced Versions (JSON Array):` }
        ]);

        if (!aiResponse) {
            return res.status(503).json({ message: 'AI provider unavailable' });
        }

        const enhancedVersions = parseJsonFromText(aiResponse);
        
        if (!enhancedVersions || !Array.isArray(enhancedVersions)) {
             // Fallback if parsing fails
             const lines = aiResponse.split('\n').map(l => l.trim()).filter(l => l.length > 5);
             const versions = lines.length >= 3 ? lines.slice(0, 3) : [aiResponse];
             return res.json({ enhanced: versions });
        }

        res.json({ enhanced: enhancedVersions });
    } catch (error: any) {
        console.error('Enhance Post Error:', error.message);
        res.status(500).json({ message: 'Failed to enhance post' });
    }
};

export const getSavedSessions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { data: savedRows } = await supabase
            .from('saved_items')
            .select('item_id')
            .eq('user_id', userId)
            .eq('item_type', 'ai_session');

        const sessionIds = (savedRows || []).map(r => r.item_id);
        res.json(sessionIds);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const generatePortfolioAnalysis = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user?.id || '');
        const allowed = await checkAiLimit(userId);
        if (!allowed) {
            return res.status(429).json({ message: 'Daily AI query limit reached. Upgrade your plan or try again tomorrow!' });
        }

        const { portfolioData } = req.body;
        if (!portfolioData || !Array.isArray(portfolioData)) {
            return res.status(400).json({ message: 'Portfolio data (array) is required.' });
        }

        const { contextText: userContextText } = await getUserContext(userId);
        const { contextText: requestContextText } = formatAiRequestContext(req);

        const prompt = `You are a world-class venture capital portfolio manager and analyst. 
Analyze the provided portfolio of startups and generate a comprehensive health report.

### INPUT DATA
Portfolio: ${JSON.stringify(portfolioData)}
User Context: ${userContextText}

### OUTPUT FORMAT
Return STRICT JSON with this shape:
{
  "summary": "2-3 sentence high-level overview of portfolio health.",
  "metrics": {
    "totalInvested": "string with currency",
    "diversityScore": 0, // 0-100
    "riskLevel": "Low | Medium | High"
  },
  "sectorAnalysis": [
    { "sector": "string", "percentage": 0, "outlook": "string" }
  ],
  "riskAssessment": [
    { "startup": "string", "risk": "string", "mitigation": "string" }
  ],
  "recommendations": [
    { "title": "string", "description": "string", "priority": "High | Medium | Low" }
  ],
  "fullReport": "A detailed 4-5 paragraph markdown report including trends, market headwinds, and strategic advice."
}

### RULES
- Be critical and direct. As an investor, the user needs real truth, not fluff.
- Identify concentration risks (too many startups in one sector/stage).
- Highlight top performers based on AI scores if available.
- Output JSON only. No markdown formatting outside the JSON values.`;

        const aiResponse = await callTextModelWithFallback([
            { role: 'system', content: `You are Ignisha AI, an elite VC analyst.\n\n${requestContextText}` },
            { role: 'user', content: prompt }
        ]);

        const analysis = aiResponse ? parseJsonFromText(aiResponse) : null;

        if (!analysis) {
            // Demo mode fallback if AI fails or no keys
            return res.json({
                summary: "Your portfolio shows healthy diversity across sectors with a focus on early-stage Tech.",
                metrics: { totalInvested: "$2.3M", diversityScore: 82, riskLevel: "Medium" },
                sectorAnalysis: [{ sector: "AI/ML", percentage: 45, outlook: "Bullish" }],
                riskAssessment: [{ startup: "Sample Startup", risk: "Market adoption", mitigation: "Focus on B2B" }],
                recommendations: [{ title: "Diversify into HealthTech", description: "Reduce concentration in AI.", priority: "Medium" }],
                fullReport: "AI analysis is currently in demo mode. Add API keys for real-time deep portfolio analysis."
            });
        }

        res.json(analysis);
    } catch (error: any) {
        console.error('Portfolio Analysis Error:', error.message);
        res.status(500).json({ message: 'Failed to generate portfolio analysis', error: error.message });
    }
};
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
const DEFAULT_OPENROUTER_TEXT_MODEL = 'openrouter/free';
const FALLBACK_OPENROUTER_TEXT_MODEL = 'openrouter/free';
const DEFAULT_BYTEZ_TEXT_MODEL = 'google/gemini-2.0-flash-exp';

const sanitizeEnvValue = (value?: string) => {
    if (!value) return '';
    return value.trim().replace(/^['"`]+|['"`]+$/g, '').trim();
};

const normalizeMessagesForModel = (
    messages: { role: string; content: string }[],
    omitSystemRole: boolean
) => {
    if (!omitSystemRole) {
        return messages;
    }

    const systemInstructions = messages
        .filter((message) => message.role === 'system')
        .map((message) => message.content.trim())
        .filter(Boolean)
        .join('\n\n');

    const nonSystemMessages = messages.filter((message) => message.role !== 'system');
    if (!systemInstructions) {
        return nonSystemMessages;
    }

    const mergedMessage = {
        role: 'user',
        content: `Follow these instructions for all subsequent responses:\n${systemInstructions}`,
    };

    return [mergedMessage, ...nonSystemMessages];
};

const getOpenRouterTextModel = async () => {
    const settings = await getGlobalSettings();
    if (settings.useGPT4) {
        return 'openai/gpt-4-turbo'; // High quality model
    }
    return sanitizeEnvValue(process.env.OPENROUTER_TEXT_MODEL) ||
    sanitizeEnvValue(process.env.OPENROUTER_MODEL) ||
    DEFAULT_OPENROUTER_TEXT_MODEL;
};

const callOpenRouter = async (
    messages: { role: string; content: string }[],
    model?: string,
    allowDefaultRetry = true,
    omitSystemRole = false
) => {
    if (!CACHED_OPENROUTER_KEY) return null;

    const targetModel = sanitizeEnvValue(model) || DEFAULT_OPENROUTER_MODEL;
    const payloadMessages = normalizeMessagesForModel(messages, omitSystemRole);

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: targetModel,
                messages: payloadMessages,
                max_tokens: 2048,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${CACHED_OPENROUTER_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000',
                    'X-Title': 'NextIgnition Platform',
                },
                timeout: 30000,
            }
        );

        const content = response?.data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
            console.warn('OpenRouter returned unexpected response shape:', {
                model: targetModel,
                hasChoices: Array.isArray(response?.data?.choices),
            });
            return null;
        }
        const trimmed = content.trim();
        return trimmed || null;
    } catch (error: any) {
        const status = error?.response?.status;
        const providerCode = error?.response?.data?.error?.code;
        const providerMessage = String(error?.response?.data?.error?.message || '').toLowerCase();
        const providerRaw = String(error?.response?.data?.error?.metadata?.raw || '').toLowerCase();
        const modelInstructionUnsupported =
            providerMessage.includes('developer instruction is not enabled') ||
            providerRaw.includes('developer instruction is not enabled') ||
            providerMessage.includes('invalid_argument') ||
            providerRaw.includes('invalid_argument');
        if (status === 401 || status === 403 || providerCode === 401 || providerCode === 403) {
            console.error('OpenRouter auth error. Check OPENROUTER_API_KEY.');
            return null;
        }
        if ((status === 400 || providerCode === 400) && modelInstructionUnsupported) {
            if (!omitSystemRole) {
                console.warn(`OpenRouter model incompatible with system instructions (${targetModel}). Retrying without system-role messages.`);
                return await callOpenRouter(messages, targetModel, allowDefaultRetry, true);
            }
            if (allowDefaultRetry && targetModel !== DEFAULT_OPENROUTER_MODEL) {
                console.warn(`OpenRouter model incompatible with system instructions (${targetModel}). Retrying with default model.`);
                return await callOpenRouter(messages, DEFAULT_OPENROUTER_MODEL, false, true);
            }
            console.error('OpenRouter model rejected prompt format. Check OPENROUTER_PITCH_DECK_MODEL.');
            return null;
        }
        if (status === 404 || providerCode === 404 || providerMessage.includes('no endpoints found')) {
            if (allowDefaultRetry && targetModel !== DEFAULT_OPENROUTER_MODEL) {
                console.warn(`OpenRouter model unavailable (${targetModel}). Retrying with default model.`);
                return await callOpenRouter(messages, DEFAULT_OPENROUTER_MODEL, false, omitSystemRole);
            }
            console.error('OpenRouter model unavailable. Check OPENROUTER_PITCH_DECK_MODEL.');
            return null;
        }
        if (
            status === 429 ||
            providerCode === 429 ||
            providerMessage.includes('rate-limit') ||
            providerMessage.includes('rate limited') ||
            providerRaw.includes('rate-limit') ||
            providerRaw.includes('rate limited')
        ) {
            if (allowDefaultRetry && targetModel !== DEFAULT_OPENROUTER_MODEL) {
                console.warn(`OpenRouter model rate-limited (${targetModel}). Retrying with default model.`);
                return await callOpenRouter(messages, DEFAULT_OPENROUTER_MODEL, false, omitSystemRole);
            }
            console.warn('OpenRouter is temporarily rate-limited. Falling back to alternate provider if configured.');
            return null;
        }
        throw error;
    }
};

const extractJsonFromText = (text: string) => {
    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/```\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch?.[1] || trimmed;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return candidate.slice(firstBrace, lastBrace + 1);
    }
    return candidate;
};

const parseJsonFromText = (text: string) => {
    try {
        const jsonStr = extractJsonFromText(text);
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
};

const callOpenRouterJson = async (messages: { role: string; content: string }[], model?: string) => {
    const responseText = await callOpenRouter(messages, model);
    if (!responseText) return null;
    return parseJsonFromText(responseText);
};

const normalizeArray = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split('\n')
            .map((line) => line.replace(/^[-•\s]+/, '').trim())
            .filter(Boolean);
    }
    return [];
};

const getUserContext = async (userId: string) => {
    const now = Date.now();
    const cached = _userContextCache.get(userId);
    if (cached && cached.expiry > now) {
        return { user: cached.user, contextText: cached.contextText };
    }

    const { data: userRow, error: userErr } = await supabase.from('users').select('data').eq('id', userId).single();
    if (userErr && userErr.code !== 'PGRST116') {
        console.error('getUserContext fetch error:', userErr);
    }
    if (!userRow) return { user: null, contextText: 'No user profile available.' };
    const user = userRow.data;
    const profile = user.profile || {};

    const lines: string[] = [];
    lines.push('User profile:');
    lines.push(`- Name: ${user.name}`);
    lines.push(`- Role: ${user.role}`);
    lines.push(`- Location: ${profile.location || 'N/A'}`);
    lines.push(`- Bio: ${profile.bio || 'N/A'}`);
    lines.push(`- Skills: ${(profile.skills || []).join(', ') || 'N/A'}`);
    lines.push(`- Interests: ${(profile.interests || []).join(', ') || 'N/A'}`);
    lines.push(`- Expertise: ${(profile.expertise || []).join(', ') || 'N/A'}`);
    lines.push(`- Experience: ${profile.experience || 'N/A'}`);

    // Fetch user's startup details for richer AI context
    try {
        const { data: startupRow } = await supabase
            .from('startups')
            .select('data')
            .eq('data->>userId', userId)
            .limit(1)
            .single();
        if (startupRow?.data) {
            const s = startupRow.data;
            lines.push('');
            lines.push('User\'s startup:');
            lines.push(`- Startup Name: ${s.name || 'N/A'}`);
            lines.push(`- Industry: ${s.industry || 'N/A'}`);
            lines.push(`- Stage: ${s.stage || 'N/A'}`);
            lines.push(`- Description: ${(s.description || '').slice(0, 300) || 'N/A'}`);
            lines.push(`- Business Model: ${s.businessModel || 'N/A'}`);
            if (s.funding) {
                lines.push(`- Funding Target: ${s.funding.target ? `$${s.funding.target.toLocaleString()}` : 'N/A'}`);
                lines.push(`- Funding Raised: ${s.funding.raised ? `$${s.funding.raised.toLocaleString()}` : 'N/A'}`);
            }
        }
    } catch {
        // Non-critical — proceed without startup details
    }

    // Fetch latest pitch deck analysis summary if available
    try {
        const { data: deckRow } = await supabase
            .from('pitch_deck_analyses')
            .select('data')
            .eq('data->>user', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (deckRow?.data?.analysis) {
            const a = deckRow.data.analysis;
            lines.push('');
            lines.push('Latest pitch deck analysis:');
            if (a.summary || a.executiveSummary) lines.push(`- Summary: ${(a.summary || a.executiveSummary || '').slice(0, 300)}`);
            if (a.investorReadinessScore) lines.push(`- Investor Readiness Score: ${a.investorReadinessScore}/100`);
            if (a.strengths?.length) lines.push(`- Strengths: ${a.strengths.slice(0, 3).join('; ')}`);
            if (a.gaps?.length) lines.push(`- Gaps: ${a.gaps.slice(0, 3).join('; ')}`);
        }
    } catch {
        // Non-critical — proceed without pitch deck data
    }

    const contextText = lines.join('\n');
    _userContextCache.set(userId, { user, contextText, expiry: now + USER_CONTEXT_TTL_MS });
    return { user, contextText };
};

const computeMatchScore = (a: string[], b: string[]) => {
    const lowerA = a.map((item) => item.toLowerCase());
    const lowerB = b.map((item) => item.toLowerCase());
    const overlap = lowerA.filter((item) => lowerB.includes(item)).length;
    return overlap;
};

const parseGeminiAnalysis = (text: string) => {
    try {
        const jsonStr = extractJsonFromText(text);
        const parsed = JSON.parse(jsonStr);
        return {
            summary: String(parsed.executiveSummary || parsed.summary || '').trim(),
            highlights: Array.isArray(parsed.highlights)
                ? parsed.highlights.map((item: unknown) => String(item)).filter(Boolean)
                : [],
            strengths: Array.isArray(parsed.strengths)
                ? parsed.strengths.map((item: unknown) => String(item)).filter(Boolean)
                : [],
            gaps: Array.isArray(parsed.gaps)
                ? parsed.gaps.map((item: unknown) => String(item)).filter(Boolean)
                : [],
            redFlags: Array.isArray(parsed.redFlags)
                ? parsed.redFlags.map((item: unknown) => String(item)).filter(Boolean)
                : [],
            moatType: String(parsed.moatType || 'None').trim(),
            investorReadinessScore:
                typeof parsed.investorReadinessScore === 'number' ? parsed.investorReadinessScore : undefined,
            scoreMetrics: Array.isArray(parsed.scoreMetrics) ? parsed.scoreMetrics : [],
            raw: text,
        };
    } catch {
        return {
            summary: text,
            highlights: [],
            scoreMetrics: [],
            raw: text,
        };
    }
};

const callGeminiWithBuffer = async (buffer: Buffer, mimeType: string, prompt: string) => {
    if (!CACHED_GEMINI_KEY) return null;

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const base64Data = buffer.toString('base64');

    const response = await axios.post(
        `${GEMINI_API_URL}/${model}:generateContent?key=${CACHED_GEMINI_KEY}`,
        {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        }
    );

    const text = response.data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text)
        .filter(Boolean)
        .join('\n')
        ?.trim();

    if (!text) throw new Error('Gemini returned an empty analysis response');
    return text;
};

const callGeminiWithText = async (content: string, prompt: string) => {
    if (!CACHED_GEMINI_KEY) return null;

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const response = await axios.post(
        `${GEMINI_API_URL}/${model}:generateContent?key=${CACHED_GEMINI_KEY}`,
        {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `${prompt}\n\nDeck content:\n${content}` },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        }
    );

    const text = response.data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text)
        .filter(Boolean)
        .join('\n')
        ?.trim();

    if (!text) throw new Error('Gemini returned an empty analysis response');
    return text;
};

const stringifyUnknownOutput = (value: any): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                    if (typeof item.text === 'string') return item.text;
                    if (typeof item.content === 'string') return item.content;
                }
                try {
                    return JSON.stringify(item);
                } catch {
                    return String(item);
                }
            })
            .filter(Boolean)
            .join('\n');
    }
    if (value && typeof value === 'object') {
        if (typeof value.text === 'string') return value.text;
        if (typeof value.content === 'string') return value.content;
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value ?? '');
};

const callBytez = async (messages: { role: string; content: string }[], overrideModelName?: string) => {
    if (!CACHED_BYTEZ_KEY || !_bytezSdk) return null;

    try {
        const sdk = _bytezSdk(CACHED_BYTEZ_KEY);
        const modelName =
            sanitizeEnvValue(overrideModelName) ||
            sanitizeEnvValue(process.env.BYTEZ_MODEL) ||
            'openrouter/free';
        const model = sdk.model(modelName);

        const { error, output } = await model.run(messages.map((message) => ({
            role: message.role,
            content: message.content,
        })));

        if (error) {
            console.error('Bytez error:', error);
            return null;
        }

        const text = stringifyUnknownOutput(output).trim();
        return text || null;
    } catch (error: any) {
        console.error('Bytez call failed:', error?.message || error);
        return null;
    }
};

const callTextModelWithFallback = async (messages: { role: string; content: string }[]) => {
    const preferredOpenRouterModel = await getOpenRouterTextModel();

    const openRouterResponse = await callOpenRouter(messages, preferredOpenRouterModel);
    if (openRouterResponse && String(openRouterResponse).trim()) {
        return openRouterResponse;
    }

    if (preferredOpenRouterModel !== FALLBACK_OPENROUTER_TEXT_MODEL) {
        const openRouterFallback = await callOpenRouter(messages, FALLBACK_OPENROUTER_TEXT_MODEL);
        if (openRouterFallback && String(openRouterFallback).trim()) {
            return openRouterFallback;
        }
    }

    const bytezTextModel =
        sanitizeEnvValue(process.env.BYTEZ_TEXT_MODEL) ||
        DEFAULT_BYTEZ_TEXT_MODEL;
    const bytezResponse = await callBytez(messages, bytezTextModel);
    if (bytezResponse && String(bytezResponse).trim()) {
        return bytezResponse;
    }

    return null;
};

export const generateStartupSummary = async (req: AuthRequest, res: Response) => {
    try {
        const idea = String(req.body?.idea || '').trim();
        if (!idea) {
            return res.status(400).json({ message: 'Idea is required.' });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);

        const aiResponse = await callTextModelWithFallback([
            {
                role: 'system',
                content: `You are an expert venture capitalist and startup strategist named Ignisha. Your goal is to transform complex startup ideas into compelling, investor-ready summaries. Be encouraging but realistic. Use emojis sparingly. Format with markdown.\n\n${requestContextText}`
            },
            {
                role: 'user',
                content: `Please generate an investor-ready summary for this startup idea: ${idea}`
            }
        ]);

        if (!aiResponse) {
            return res.status(503).json({ message: 'AI provider unavailable for startup summary.' });
        }

        res.json({ summary: aiResponse });
    } catch (error: any) {
        console.error('AI Error:', error?.response?.data || error.message);
        res.status(500).json({ message: 'AI Generation failed', error: error.message });
    }
};

export const summarizeProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user?.id || '').trim();
        const profileText = String(req.body?.profileText || '').trim();
        if (!userId && !profileText) {
            return res.status(400).json({ message: 'Please provide profile text or log in to summarize your saved profile.' });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);
        const { contextText: userContextText } = userId ? await getUserContext(userId) : { contextText: '' };
        const sourceText = profileText || userContextText;
        const aiResponse = await callTextModelWithFallback([
            {
                role: 'system',
                content: `You are a career advisor and startup mentor. Analyze the user profile and provide actionable insights about their strengths, areas for growth, and networking suggestions.\n\n${requestContextText}`
            },
            {
                role: 'user',
                content: `Analyze this profile and give insights:\n\n${sourceText}`
            }
        ]);

        if (!aiResponse) {
            return res.status(503).json({ message: 'AI provider unavailable for quick action.' });
        }

        await incrementAiUsage(userId);
        res.json(aiResponse);
    } catch (error: any) {
        console.error('AI Error:', error?.response?.data || error.message);
        res.status(500).json({ message: 'Profile summarization failed' });
    }
};

export const summarizePitchDeck = async (req: AuthRequest, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    try {
        const { content } = req.body;

        if (!file && !content) {
            return res.status(400).json({ message: 'Please upload a pitch deck file or provide deck content.' });
        }

        const userId = String(req.user?.id || '');
        if (userId) {
            const allowed = await checkAiLimit(userId);
            if (!allowed) {
                return res.status(429).json({ message: 'Daily AI query limit reached. Upgrade your plan or try again tomorrow!' });
            }
        }

        if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
            return res.json({
                summary: '📊 **Pitch Deck Analysis (Demo Mode):** Add `OPENROUTER_API_KEY` to enable real AI pitch deck review.',
                highlights: [
                    'Problem and solution clarity',
                    'Market size and positioning',
                    'Business model and monetization',
                    'Team credibility',
                    'Funding ask and use of funds',
                ],
            });
        }

        const analysisPrompt = `You are a world-class Venture Capital (VC) Analyst at a top-tier firm. 
Analyze the following pitch deck content and provide a deep-dive investment evaluation.

### EVALUATION CRITERIA
1. **Problem & Opportunity**: Is the problem real, painful, and widely felt?
2. **Solution & Product**: Does the solution offer a 10x improvement over status quo?
3. **Market (TAM/SAM/SOM)**: Is the market large enough to support a billion-dollar company?
4. **Moat & Defensibility**: What is the competitive advantage (IP, Network Effects, High Switching Costs)?
5. **Team & Traction**: Does the team have unfair advantages? Is the traction sustainable?

### OUTPUT FORMAT
Return STRICT JSON with the following structure:
{
  "executiveSummary": "A punchy, professional 3-sentence summary of the investment thesis.",
  "highlights": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "strengths": ["Critical strength 1", "Critical strength 2"],
  "gaps": ["Unaddressed risk 1", "Unaddressed risk 2"],
  "redFlags": ["Potential deal-breaker 1", "Potential deal-breaker 2"],
  "moatType": "Network Effects | IP | Economies of Scale | Brand | None",
  "investorReadinessScore": 0, // 0-100 overall score
  "scoreMetrics": [
    { "label": "Market Timing", "score": 8.5, "note": "Perfect storm for this Tech" },
    { "label": "Founder-Market Fit", "score": 7.0, "note": "Domain experts but need sales" },
    { "label": "Product Moat", "score": 6.5, "note": "Needs more IP protection" },
    { "label": "Business Model", "score": 9.0, "note": "High margin recurring revenue" },
    { "label": "Growth Trajectory", "score": 8.0, "note": "Consistent month-over-month growth" }
  ]
}

### RULES
- Be objective, critical, and direct. Avoid fluff.
- investorReadinessScore should be 0-100 (integer).
- scoreMetrics must have EXACTLY these 5 labels: "Market Timing", "Founder-Market Fit", "Product Moat", "Business Model", "Growth Trajectory".
- Each score must be 0-10 (can use 1 decimal). 
- If information is missing, score it lower (3-5) and note it in "gaps".
- Ensure the JSON is valid and contains no trailing commas.
- Do not include markdown formatting or extra text.`;

        let deckText = String(content || '').trim();
        if (file) {
            try {
                const extracted = await extractDeckTextFromBuffer(file.buffer, file.originalname, file.mimetype);
                deckText = extracted.text || deckText;
            } catch (err) {
                console.error('Failed to extract text from pitch deck file:', err);
            }
        }
        const hasDeckText = deckText.length > 0;
        const metadataContext = file
            ? `File metadata:\n- Name: ${file.originalname}\n- Mime type: ${file.mimetype}\n- Size bytes: ${file.size}`
            : 'No uploaded file metadata available.';

        const userPrompt = hasDeckText
            ? `Analyze this pitch deck content:\n\n${deckText}`
            : `A pitch deck file was uploaded but extracted text is not available. Use the following metadata and provide a best-effort investor review with explicit assumptions.\n\n${metadataContext}`;

        let responseText = '';

        if (process.env.OPENROUTER_API_KEY) {
            const openRouterModel =
                sanitizeEnvValue(process.env.OPENROUTER_PITCH_DECK_MODEL) ||
                sanitizeEnvValue(process.env.OPENROUTER_MODEL) ||
                DEFAULT_OPENROUTER_MODEL;
            const openRouterResponse = await callOpenRouter([
                {
                    role: 'system',
                    content: 'You are an expert pitch deck analyst. Return concise JSON only with executiveSummary, highlights, strengths, gaps, investorReadinessScore (0-100 integer).'
                },
                {
                    role: 'user',
                    content: `${analysisPrompt}\n\n${userPrompt}`
                }
            ], openRouterModel);

            if (openRouterResponse) {
                responseText = openRouterResponse;
            }
        }

        if (!responseText && process.env.GEMINI_API_KEY) {
            if (file && file.buffer && file.mimetype) {
                responseText = await callGeminiWithBuffer(file.buffer, file.mimetype, analysisPrompt) || '';
            } else {
                const fallback = await callGeminiWithText(String(content || ''), analysisPrompt);
                if (fallback) {
                    responseText = fallback;
                }
            }
        }

        if (!responseText) {
            const bytezResponse = await callBytez([
                {
                    role: 'user',
                    content: `${analysisPrompt}\n\n${userPrompt}`,
                },
            ]);
            if (bytezResponse) {
                responseText = bytezResponse;
            }
        }

        if (!responseText) {
            return res.json({
                summary: '📊 **Pitch Deck Analysis (Fallback Mode):** AI provider is currently unavailable or API key is invalid. Please verify `OPENROUTER_API_KEY` in `server/.env`.',
                highlights: [
                    'Problem and solution clarity',
                    'Market size and positioning',
                    'Business model and monetization',
                    'Team credibility',
                    'Funding ask and use of funds',
                ],
            });
        }

        const parsed = parseGeminiAnalysis(responseText);
        if (userId) {
            try {
                const analysisData = {
                    id: crypto.randomUUID(),
                    user: userId,
                    analysis: parsed,
                    source: file?.originalname || 'uploaded',
                    createdAt: new Date().toISOString()
                };
                const { error: insertErr } = await supabase.from('pitch_deck_analyses').insert([{ id: analysisData.id, data: analysisData }]);
                if (insertErr) console.warn('Failed to store pitch deck analysis:', insertErr.message);
                await incrementAiUsage(userId);
            } catch (error: any) {
                console.warn('Failed to store pitch deck analysis:', error?.message || error);
            }
        }
        return res.json(parsed);
    } catch (error: any) {
        console.error('AI Error (summarizePitchDeck):', error?.response?.data || error.message);
        // Graceful fallback instead of hard failure so the UI still shows a helpful result
        return res.json({
            summary: '📊 **Pitch Deck Analysis (Fallback Mode):** AI provider is currently unavailable or API key is invalid. Please verify `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, or `BYTEZ_API_KEY` in `server/.env`.',
            highlights: [
                'Problem and solution clarity',
                'Market size and positioning',
                'Business model and monetization',
                'Team credibility',
                'Funding ask and use of funds',
            ],
        });
    }
};

export const deriveDeckInsights = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user?.id || '');
        if (!userId) {
            return res.status(400).json({ message: 'Invalid user id.' });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);
        const { data: latestRow, error: latestErr } = await supabase
            .from('pitch_deck_analyses')
            .select('data')
            .eq('data->>user', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (latestErr && latestErr.code !== 'PGRST116') {
            console.error('deriveDeckInsights fetch error:', latestErr);
            return res.status(500).json({ message: 'Failed to fetch pitch deck analysis.' });
        }

        const latest = latestRow?.data;

        if (!latest) {
            return res.status(404).json({ message: 'No pitch deck analysis found for this user.' });
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(503).json({ message: 'AI provider unavailable. Configure OPENROUTER_API_KEY.' });
        }

        const { contextText } = await getUserContext(userId);
        const prompt = `You are Ignisha. Using the pitch deck analysis and user profile, generate JSON cards for the platform features.

Return STRICT JSON with this shape:
{
  "summary": "string",
  "cards": [
    {"type": "businessValidator", "data": {"score": 0, "verdict": "string", "strengths": ["string"], "risks": ["string"], "nextSteps": ["string"]}},
    {"type": "financialProjection", "data": {"assumptions": ["string"], "projections": [{"year": "Year 1", "revenue": "string", "expenses": "string", "runway": "string"}]}},
    {"type": "competitorAnalysis", "data": {"competitors": [{"name": "string", "focus": "string", "edge": "string"}]}},
    {"type": "contentDraft", "data": {"title": "string", "hook": "string", "outline": ["string"], "cta": "string"}},
    {"type": "templatePack", "data": {"templates": [{"name": "string", "type": "string", "tier": "Free"}]}}
  ]
}

Rules:
- Use the pitch deck analysis to inform all outputs.
- Keep responses concise and investor-grade.
- Output JSON only.`;

        const aiResponse = await callOpenRouterJson([
            { role: 'system', content: `${prompt}\n\n${requestContextText}` },
            {
                role: 'user',
                content: `${contextText}\n\nPitch deck analysis:\n${JSON.stringify(latest.analysis)}`,
            },
        ]);

        if (!aiResponse || !aiResponse.cards) {
            return res.status(503).json({ message: 'AI response unavailable.' });
        }

        await incrementAiUsage(userId);
        res.json(aiResponse);
    } catch (error: any) {
        console.error('Deck insights error:', error?.response?.data || error.message);
        res.status(500).json({ message: 'Failed to derive deck insights.' });
    }
};

// New: AI Chat endpoint for the Ignisha AI Dashboard
export const aiChat = async (req: AuthRequest, res: Response) => {
    try {
        const { message, conversationHistory, preferences } = req.body;

        const trimmedMessage = String(message || '').trim();
        if (!trimmedMessage) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        // Turn the user's AI Settings (Response Style + Personality) into concrete
        // directives that override the default tone/format below.
        const RESPONSE_STYLE_DIRECTIVES: Record<string, string> = {
            concise: 'Keep answers short and direct — a few sentences or a tight bullet list. No preamble or filler.',
            detailed: 'Give thorough, comprehensive answers with explanations, examples, and clearly structured sections.',
            'step-by-step': 'Structure the answer as an explicit numbered, step-by-step guide the founder can follow in order.',
        };
        const PERSONALITY_DIRECTIVES: Record<string, string> = {
            professional: 'Tone: polished, precise expert startup mentor.',
            casual: 'Tone: relaxed, friendly and conversational, like a knowledgeable friend.',
            motivational: 'Tone: high-energy and motivational — hype and encourage the founder while staying substantive.',
        };
        const prefLines = [
            RESPONSE_STYLE_DIRECTIVES[String(preferences?.responseStyle || '').toLowerCase()],
            PERSONALITY_DIRECTIVES[String(preferences?.aiPersonality || '').toLowerCase()],
        ].filter(Boolean);
        const preferenceText = prefLines.length
            ? `\n\n# USER PREFERENCES (follow these strictly — they override the personality and format defaults above)\n- ${prefLines.join('\n- ')}`
            : '';

        const userId = String(req.user?.id || '');
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);

        if (!process.env.OPENROUTER_API_KEY && !process.env.BYTEZ_API_KEY) {
            return res.status(503).json({
                message: 'AI provider unavailable. Configure OPENROUTER_API_KEY or BYTEZ_API_KEY.',
            });
        }

        const { contextText } = await getUserContext(userId);

        const messages = [
            {
                role: 'system',
                content: `You are Ignisha, an expert AI startup strategist for the NextIgnition platform. 
                
# MISSION
You help founders with business strategy, growth tactics, fundraising advice, market analysis, team building, and product development.

# PERSONALITY
- Insightful, actionable, and highly encouraging.
- Professional yet friendly, like a high-level mentor.
- Use relevant emojis sparingly to maintain a modern tech feel.

# RESPONSE FORMAT
- Use Markdown for everything.
- Use **bold** for key terms and headers for sections.
- Use bullet points for lists and tables for comparisons or data.
- Keep responses concise but comprehensive. If a response is long, use structured sections.
- NEVER return plain unformatted text block.

# CONTEXT
${contextText}\n\n${requestContextText}${preferenceText}`
            },
            ...(conversationHistory || []),
            { role: 'user', content: trimmedMessage }
        ];

        const aiResponse = await callTextModelWithFallback(messages);
        if (!aiResponse || !String(aiResponse).trim()) {
            return res.json({
                response:
                    'AI provider is currently unavailable (empty response). Please verify `OPENROUTER_API_KEY` / `BYTEZ_API_KEY` in `server/.env` and restart the backend.',
            });
        }
        
        await incrementAiUsage(userId);
        res.json({ response: aiResponse });
    } catch (error: any) {
        console.error('AI Chat Error:', error?.response?.data || error.message);
        res.status(500).json({ message: 'AI chat failed', error: error?.message });
    }
};

export const aiQuickAction = async (req: AuthRequest, res: Response) => {
    try {
        const { action, context } = req.body || {};
        if (!action) {
            return res.status(400).json({ message: 'Action is required.' });
        }

        // Demo-mode fallback (so the UI can still function in local/dev without keys)
        if (!process.env.OPENROUTER_API_KEY) {
            if (action === 'startup_health_check') {
                return res.json({
                    type: 'startupHealthCheck',
                    data: {
                        mode: 'demo',
                        overallScore: 76,
                        summary:
                            'Demo analysis (AI key missing). Add OPENROUTER_API_KEY in server/.env and restart the backend to enable real AI output.',
                        strengths: [
                            'Clear problem/solution framing (based on provided context)',
                            'Founder narrative is coherent',
                            'Profile completeness is trending positive',
                        ],
                        risks: [
                            'Traction metrics are missing or early-stage',
                            'Market sizing lacks source/assumptions',
                            'Go-to-market plan is not detailed',
                        ],
                        nextSteps: [
                            'Add traction numbers (users, revenue, pipeline) with dates',
                            'Clarify ICP, pricing, and distribution channels',
                            'Define a 90-day execution plan with milestones',
                        ],
                    },
                });
            }

            return res.json({
                type: 'generic',
                data: {
                    mode: 'demo',
                    summary:
                        'Demo response (AI key missing). Configure OPENROUTER_API_KEY in server/.env and restart the backend for real AI results.',
                },
            });
        }

        const { contextText: requestContextText } = formatAiRequestContext(req);
        const { contextText } = await getUserContext(String(req.user?.id));
        const baseContext = `${contextText}\n\n${requestContextText}\n\nAdditional context: ${String(context || '').trim() || 'N/A'}`;

        const actionMap: Record<string, { type: string; prompt: string }> = {
            validator: {
                type: 'businessValidator',
                prompt: `Return STRICT JSON with the following structure:
{
  "score": 0,
  "verdict": "string",
  "strengths": ["string"],
  "risks": ["string"],
  "nextSteps": ["string"]
}
Analyze this startup idea and provide an investor-grade validation.
CRITICAL RULES:
1. "score" MUST be an integer between 1 and 10.
2. If the user's idea is too vague or missing in the context, DO NOT say "insufficient data". Instead, use the "verdict" field to explicitly ask the user for more details (e.g. "I need to know your target audience and core problem to validate this properly. Could you elaborate?").
3. Output ONLY the valid JSON.`
            },
            financial: {
                type: 'financialProjection',
                prompt: `Return STRICT JSON with the following structure:
{
  "assumptions": ["string"],
  "projections": [
    {"year": "Year 1", "revenue": "string", "expenses": "string", "runway": "string"},
    {"year": "Year 2", "revenue": "string", "expenses": "string", "runway": "string"},
    {"year": "Year 3", "revenue": "string", "expenses": "string", "runway": "string"}
  ]
}
Provide a realistic early-stage 3-year financial projection. Output ONLY the JSON.`
            },
            competitor: {
                type: 'competitorAnalysis',
                prompt: `Return STRICT JSON with the following structure:
{
  "competitors": [
    {"name": "string", "focus": "string", "edge": "string"}
  ]
}
Identify 3-5 key competitors and your unique advantage over them. Output ONLY the JSON.`
            },
            content: {
                type: 'contentDraft',
                prompt: `Return STRICT JSON with the following structure:
{
  "title": "string",
  "hook": "string",
  "outline": ["string"],
  "cta": "string"
}
Generate a compelling founder-facing LinkedIn post outline. Output ONLY the JSON.`
            },
            template: {
                type: 'templatePack',
                prompt: `Return STRICT JSON with the following structure:
{
  "templates": [
    {"name": "string", "type": "string", "tier": "Free" | "Premium"}
  ]
}
Suggest 4-6 essential document templates for this startup stage. Output ONLY the JSON.`
            },
        };

        if (!actionMap[action]) {
            // Provide a generic fallback for unknown actions instead of failing
            actionMap[action] = {
                type: 'generic',
                prompt: `Return STRICT JSON with the following structure:
{
  "summary": "string",
  "details": ["string", "string"]
}
Provide a helpful, expert response for the following requested area/action: "${action}". Output ONLY the JSON.`
            };
        }

        const { type, prompt } = actionMap[action];
        const aiTextResponse = await callTextModelWithFallback([
            {
                role: 'system',
                content: `You are Ignisha, an expert startup strategist. ${prompt}`,
            },
            {
                role: 'user',
                content: baseContext,
            },
        ]);

        const aiResponse = aiTextResponse ? parseJsonFromText(aiTextResponse) : null;

        if (!aiResponse) {
            return res.json({
                type: 'generic',
                data: {
                    mode: 'demo',
                    summary: 'Demo response (AI provider unavailable or keys missing). Check server/.env for OPENROUTER_API_KEY.'
                }
            });
        }

        res.json({ type, data: aiResponse });
    } catch (error: any) {
        console.error('AI Quick Action Error:', error?.response?.data || error.message);
        res.status(500).json({ message: 'AI quick action failed' });
    }
};

export const matchCofounders = async (req: AuthRequest, res: Response) => {
    try {
        const { skills, location, commitment, startupStatus } = req.body || {};
        const { user, contextText } = await getUserContext(String(req.user?.id));

        let query = supabase.from('cofounder_profiles').select('id, data');
        if (commitment) query = query.eq('data->>commitment', commitment);
        if (startupStatus && startupStatus !== 'all') query = query.eq('data->>startupStatus', startupStatus);

        const { data: profileRows, error: profileErr } = await query.limit(20);
        if (profileErr) console.error('matchCofounders profile fetch error:', profileErr);
        const profiles = (profileRows || []).map(r => ({ ...r.data, id: r.id }));

        const userSkills = normalizeArray(user?.profile?.skills || []);
        const userInterests = normalizeArray(user?.profile?.interests || []);

        const matches = profiles.map((profile: any) => {
            const profileSkills = normalizeArray(profile.skills || []);
            const profileStrengths = normalizeArray(profile.strengths || []);
            const score = 6 +
                computeMatchScore(userSkills, profileSkills) * 0.8 +
                computeMatchScore(userInterests, profileStrengths) * 0.4 +
                (location && profile.location && profile.location.toLowerCase().includes(String(location).toLowerCase()) ? 0.8 : 0) +
                (commitment && profile.commitment === commitment ? 0.6 : 0);

            const matchScore = Math.min(10, Math.max(0, Math.round(score * 10) / 10));
            const topSkills = profileSkills.slice(0, 3);
            return {
                id: profile.user || profile.id,
                name: profile.user?.name || profile.name,
                avatar: profile.user?.avatar || profile.avatar,
                role: profile.currentRole || profile.user?.role,
                location: profile.location || profile.user?.profile?.location,
                matchScore,
                skills: topSkills,
                reason: profile.vision || profile.lookingFor || 'Aligned on goals and skills.'
            };
        }).sort((a, b) => b.matchScore - a.matchScore);

        let summary = 'Top co-founder matches based on your profile.';
        if (process.env.OPENROUTER_API_KEY && matches.length > 0) {
            const summaryResponse = await callOpenRouter([
                {
                    role: 'system',
                    content: 'Summarize why these co-founders match the user in 2 sentences.'
                },
                {
                    role: 'user',
                    content: `${contextText}\n\nMatches:\n${JSON.stringify(matches.slice(0, 5))}`
                }
            ], await getOpenRouterTextModel());
            if (summaryResponse) summary = summaryResponse;
        }

        await incrementAiUsage(String(req.user?.id));
        res.json({ type: 'cofounderMatches', matches, summary });
    } catch (error: any) {
        console.error('Cofounder matching failed:', error?.response?.data || error.message);
        res.status(500).json({ message: 'Cofounder matching failed' });
    }
};

export const matchClients = async (req: AuthRequest, res: Response) => {
    try {
        const { industry, stage } = req.body || {};
        const { user, contextText } = await getUserContext(String(req.user?.id));

        let query = supabase.from('startups').select('id, data');
        if (stage) query = query.eq('data->>stage', stage);

        const { data: startupRows, error: startupErr } = await query.limit(20);
        if (startupErr) console.error('matchClients startup fetch error:', startupErr);
        const startups = (startupRows || []).map(r => ({ ...r.data, id: r.id }));

        const expertise = normalizeArray(user?.profile?.expertise || []);
        const skills = normalizeArray(user?.profile?.skills || []);

        const matches = startups.map((startup: any) => {
            const industryTokens = normalizeArray(startup.industry ? [startup.industry] : []);
            const overlapScore = computeMatchScore(industryTokens, [...expertise, ...skills]);
            const score = Math.min(10, Math.max(0, 6 + overlapScore * 0.8));
            return {
                id: startup.id || startup._id,
                name: startup.name,
                stage: startup.stage,
                location: startup.location,
                budget: startup.funding?.target ? `$${startup.funding.target.toLocaleString()} target` : 'Budget TBD',
                need: startup.description,
                matchScore: Math.round(score * 10) / 10,
            };
        }).sort((a, b) => b.matchScore - a.matchScore);

        let summary = 'Top client opportunities matched to your expertise.';
        if (process.env.OPENROUTER_API_KEY && matches.length > 0) {
            const summaryResponse = await callOpenRouter([
                {
                    role: 'system',
                    content: 'Summarize why these startups could be strong client matches in 2 sentences.'
                },
                {
                    role: 'user',
                    content: `${contextText}\n\nMatches:\n${JSON.stringify(matches.slice(0, 5))}`
                }
            ], await getOpenRouterTextModel());
            if (summaryResponse) summary = summaryResponse;
        }

        await incrementAiUsage(String(req.user?.id));
        res.json({ type: 'clientMatches', matches, summary });
    } catch (error: any) {
        console.error('Client matching failed:', error?.response?.data || error.message);
        res.status(500).json({ message: 'Client matching failed' });
    }
};

// New: Expert matching AI
export const matchExperts = async (req: AuthRequest, res: Response) => {
    try {
        const { needs, industry, stage } = req.body;
        const { contextText } = await getUserContext(String(req.user?.id));

        const { data: expertRows, error: expertErr } = await supabase.from('users')
            .select('id, data')
            .or('data->>role.eq.expert,data->>roles.cs.["expert"]')
            .limit(30);
        if (expertErr) console.error('matchExperts fetch error:', expertErr);

        const experts = (expertRows || []).map(r => ({ ...r.data, id: r.id }));

        const needTokens = normalizeArray(String(needs || industry || '').split(/[\s,]+/).filter(Boolean));

        const matches = experts.map((expert: any) => {
            const expertise = normalizeArray(expert.profile?.expertise || []);
            const skills = normalizeArray(expert.profile?.skills || []);
            const overlapScore = computeMatchScore(needTokens, [...expertise, ...skills]);
            const score = Math.min(10, Math.max(0, 6 + overlapScore * 0.8));
            return {
                id: expert.id || expert._id,
                name: expert.name,
                avatar: expert.avatar,
                specialty: expertise[0] || 'Startup advisory',
                location: expert.profile?.location,
                rating: 4.5 + Math.min(0.5, overlapScore * 0.1),
                highlights: expertise.slice(0, 3),
                matchScore: Math.round(score * 10) / 10,
            };
        }).sort((a, b) => b.matchScore - a.matchScore);

        let summary = 'Top experts matched to your needs.';
        if (process.env.OPENROUTER_API_KEY && matches.length > 0) {
            const summaryResponse = await callOpenRouter([
                {
                    role: 'system',
                    content: 'Summarize why these experts fit the user in 2 sentences.'
                },
                {
                    role: 'user',
                    content: `${contextText}\n\nNeeds: ${needs || 'N/A'}\nMatches:\n${JSON.stringify(matches.slice(0, 5))}`
                }
            ], await getOpenRouterTextModel());
            if (summaryResponse) summary = summaryResponse;
        }

        await incrementAiUsage(String(req.user?.id));
        res.json({ type: 'expertMatches', matches, summary });
    } catch (error: any) {
        console.error('Expert matching failed:', error?.response?.data || error.message);
        res.status(500).json({ message: 'Expert matching failed' });
    }
};

export const getQueriesLeft = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const { data: userRow, error: userErr } = await supabase
            .from('users')
            .select('data, founder_plan, expert_plan, investor_plan')
            .eq('id', userId)
            .single();
        if (userErr || !userRow) return res.status(404).json({ message: 'User not found' });

        const user = userRow.data;
        const role: string = user?.role || 'founder';
        const planKey = `${role}_plan` as 'founder_plan' | 'expert_plan' | 'investor_plan';
        const rawPlan = userRow[planKey] || user?.[planKey] || 'free';
        // StoreKit IAP premium (webhook-set flag) counts as top tier.
        const plan = user?.iapPremium ? 'elite' : String(rawPlan).toLowerCase();

        // Plan-based daily limits: free=5, pro=30, elite=100
        const PLAN_LIMITS: Record<string, number> = { free: 5, pro: 30, elite: 100 };
        const maxQueries = PLAN_LIMITS[plan] ?? 5;

        const today = new Date().toISOString().split('T')[0];
        const aiUsage = user.aiUsage;
        const used = (aiUsage?.lastQueryDate === today) ? (aiUsage?.queries || 0) : 0;

        res.json({ used, total: maxQueries, left: Math.max(0, maxQueries - used), plan });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get query limits' });
    }
};

/**
 * Checks if user has enough AI queries left for today.
 * Returns true if allowed, false if limit reached.
 */
async function checkAiLimit(userId: string): Promise<boolean> {
    try {
        const { data: userRow } = await supabase
            .from('users')
            .select('data, founder_plan, expert_plan, investor_plan')
            .eq('id', userId)
            .single();
        if (!userRow) return false;

        const user = userRow.data;
        const role: string = user?.role || 'founder';
        const planKey = `${role}_plan` as 'founder_plan' | 'expert_plan' | 'investor_plan';
        const rawPlan = userRow[planKey] || user?.[planKey] || 'free';
        const plan = user?.iapPremium ? 'elite' : String(rawPlan).toLowerCase();

        // Plan-based daily limits
        const PLAN_LIMITS: Record<string, number> = { free: 5, pro: 30, elite: 100 };
        const maxQueries = PLAN_LIMITS[plan] ?? 5;

        // Reset usage if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (user.aiUsage?.lastQueryDate !== today) {
            user.aiUsage = { queries: 0, lastQueryDate: today };
            await supabase.from('users').update({ data: user }).eq('id', userId);
            return true;
        }

        const used = user.aiUsage?.queries || 0;
        return used < maxQueries;
    } catch (error) {
        console.error('Error checking AI limit:', error);
        return true; // Default to allow on error
    }
}


async function incrementAiUsage(userId: string) {
    try {
        const { data: userRow, error: fetchErr } = await supabase.from('users').select('data').eq('id', userId).single();
        if (fetchErr || !userRow) return;

        const user = userRow.data;
        const today = new Date().toISOString().split('T')[0];
        
        if (!user.aiUsage) user.aiUsage = { queries: 0, lastQueryDate: today };
        if (user.aiUsage.lastQueryDate !== today) {
            user.aiUsage = { queries: 0, lastQueryDate: today };
        }
        
        user.aiUsage.queries = (user.aiUsage.queries || 0) + 1;
        user.updatedAt = new Date().toISOString();

        const { error: updateErr } = await supabase.from('users').update({ data: user }).eq('id', userId);
        if (updateErr) console.error('Failed to update AI usage:', updateErr);
    } catch (error) {
        console.error('Failed to increment AI usage:', error);
    }
}

// ... (Ensure aiChat and aiQuickAction call incrementAiUsage)
