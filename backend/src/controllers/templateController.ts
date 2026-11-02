import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import axios from 'axios';

// ─── Templated.io ─────────────────────────────────────────────────────────────
const TEMPLATED_API_URL = 'https://api.templated.io/v1/render';
const CACHED_TEMPLATED_KEY = (process.env.TEMPLATED_API_KEY || '').trim();

// ─── OpenRouter (for AI slide filling) ────────────────────────────────────────
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
const CACHED_OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^['\"`]+|['\"`]+$/g, '').trim();

// ─── Template definitions ─────────────────────────────────────────────────────
export type TemplateType = 'pitch-deck';

type TemplateSlideSchema = {
    id: string;
    name: string;
    fields: string[];
};

type TemplateDefinition = {
    id: string;
    type: TemplateType;
    name: string;
    description: string;
    tier: 'Free';
    slides: TemplateSlideSchema[];
};

const TEMPLATES: TemplateDefinition[] = [
    {
        id: 'pitch-deck-classic-10',
        type: 'pitch-deck',
        name: 'Classic Investor Deck (10 slides)',
        description: 'A standard 10-slide investor story with crisp sections and minimalism.',
        tier: 'Free',
        slides: [
            { id: 's1', name: 'Cover', fields: ['startupName', 'tagline', 'founderName'] },
            { id: 's2', name: 'Problem', fields: ['problemStatement', 'whoHasProblem', 'whyNow'] },
            { id: 's3', name: 'Solution', fields: ['solutionOverview', 'keyBenefits', 'whyWeWin'] },
            { id: 's4', name: 'Market', fields: ['targetCustomer', 'marketSize', 'marketTrends'] },
            { id: 's5', name: 'Product', fields: ['productDescription', 'differentiators', 'roadmapNext'] },
            { id: 's6', name: 'Business Model', fields: ['pricing', 'revenueStreams', 'unitEconomicsNotes'] },
            { id: 's7', name: 'Go-to-Market', fields: ['gtmChannels', 'salesMotion', 'growthLoops'] },
            { id: 's8', name: 'Competition', fields: ['competitors', 'positioning', 'moat'] },
            { id: 's9', name: 'Traction', fields: ['tractionMetrics', 'milestones', 'proofPoints'] },
            { id: 's10', name: 'Ask', fields: ['fundingAsk', 'useOfFunds', 'runwayPlan'] },
        ],
    },
    {
        id: 'pitch-deck-story-12',
        type: 'pitch-deck',
        name: 'Narrative Deck (12 slides)',
        description: 'Story-first template emphasising clarity, market insight, and execution plan.',
        tier: 'Free',
        slides: [
            { id: 's1', name: 'Cover', fields: ['startupName', 'tagline', 'founderName'] },
            { id: 's2', name: 'One-liner', fields: ['oneLiner', 'whoWeServe', 'outcome'] },
            { id: 's3', name: 'Problem', fields: ['problemStatement', 'evidence', 'costOfInaction'] },
            { id: 's4', name: 'Solution', fields: ['solutionOverview', 'howItWorks', 'keyBenefits'] },
            { id: 's5', name: 'Why Now', fields: ['whyNow', 'tailwinds', 'timing'] },
            { id: 's6', name: 'Market', fields: ['targetCustomer', 'marketSize', 'beachhead'] },
            { id: 's7', name: 'Competition', fields: ['competitors', 'positioning', 'whyWeWin'] },
            { id: 's8', name: 'Business Model', fields: ['pricing', 'revenueStreams', 'unitEconomicsNotes'] },
            { id: 's9', name: 'Go-to-Market', fields: ['gtmChannels', 'salesMotion', 'growthLoops'] },
            { id: 's10', name: 'Traction', fields: ['tractionMetrics', 'milestones', 'proofPoints'] },
            { id: 's11', name: 'Team', fields: ['teamHighlights', 'advisors', 'hiringPlan'] },
            { id: 's12', name: 'Ask', fields: ['fundingAsk', 'useOfFunds', 'runwayPlan'] },
        ],
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Call OpenRouter and parse the JSON response. Returns null on any failure. */
const callOpenRouterJson = async (messages: { role: string; content: string }[], model?: string) => {
    if (!CACHED_OPENROUTER_KEY) return null;
    const targetModel = model || DEFAULT_OPENROUTER_MODEL;

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            { model: targetModel, messages, max_tokens: 2200 },
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

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) return null;

        const trimmed = String(content).trim();
        const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/```\s*([\s\S]*?)\s*```/i);
        const candidate = fencedMatch?.[1] || trimmed;
        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        const jsonStr = firstBrace >= 0 && lastBrace > firstBrace ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
};

/** Fetch the most recent pitch deck analysis for a user from Supabase. */
const getLatestAnalysisForUser = async (userId: string) => {
    const { data, error } = await supabase
        .from('pitch_deck_analyses')
        .select('data')
        .eq('data->>user', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return null;
    return data.data?.analysis ?? data.data ?? null;
};

/** Build AI fill prompt from template schema. */
const buildFillPrompt = (templateId: string, schema: Record<string, string[]>) =>
    `You are Ignisha AI. Fill a pitch deck template using the provided pitch deck analysis.

Return STRICT JSON with this shape:
{
  "templateId": "${templateId}",
  "slides": [
    {
      "id": "s1",
      "name": "Cover",
      "content": { "fieldName": "value" }
    }
  ]
}

Rules:
- Output JSON only, no explanation.
- For each slide, include ONLY the fields listed.
- Each field value must be 1-2 short sentences or bullet-like phrases (max 25 words).
- Avoid long paragraphs.
- If info is missing, write a reasonable placeholder and mark it with '(Assumption)'.

Template schema:
${JSON.stringify(schema, null, 2)}`;

/**
 * Render a single pitch deck slide as an image/PDF via Templated.io.
 * Uses a generic text-overlay template approach (layers: title, body, footer).
 */
const renderSlideViaTemplated = async (
    slide: { id: string; name?: string; content: Record<string, any> },
    format: 'jpg' | 'png' | 'pdf' = 'jpg'
): Promise<{ url: string; renderId: string } | null> => {
    if (!CACHED_TEMPLATED_KEY) return null;

    const bodyText = Object.entries(slide.content || {})
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v ?? '')}`)
        .join('\n');

    try {
        const response = await axios.post(
            TEMPLATED_API_URL,
            {
                // Use the user-provided Templated template ID
                // If the user hasn't created one yet, we send a placeholder
                // and fall through to the PPTX path.
                template: process.env.TEMPLATED_TEMPLATE_ID || 'pitch-slide-default',
                format,
                name: `slide-${slide.id}-${Date.now()}`,
                external_id: slide.id,
                layers: {
                    'title': { text: slide.name || 'Slide' },
                    'body': { text: bodyText },
                    'footer': { text: 'Generated by Ignisha AI · nextignition.com' },
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CACHED_TEMPLATED_KEY}`,
                },
                timeout: 30000,
            }
        );

        const url = response.data?.url ?? response.data?.render_url;
        const renderId = response.data?.id;
        if (!url && !renderId) return null;
        return { url: url || '', renderId: renderId || '' };
    } catch {
        return null;
    }
};

