import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { extractDeckTextFromBuffer } from '../utils/deckTextExtractor';
import axios from 'axios';
import { io } from '../utils/socket';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { uploadPublicFile } from '../utils/storage';

const getBaseUrl = () => process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const FUNDING_DOCS_BUCKET = process.env.FUNDING_DOCS_BUCKET || 'funding-docs';

const sanitizeEnvValue = (value?: string) => {
    if (!value) return '';
    return value.trim().replace(/^['"`]+|['"`]+$/g, '').trim();
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

const callOpenRouter = async (messages: { role: string; content: string }[], model?: string) => {
    const apiKey = sanitizeEnvValue(process.env.OPENROUTER_API_KEY);
    if (!apiKey) return null;
    const targetModel = sanitizeEnvValue(model) || DEFAULT_OPENROUTER_MODEL;
    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: targetModel,
                messages,
                max_tokens: 1600,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000',
                    'X-Title': 'NextIgnition Platform',
                },
                timeout: 60000,
            }
        );
        return response.data?.choices?.[0]?.message?.content || null;
    } catch (error: any) {
        console.error('OpenRouter error:', error?.response?.data || error?.message || error);
        return null;
    }
};

const parseJsonFromText = (text: string) => {
    try {
        const trimmed = text.trim();
        const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/```\s*([\s\S]*?)\s*```/i);
        const candidate = fencedMatch?.[1] || trimmed;
        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        const jsonStr = (firstBrace >= 0 && lastBrace > firstBrace) ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
};



const getExtFromFileName = (fileName: string | undefined) => {
    const safe = String(fileName || '').trim();
    const match = safe.match(/\.([a-zA-Z0-9]{1,10})$/);
    return match ? match[1].toLowerCase() : '';
};