// ─── Route handlers ───────────────────────────────────────────────────────────

export const listTemplates = async (req: AuthRequest, res: Response) => {
    const type = String((req.query?.type as string) || 'pitch-deck') as TemplateType;
    const templates = TEMPLATES.filter((t) => t.type === type);
    return res.json(templates.map((t) => ({
        id: t.id,
        type: t.type,
        name: t.name,
        description: t.description,
        tier: t.tier,
        slideCount: t.slides.length,
        slides: t.slides,
    })));
};

export const fillTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user?.id || '');
        const templateId = String(req.params.templateId || '');

        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) return res.status(404).json({ message: 'Template not found' });

        // Support optional override: user can pass analysis JSON directly
        const { analysis: inlineAnalysis } = req.body as { analysis?: any };
        const analysis = inlineAnalysis || await getLatestAnalysisForUser(userId);

        if (!analysis) {
            return res.status(404).json({
                message: 'No pitch deck analysis found. Upload and analyze a pitch deck first via "Analyze My Pitch Deck".',
            });
        }

        const schema: Record<string, string[]> = {};
        template.slides.forEach((s) => { schema[s.id] = s.fields; });

        const aiResponse = await callOpenRouterJson(
            [
                { role: 'system', content: buildFillPrompt(template.id, schema) },
                { role: 'user', content: `Pitch deck analysis:\n${JSON.stringify(analysis)}` },
            ],
            process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL
        );

        if (!aiResponse?.slides) {
            return res.status(502).json({ message: 'AI provider unavailable or returned invalid JSON. Check OPENROUTER_API_KEY.' });
        }

        return res.json({
            templateId: template.id,
            templateName: template.name,
            slides: aiResponse.slides,
        });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to fill template', error: error?.message });
    }
};

export const exportTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user?.id || '');
        const templateId = String(req.params.templateId || '');
        const { slides: providedSlides, analysis: inlineAnalysis, format = 'jpg' } = req.body as {
            slides?: { id: string; name?: string; content: Record<string, any> }[];
            analysis?: any;
            format?: 'jpg' | 'png' | 'pdf';
        };

        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) return res.status(404).json({ message: 'Template not found' });

        let filledSlides = providedSlides;

        // If slides weren't supplied, fill them via AI first
        if (!filledSlides || filledSlides.length === 0) {
            const analysis = inlineAnalysis || await getLatestAnalysisForUser(userId);

            if (!analysis) {
                return res.status(404).json({
                    message: 'No pitch deck analysis found. Upload and analyze a pitch deck first.',
                });
            }

            const schema: Record<string, string[]> = {};
            template.slides.forEach((s) => { schema[s.id] = s.fields; });

            const aiResponse = await callOpenRouterJson(
                [
                    { role: 'system', content: buildFillPrompt(template.id, schema) },
                    { role: 'user', content: `Pitch deck analysis:\n${JSON.stringify(analysis)}` },
                ],
                process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL
            );

            if (!aiResponse?.slides) {
                return res.status(502).json({ message: 'AI provider unavailable. Check OPENROUTER_API_KEY.' });
            }

            filledSlides = aiResponse.slides;
        }

        // Try Templated.io first for rich renders
        if (CACHED_TEMPLATED_KEY) {
            const renderResults = await Promise.all(
                (filledSlides || []).map((slide) => renderSlideViaTemplated(slide, format as any))
            );

            const templatedSlides = renderResults.map((r, i) => ({
                ...(filledSlides![i] || {}),
                renderUrl: r?.url || null,
                renderId: r?.renderId || null,
            }));

            // If Templated rendered at least one slide, return render results
            if (templatedSlides.some((s) => s.renderUrl || s.renderId)) {
                return res.json({
                    templateId: template.id,
                    templateName: template.name,
                    format,
                    slides: templatedSlides,
                    provider: 'templated.io',
                });
            }
        }

        // Fallback: PPTX export
        const { exportFilledTemplateToPptx } = require('../utils/pptxExporter');
        const result = await exportFilledTemplateToPptx({
            templateId: template.id,
            templateName: template.name,
            slides: filledSlides || [],
        });

        return res.json({
            templateId: template.id,
            templateName: template.name,
            format: 'pptx',
            fileName: result.fileName,
            downloadUrl: result.downloadUrl,
            provider: 'pptx',
        });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to export template', error: error?.message });
    }
};

/** Poll a Templated.io render status by its render ID. */
export const getRenderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { renderId } = req.params;
        if (!CACHED_TEMPLATED_KEY) {
            return res.status(503).json({ message: 'Templated.io not configured' });
        }

        const response = await axios.get(`https://api.templated.io/v1/render/${renderId}`, {
            headers: { 'Authorization': `Bearer ${CACHED_TEMPLATED_KEY}` },
            timeout: 10000,
        });

        return res.json(response.data);
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to get render status', error: error?.message });
    }
};