const uploadFundingFile = async (args: {
    file: Express.Multer.File;
    prefix: string;
    ownerId: string;
}) => {
    const ext = getExtFromFileName(args.file.originalname) || 'bin';
    const objectPath = `${args.prefix}/${args.ownerId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const uploaded = await uploadPublicFile({
        bucket: FUNDING_DOCS_BUCKET,
        objectPath,
        buffer: args.file.buffer,
        contentType: args.file.mimetype,
    });
    return {
        url: uploaded.publicUrl,
        originalName: args.file.originalname,
        size: args.file.size,
        uploadedAt: new Date().toISOString(),
        bucket: uploaded.bucket,
        path: uploaded.path,
        mimeType: args.file.mimetype,
    };
};

export const getMyFundingDraft = async (req: AuthRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('funding_applications').select('id, data').eq('data->>founder', req.user.id).eq('data->>status', 'draft').single();
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching funding draft:', error);
            return res.status(500).json({ message: 'Failed to fetch draft' });
        }
        res.json(data ? { _id: data.id, id: data.id, ...data.data } : null);
    } catch (error: any) {
        console.error('getMyFundingDraft error:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const upsertMyFundingDraft = async (req: AuthRequest, res: Response) => {
    try {
        const { data: existingRow, error: fetchError } = await supabase.from('funding_applications').select('id, data').eq('data->>founder', req.user.id).eq('data->>status', 'draft').single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching existing draft:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch draft' });
        }

        const update = { ...req.body };
        const id = existingRow?.id || Math.random().toString(36).substring(2, 15);
        const draftData = {
            ...(existingRow?.data || {}),
            ...update,
            founder: req.user.id,
            status: 'draft',
            updatedAt: new Date().toISOString()
        };

        const { data: draftRow, error: upsertError } = await supabase.from('funding_applications').upsert([{ id, data: draftData }]).select().single();
        if (upsertError) {
            console.error('Error upserting draft:', upsertError);
            return res.status(500).json({ message: 'Failed to save draft' });
        }
        const draft = draftRow?.data;

        if (draft) {
            const industryStr = draft.tags?.length ? draft.tags.join(',') : 'General';
            const name = draft.title || 'Untitled Startup';
            const description = draft.pitchSummary || 'Funding application in progress.';
            const fundingTarget = Number(draft.fundingAsk || 0);
            const fundingCurrency = draft.currency || 'USD';
            const equity = Number(draft.equityOffered || 0);

            if (!draft.startup) {
                const startupId = Math.random().toString(36).substring(2, 15);
                const startupData = {
                    id: startupId,
                    founder: req.user.id,
                    name,
                    description,
                    industry: industryStr,
                    stage: 'idea',
                    equity,
                    milestones: [{ title: 'Funding application created', completed: false, date: new Date().toISOString() }],
                    funding: { target: fundingTarget, raised: 0, currency: fundingCurrency },
                    team: [{ user: req.user.id, role: 'Founder' }],
                };
                const { error: startupError } = await supabase.from('startups').insert([{ id: startupId, data: startupData }]);
                if (startupError) {
                    console.error('Error creating startup:', startupError);
                } else {
                    draft.startup = startupId;
                    const { error: updateError } = await supabase.from('funding_applications').update({ data: draft }).eq('id', id);
                    if (updateError) {
                        console.error('Error updating draft with startup:', updateError);
                    }
                }
            } else {
                const { data: sRow, error: sError } = await supabase.from('startups').select('data').eq('id', draft.startup).single();
                if (sError) {
                    console.error('Error fetching startup:', sError);
                } else if (sRow) {
                    const sData = { ...sRow.data, name, description, industry: industryStr, equity, funding: { ...sRow.data.funding, target: fundingTarget, currency: fundingCurrency } };
                    const { error: updateError } = await supabase.from('startups').update({ data: sData }).eq('id', draft.startup);
                    if (updateError) {
                        console.error('Error updating startup:', updateError);
                    }
                }
            }
        }
        return res.json({ _id: id, id, ...draft });
    } catch (error: any) {
        console.error('upsertMyFundingDraft error:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const uploadMyPitchDeck = async (req: AuthRequest, res: Response) => {
    try {
        const file = (req as any).file as Express.Multer.File;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });
        const meta = await uploadFundingFile({ file, prefix: 'pitch-decks', ownerId: req.user.id });

        const { data: existingRow, error: fetchError } = await supabase.from('funding_applications').select('id, data').eq('data->>founder', req.user.id).eq('data->>status', 'draft').single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching draft for pitch deck:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch draft' });
        }
        const id = existingRow?.id || Math.random().toString(36).substring(2, 15);
        const draftData = {
            ...(existingRow?.data || {}),
            founder: req.user.id,
            status: 'draft',
            pitchDeck: meta,
            pitchDeckUrl: meta.url,
            steps: { ...(existingRow?.data?.steps || {}), pitchDeckUploaded: true }
        };
        const { error: upsertError } = await supabase.from('funding_applications').upsert([{ id, data: draftData }]);
        if (upsertError) {
            console.error('Error upserting funding application:', upsertError);
            return res.status(500).json({ message: 'Failed to update application' });
        }

        // Ensure Startup exists
        if (!draftData.startup) {
            const sId = Math.random().toString(36).substring(2, 15);
            const sData = { id: sId, founder: req.user.id, name: draftData.title || 'Untitled', pitchDeckUrl: meta.url };
            await supabase.from('startups').insert([{ id: sId, data: sData }]);
            draftData.startup = sId;
            await supabase.from('funding_applications').update({ data: draftData }).eq('id', id);
        } else {
            const { data: sRow } = await supabase.from('startups').select('data').eq('id', draftData.startup).single();
            if (sRow) await supabase.from('startups').update({ data: { ...sRow.data, pitchDeckUrl: meta.url } }).eq('id', draftData.startup);
        }

        // Sync to DealRoom
        const drId = Math.random().toString(36).substring(2, 15);
        const { data: drRow, error: drFetchError } = await supabase.from('deal_rooms').select('id, data').eq('data->>fundingApplication', id).single();
        if (drFetchError && drFetchError.code !== 'PGRST116') {
            console.error('Error fetching deal room:', drFetchError);
        }
        const dealRoomData = drRow ? { ...drRow.data, startup: draftData.startup } : { id: drId, fundingApplication: id, founder: req.user.id, startup: draftData.startup, investorIds: [], stage: 'under_review' };
        const { error: drUpsertError } = await supabase.from('deal_rooms').upsert([{ id: drRow?.id || drId, data: dealRoomData }]);
        if (drUpsertError) {
            console.error('Error upserting deal room:', drUpsertError);
        }
        const finalDrId = drRow?.id || drId;

        // Create DealRoomDocument
        const docId = Math.random().toString(36).substring(2, 15);
        const docData = { id: docId, dealRoom: finalDrId, type: 'pitchDeck', category: 'Pitch Deck', file: meta, uploadedBy: req.user.id };
        const { error: docInsertError } = await supabase.from('deal_room_documents').insert([{ id: docId, data: docData }]);
        if (docInsertError) {
            console.error('Error inserting deal room document:', docInsertError);
        }

        const extracted = await extractDeckTextFromBuffer(file.buffer, file.originalname, file.mimetype);

        // AI analysis - Unified with professional prompt
        const analysisPrompt = `You are a world-class Venture Capital (VC) Analyst. 
        Analyze the following pitch deck and provide a deep-dive investment evaluation.
        Return STRICT JSON:
        {
          "executiveSummary": "string",
          "highlights": ["string"],
          "strengths": ["string"],
          "gaps": ["string"],
          "redFlags": ["string"],
          "moatType": "string",
          "investorReadinessScore": 0,
          "scoreMetrics": [{ "label": "label", "score": 0, "note": "note" }]
        }`;

        const aiResponseText = await callOpenRouter([
            { role: 'system', content: 'You are an expert pitch deck analyst. Return concise JSON only.' },
            { role: 'user', content: `${analysisPrompt}\n\nContent:\n${extracted.text || 'No text extracted'}` }
        ]);
        
        const analysis = aiResponseText ? parseJsonFromText(aiResponseText) : null;

        if (analysis) {
            const aId = Math.random().toString(36).substring(2, 15);
            const finalAnalysisData = {
                user: req.user.id,
                fundingApplication: id,
                dealRoom: finalDrId,
                document: docId,
                analysis,
                source: file.originalname,
                createdAt: new Date().toISOString()
            };
            await supabase.from('pitch_deck_analyses').insert([{ id: aId, data: finalAnalysisData }]);

            // AUTOMATE CHECKLIST: Add a task for every gap found by AI
            if (Array.isArray(analysis.gaps) && analysis.gaps.length > 0) {
                const aiTasks = analysis.gaps.map((gap: string) => ({
                    id: `ai_${Math.random().toString(36).substring(2, 7)}`,
                    text: `Resolve Gap: ${gap}`,
                    category: 'Due Diligence (AI Identified)',
                    completed: false,
                    source: 'AI Analysis'
                }));

                const currentChecklist = Array.isArray(dealRoomData.checklist) ? dealRoomData.checklist : [
                    { id: '1', text: 'Sign Non-Disclosure Agreement (NDA)', completed: false, category: 'Legal' },
                    { id: '2', text: 'Initial VC Problem/Solution Fit Validation', completed: false, category: 'Strategy' },
                    { id: '3', text: 'Deep Dive into Financials & Revenue Model', completed: false, category: 'Financial' },
                    { id: '4', text: 'Technical & Security Architecture Review', completed: false, category: 'Technical' },
                    { id: '5', text: 'Legal IP & Corporate Compliance Check', completed: false, category: 'Legal' },
                    { id: '6', text: 'Final Term Sheet Negotiation', completed: false, category: 'Funding' }
                ];

                const updatedChecklist = [...currentChecklist, ...aiTasks];
                await supabase.from('deal_rooms').update({ 
                    data: { ...dealRoomData, checklist: updatedChecklist } 
                }).eq('id', drRow?.id || drId);
            }
        }

        return res.json({ draft: draftData, dealRoomId: finalDrId, pitchDeckAnalysis: analysis });
    } catch (error: any) {
        res.status(500).json({ message: 'Upload failed', error: error?.message });
    }
};

export const uploadMyPitchVideo = async (req: AuthRequest, res: Response) => {
    try {
        const file = (req as any).file as Express.Multer.File;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });
        const meta = await uploadFundingFile({ file, prefix: 'pitch-videos', ownerId: req.user.id });

        const { data: draftRow, error: draftFetchError } = await supabase.from('funding_applications').select('id, data').eq('data->>founder', req.user.id).eq('data->>status', 'draft').single();
        if (draftFetchError && draftFetchError.code !== 'PGRST116') {
            console.error('Error fetching draft:', draftFetchError);
            return res.status(500).json({ message: 'Failed to fetch draft' });
        }
        if (!draftRow) return res.status(404).json({ message: 'No draft found' });

        const draft = { ...draftRow.data, pitchVideo: meta, demoVideoUrl: meta.url, steps: { ...draftRow.data.steps, pitchVideoUploaded: true } };
        const { error: draftUpdateError } = await supabase.from('funding_applications').update({ data: draft }).eq('id', draftRow.id);
        if (draftUpdateError) {
            console.error('Error updating draft:', draftUpdateError);
            return res.status(500).json({ message: 'Failed to update draft' });
        }

        const { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id').eq('data->>fundingApplication', draftRow.id).single();
        if (drError && drError.code !== 'PGRST116') {
             console.error('Error fetching deal room for video upload:', drError);
        }
        if (drRow) {
            const docId = Math.random().toString(36).substring(2, 15);
            const { error: docError } = await supabase.from('deal_room_documents').insert([{ id: docId, data: { dealRoom: drRow.id, type: 'executiveSummary', category: 'Pitch Video', file: meta, uploadedBy: req.user.id } }]);
            if (docError) {
                console.error('Error creating document record for pitch video:', docError);
            }
        }

        return res.json({ pitchVideo: meta, draft });
    } catch (error: any) {
        res.status(500).json({ message: 'Upload failed', error: error?.message });
    }
};

export const uploadMyBusinessDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const files = ((req as any).files || []) as Express.Multer.File[];
        if (!files.length) return res.status(400).json({ message: 'No files uploaded' });

        const { data: draftRow, error: draftFetchError } = await supabase.from('funding_applications').select('id, data').eq('data->>founder', req.user.id).order('created_at', { ascending: false }).limit(1).single();
        if (draftFetchError && draftFetchError.code !== 'PGRST116') {
            console.error('Error fetching application:', draftFetchError);
            return res.status(500).json({ message: 'Failed to fetch application' });
        }
        if (!draftRow) return res.status(404).json({ message: 'No application found' });

        const metas = await Promise.all(files.map(async (f) => ({
            ...(await uploadFundingFile({ file: f, prefix: 'business-docs', ownerId: req.user.id })),
            docType: req.body.docType,
        })));
        const draft = { ...draftRow.data, businessDocuments: [...(draftRow.data.businessDocuments || []), ...metas], steps: { ...draftRow.data.steps, businessDocumentsUploaded: true } };
        const { error: draftUpdateError } = await supabase.from('funding_applications').update({ data: draft }).eq('id', draftRow.id);
        if (draftUpdateError) {
            console.error('Error updating application with docs:', draftUpdateError);
        }

        const { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id').eq('data->>fundingApplication', draftRow.id).single();
        if (drError && drError.code !== 'PGRST116') {
             console.error('Error fetching deal room for business docs:', drError);
        }
        if (drRow) {
            for (const file of files) {
                const meta = await uploadFundingFile({ file, prefix: 'business-docs', ownerId: req.user.id });
                const docId = Math.random().toString(36).substring(2, 15);
                const { error: docError } = await supabase.from('deal_room_documents').insert([{ id: docId, data: { dealRoom: drRow.id, type: 'other', category: req.body.docType || 'Business Document', file: meta, uploadedBy: req.user.id } }]);
                if (docError) {
                    console.error('Error inserting document record:', docError);
                }
            }
        }

        res.json({ businessDocuments: draft.businessDocuments, draft });
    } catch (error: any) {
        res.status(500).json({ message: 'Upload failed', error: error?.message });
    }
};

export const submitMyFundingDraft = async (req: AuthRequest, res: Response) => {
    try {
        const { data: draftRow, error: fetchError } = await supabase.from('funding_applications').select('id, data').eq('data->>founder', req.user.id).eq('data->>status', 'draft').single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching draft:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch draft' });
        }
        if (!draftRow) return res.status(404).json({ message: 'No draft found' });
        const draft = { ...draftRow.data, status: 'submitted', submittedAt: new Date().toISOString(), steps: { ...draftRow.data.steps, finalSubmitted: true } };
        const { error: updateError } = await supabase.from('funding_applications').update({ data: draft }).eq('id', draftRow.id);
        if (updateError) {
            console.error('Error updating draft status:', updateError);
            return res.status(500).json({ message: 'Failed to submit draft' });
        }
        res.json({ _id: draftRow.id, id: draftRow.id, ...draft });
    } catch (error: any) {
        console.error('submitMyFundingDraft error:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const listFundingStartups = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('startups').select('id, data').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching startups:', error);
            return res.status(500).json({ message: 'Failed to fetch startups' });
        }

        // Collect all unique founder IDs to batch-fetch user info
        const founderIds = [...new Set(data.map((d: any) => d.data?.founder).filter(Boolean))] as string[];
        let userMap: Record<string, { name: string; avatar: string; isVerified: boolean }> = {};
        if (founderIds.length > 0) {
            const { data: userRows, error: usersError } = await supabase.from('users').select('id, data').in('id', founderIds);
            if (usersError) {
                console.error('Error fetching users:', usersError);
            } else if (userRows) {
                userRows.forEach((u: any) => {
                    userMap[u.id] = {
                        name: u.data?.name || '',
                        avatar: u.data?.avatar || '',
                        isVerified: !!u.data?.isVerified
                    };
                });
            }
        }

        const result = data.map((d: any) => {
            const founderId = d.data?.founder;
            const founderInfo = founderId ? userMap[founderId] : null;
            return {
                ...d.data,
                _id: d.id,
                id: d.id,
                founder: founderInfo
                    ? { _id: founderId, id: founderId, name: founderInfo.name, avatar: founderInfo.avatar, isVerified: founderInfo.isVerified }
                    : founderId ? { _id: founderId, id: founderId } : null
            };
        });

        res.json(result);
    } catch (error) {
        console.error('listFundingStartups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const bookmarkStartup = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const startupId = req.params.startupId;
        const id = `${userId}_${startupId}`;
        const { data: existing, error: fetchError } = await supabase.from('funding_bookmarks').select('id').eq('id', id).single();
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching bookmark:', fetchError);
            return res.status(500).json({ message: 'Failed to fetch bookmark' });
        }
        if (existing) {
            const { error: deleteError } = await supabase.from('funding_bookmarks').delete().eq('id', id);
            if (deleteError) {
                console.error('Error deleting bookmark:', deleteError);
                return res.status(500).json({ message: 'Failed to remove bookmark' });
            }
            // Mirror removal into the general Saved Items store so the two stay in sync.
            await supabase.from('saved_items').delete()
                .eq('user_id', userId).eq('item_id', startupId).eq('item_type', 'startup');
            return res.json({ bookmarked: false });
        }
        const { error: insertError } = await supabase.from('funding_bookmarks').insert([{ id, data: { investor: userId, startup: startupId, createdAt: new Date().toISOString() } }]);
        if (insertError) {
            console.error('Error creating bookmark:', insertError);
            return res.status(500).json({ message: 'Failed to create bookmark' });
        }
        // Also record it in the general Saved Items store so it shows under
        // "Saved Items" (saved_items), not just the funding-portal saved list.
        const { data: alreadySaved } = await supabase.from('saved_items').select('id')
            .eq('user_id', userId).eq('item_id', startupId).eq('item_type', 'startup').maybeSingle();
        if (!alreadySaved) {
            await supabase.from('saved_items').insert([{
                user_id: userId, item_id: startupId, item_type: 'startup', created_at: new Date().toISOString(),
            }]);
        }
        res.json({ bookmarked: true });
    } catch (error) {
        console.error('bookmarkStartup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const expressInterest = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const startupId = req.params.startupId;
        const id = `${userId}_${startupId}`;
        const interestData = { investor: userId, startup: startupId, note: req.body.note, createdAt: new Date().toISOString() };
        const { error } = await supabase.from('funding_interests').upsert([{ id, data: interestData }]);
        if (error) {
            console.error('Error upserting interest:', error);
            return res.status(500).json({ message: 'Failed to express interest' });
        }
        res.status(201).json(interestData);
    } catch (error) {
        console.error('expressInterest error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const listMyBookmarks = async (req: AuthRequest, res: Response) => {
    try {
        const { data, error } = await supabase.from('funding_bookmarks').select('data').eq('data->>investor', req.user.id);
        if (error) {
            console.error('Error fetching bookmarks:', error);
            return res.status(500).json({ message: 'Failed to fetch bookmarks' });
        }
        res.json(data ? data.map(b => b.data.startup) : []);
    } catch (error) {
        console.error('listMyBookmarks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const submitFundingApplication = async (req: AuthRequest, res: Response) => {
    try {
        const id = Math.random().toString(36).substring(2, 15);
        const appData = { ...req.body, id, founder: req.user.id, status: 'submitted', submittedAt: new Date().toISOString() };
        const { error } = await supabase.from('funding_applications').insert([{ id, data: appData }]);
        if (error) {
            console.error('Error submitting application:', error);
            return res.status(500).json({ message: 'Failed to submit application' });
        }
        res.status(201).json(appData);
    } catch (error) {
        console.error('submitFundingApplication error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
export const createInvestorProfile = async (req: AuthRequest, res: Response) => {
    try {
        // DEPRECATED: This endpoint is replaced by /api/roles/apply
        // Keeping for backward compatibility but redirecting to new flow
        
        return res.status(400).json({
            error: 'Deprecated endpoint',
            message: 'Please use /api/roles/apply to create an investor profile',
            newEndpoint: {
                method: 'POST',
                url: '/api/roles/apply',
                body: {
                    role: 'investor',
                    profileData: {
                        investorType: 'Angel Investor or VC',
                        investmentStage: ['Seed', 'Series A'],
                        ticketSize: '$10k-$50k',
                        industries: ['Technology', 'SaaS'],
                        geography: 'Global',
                        portfolioCompanies: ['Company 1', 'Company 2'],
                        fundName: 'Your Fund Name (optional)',
                        aum: 'Assets Under Management (optional)',
                        investmentThesis: 'Your investment thesis',
                        linkedIn: 'LinkedIn URL'
                    }
                }
            },
            documentation: 'See /docs/role-verification.md for complete guide'
        });
    } catch (error) {
        console.error('createInvestorProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};