import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { io } from '../utils/socket';
import { createNotification } from './notificationController';
import crypto from 'crypto';

export const listMyDealRooms = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user.id);
        // Guard against PostgREST `.or()` filter injection: a deal-room id is
        // always UUID/token-shaped, so anything outside this charset cannot be a
        // legitimate id and must not be spliced into the filter string.
        if (!/^[A-Za-z0-9_-]+$/.test(userId)) {
            return res.status(400).json({ message: 'Invalid user identifier' });
        }
        const { data, error } = await supabase.from('deal_rooms').select('data').or(`data->>founder.eq.${userId},data->investorIds.cs.["${userId}"]`);
        if (error) {
            console.error('Error fetching deal rooms:', error);
            return res.status(500).json({ message: 'Failed to fetch deal rooms' });
        }
        res.json(data ? data.map(d => d.data) : []);
    } catch (error) {
        console.error('listMyDealRooms error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDealRoomByStartupId = async (req: AuthRequest, res: Response) => {
    try {
        const { startupId } = req.params;
        const { data: startupRow, error: startupError } = await supabase.from('startups').select('data').eq('id', startupId).single();
        if (startupError) {
            console.error('Error fetching startup:', startupError);
            return res.status(500).json({ message: 'Failed to fetch startup' });
        }
        if (!startupRow) return res.status(404).json({ message: 'Startup not found' });

        const isFounder = startupRow.data.founder === req.user.id;
        const isInvestor = startupRow.data.investors?.some((i: any) => String(i.user) === String(req.user.id));
        if (!isFounder && !isInvestor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Not authorized to access this deal room' });
        }

        let { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('data->>startup', startupId).single();
        if (drError && drError.code !== 'PGRST116') {
            console.error('Error fetching deal room:', drError);
            return res.status(500).json({ message: 'Failed to fetch deal room' });
        }

        // Auto-create deal room if none exists
        if (!drRow) {
            const startup = startupRow.data;
            const newId = crypto.randomUUID();
            const newDealRoom = {
                id: newId,
                _id: newId,
                startup: startupId,
                founder: startup.founder,
                stage: 'under_review',
                investorIds: [],
                checklist: [
                    { id: '1', text: 'Sign Non-Disclosure Agreement (NDA)', completed: false, category: 'Legal' },
                    { id: '2', text: 'Initial VC Problem/Solution Fit Validation', completed: false, category: 'Strategy' },
                    { id: '3', text: 'Deep Dive into Financials & Revenue Model', completed: false, category: 'Financial' },
                    { id: '4', text: 'Technical & Security Architecture Review', completed: false, category: 'Technical' },
                    { id: '5', text: 'Legal IP & Corporate Compliance Check', completed: false, category: 'Legal' },
                    { id: '6', text: 'Final Term Sheet Negotiation', completed: false, category: 'Funding' }
                ],
                createdAt: new Date().toISOString()
            };

            const { data: created, error: insertError } = await supabase.from('deal_rooms').insert([{ id: newId, data: newDealRoom }]).select().single();
            if (insertError) {
                console.error('Error creating deal room:', insertError);
                return res.status(500).json({ message: 'Failed to create deal room' });
            }
            drRow = created;
        }

        if (!drRow) return res.status(404).json({ message: 'Deal room could not be created' });

        const dealRoom = drRow.data;
        if (isInvestor && !dealRoom.investorIds?.includes(req.user.id)) {
            dealRoom.investorIds = [...(dealRoom.investorIds || []), req.user.id];
            const { error: updateError } = await supabase.from('deal_rooms').update({ data: dealRoom }).eq('id', drRow.id);
            if (updateError) {
                console.error('Error updating deal room:', updateError);
            }
        }

        const { data: documents, error: docsError } = await supabase.from('deal_room_documents').select('data').eq('data->>dealRoom', drRow.id);
        if (docsError) {
            console.error('Error fetching documents:', docsError);
        }
        const { data: analysis, error: analysisError } = await supabase.from('pitch_deck_analyses').select('data').eq('data->>dealRoom', drRow.id).single();
        if (analysisError && analysisError.code !== 'PGRST116') {
            console.error('Error fetching analysis:', analysisError);
        }
        const appRow = dealRoom.fundingApplication
            ? await (async () => {
                const { data, error: appError } = await supabase.from('funding_applications').select('data').eq('id', dealRoom.fundingApplication).single();
                if (appError) {
                    console.error('Error fetching funding application:', appError);
                }
                return { data };
            })()
            : { data: null };

        // Populate investors for founder view
        let populatedInvestors: { id: string; name: string; avatar?: string }[] = [];
        if (isFounder && dealRoom.investorIds?.length > 0) {
            const { data: users, error: usersError } = await supabase.from('users').select('id, data').in('id', dealRoom.investorIds);
            if (usersError) {
                console.error('Error fetching investors:', usersError);
            } else {
                populatedInvestors = users ? users.map(u => ({ id: u.id, name: u.data?.name, avatar: u.data?.avatar })) : [];
            }
        }

        res.json({
            dealRoom,
            fundingApplication: appRow?.data || null,
            startup: startupRow?.data,
            documents: documents ? documents.map(d => d.data) : [],
            pitchDeckAnalysis: analysis?.data || null,
            investors: populatedInvestors
        });
    } catch (error) {
        console.error('getDealRoomByStartupId error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDealRoomByFundingApplication = async (req: AuthRequest, res: Response) => {
    try {
        const { fundingApplicationId } = req.params;
        let { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('data->>fundingApplication', fundingApplicationId).single();
        if (drError && drError.code !== 'PGRST116') {
            console.error('Error fetching deal room:', drError);
            return res.status(500).json({ message: 'Failed to fetch deal room' });
        }

        // If no deal room exists, try to auto-create one for this application
        if (!drRow) {
            const { data: appRow, error: appError } = await supabase.from('funding_applications').select('id, data').eq('id', fundingApplicationId).single();
            if (appError) {
                console.error('Error fetching funding application:', appError);
                return res.status(500).json({ message: 'Failed to fetch funding application' });
            }
            if (!appRow) return res.status(404).json({ message: 'Funding application not found' });

            const application = appRow.data;
            const newId = crypto.randomUUID();
            const newDealRoom = {
                id: newId,
                _id: newId,
                fundingApplication: fundingApplicationId,
                startup: application.startup,
                founder: application.founder,
                stage: 'under_review',
                investorIds: [],
                checklist: [
                    { id: '1', text: 'Sign Non-Disclosure Agreement (NDA)', completed: false, category: 'Legal' },
                    { id: '2', text: 'Initial VC Problem/Solution Fit Validation', completed: false, category: 'Strategy' },
                    { id: '3', text: 'Deep Dive into Financials & Revenue Model', completed: false, category: 'Financial' },
                    { id: '4', text: 'Technical & Security Architecture Review', completed: false, category: 'Technical' },
                    { id: '5', text: 'Legal IP & Corporate Compliance Check', completed: false, category: 'Legal' },
                    { id: '6', text: 'Final Term Sheet Negotiation', completed: false, category: 'Funding' }
                ],
                createdAt: new Date().toISOString()
            };

            const { data: created, error: insertError } = await supabase.from('deal_rooms').insert([{ id: newId, data: newDealRoom }]).select().single();
            if (insertError) {
                console.error('Error creating deal room:', insertError);
                return res.status(500).json({ message: 'Failed to create deal room' });
            }
            drRow = created;
        }

        if (!drRow) return res.status(404).json({ message: 'Deal room could not be created' });

        const dealRoom = drRow.data;
        const isFounder = dealRoom.founder === req.user.id;

        // Authorization source of truth is the startup's investor roster — NOT the
        // caller's role. A bare `investor` role must never grant access to an
        // unrelated startup's confidential financials + pitch-deck analysis.
        const { data: startupRow, error: startupError } = await supabase.from('startups').select('data').eq('id', dealRoom.startup).single();
        if (startupError && startupError.code !== 'PGRST116') {
            console.error('Error fetching startup:', startupError);
        }
        const isStartupInvestor = !!startupRow?.data?.investors?.some((i: any) => String(i.user) === String(req.user.id));
        const isExistingMember = (dealRoom.investorIds || []).map(String).includes(String(req.user.id));
        if (!isFounder && !isStartupInvestor && !isExistingMember && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Not authorized to access this deal room' });
        }

        // Materialize deal-room membership only for a genuine investor on this
        // startup who isn't recorded yet — never from role alone.
        if (isStartupInvestor && !isExistingMember) {
            dealRoom.investorIds = [...(dealRoom.investorIds || []), req.user.id];
            const { error: updateError } = await supabase.from('deal_rooms').update({ data: dealRoom }).eq('id', drRow.id);
            if (updateError) {
                console.error('Error updating deal room:', updateError);
            }
        }

        const { data: documents, error: docsError } = await supabase.from('deal_room_documents').select('data').eq('data->>dealRoom', drRow.id);
        if (docsError) {
            console.error('Error fetching documents:', docsError);
        }
        const { data: analysis, error: analysisError } = await supabase.from('pitch_deck_analyses').select('data').eq('data->>dealRoom', drRow.id).single();
        if (analysisError && analysisError.code !== 'PGRST116') {
            console.error('Error fetching analysis:', analysisError);
        }
        const { data: appRow, error: appError } = await supabase.from('funding_applications').select('data').eq('id', fundingApplicationId).single();
        if (appError) {
            console.error('Error fetching funding application:', appError);
        }

        // Populate investors for founder view
        let populatedInvestors: { id: string; name: string; avatar?: string }[] = [];
        if (isFounder && dealRoom.investorIds?.length > 0) {
            const { data: users, error: usersError } = await supabase.from('users').select('id, data').in('id', dealRoom.investorIds);
            if (usersError) {
                console.error('Error fetching investors:', usersError);
            } else {
                populatedInvestors = users ? users.map(u => ({ id: u.id, name: u.data?.name, avatar: u.data?.avatar })) : [];
            }
        }

        res.json({
            dealRoom,
            fundingApplication: appRow?.data,
            startup: startupRow?.data,
            documents: documents ? documents.map(d => d.data) : [],
            pitchDeckAnalysis: analysis?.data || null,
            investors: populatedInvestors
        });
    } catch (error) {
        console.error('getDealRoomByFundingApplication error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const listDealRoomDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const { fundingApplicationId } = req.params;
        const { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('data->>fundingApplication', fundingApplicationId).single();
        if (drError) {
            console.error('Error fetching deal room:', drError);
            return res.status(500).json({ message: 'Failed to fetch deal room' });
        }
        if (!drRow) return res.status(404).json({ message: 'Deal room not found' });
        const dr = drRow.data;
        const isFounder = dr.founder === req.user.id;
        const isMember = (dr.investorIds || []).map(String).includes(String(req.user.id));
        if (!isFounder && !isMember && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Not authorized to access this deal room' });
        }
        const { data, error: docsError } = await supabase.from('deal_room_documents').select('data').eq('data->>dealRoom', drRow.id);
        if (docsError) {
            console.error('Error fetching documents:', docsError);
            return res.status(500).json({ message: 'Failed to fetch documents' });
        }
        res.json(data ? data.map(d => d.data) : []);
    } catch (error) {
        console.error('listDealRoomDocuments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPitchDeckAnalysis = async (req: AuthRequest, res: Response) => {
    try {
        const { fundingApplicationId } = req.params;
        const { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('data->>fundingApplication', fundingApplicationId).single();
        if (drError) {
            console.error('Error fetching deal room:', drError);
            return res.status(500).json({ message: 'Failed to fetch deal room' });
        }
        if (!drRow) return res.status(404).json({ message: 'Deal room not found' });
        const dr = drRow.data;
        const isFounder = dr.founder === req.user.id;
        const isMember = (dr.investorIds || []).map(String).includes(String(req.user.id));
        if (!isFounder && !isMember && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Not authorized to access this deal room' });
        }
        const { data, error: analysisError } = await supabase.from('pitch_deck_analyses').select('data').eq('data->>dealRoom', drRow.id).single();
        if (analysisError) {
            console.error('Error fetching analysis:', analysisError);
            return res.status(500).json({ message: 'Failed to fetch analysis' });
        }
        if (!data) return res.status(404).json({ message: 'Analysis not found' });
        res.json(data.data);
    } catch (error) {
        console.error('getPitchDeckAnalysis error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const signNDA = async (req: AuthRequest, res: Response) => {
    try {
        res.json({ message: 'NDA signed', signedAt: new Date().toISOString() });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const updateChecklist = async (req: AuthRequest, res: Response) => {
    try {
        const { dealRoomId, checklist } = req.body;
        const { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('id', dealRoomId).single();
        if (drError) {
            console.error('Error fetching deal room:', drError);
            return res.status(500).json({ message: 'Failed to fetch deal room' });
        }
        if (!drRow) return res.status(404).json({ message: 'Deal room not found' });

        const isFounder = drRow.data.founder === req.user.id;
        let isInvestor = drRow.data.investorIds?.includes(req.user.id);

        if (!isFounder && !isInvestor && drRow.data.startup) {
            const { data: sRow, error: sError } = await supabase.from('startups').select('data').eq('id', drRow.data.startup).single();
            if (sError) {
                console.error('Error fetching startup:', sError);
            }
            if (sRow?.data?.investors?.some((i: any) => String(i.user) === String(req.user.id))) {
                isInvestor = true;
                drRow.data.investorIds = [...(drRow.data.investorIds || []), req.user.id];
            }
        }

        if (!isFounder && !isInvestor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updated = { ...drRow.data, checklist };
        const { error: updateError } = await supabase.from('deal_rooms').update({ data: updated }).eq('id', drRow.id);
        if (updateError) {
            console.error('Error updating checklist:', updateError);
            return res.status(500).json({ message: 'Failed to update checklist' });
        }
        res.json(updated);
    } catch (error) {
        console.error('updateChecklist error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const postComment = async (req: AuthRequest, res: Response) => {
    try {
        const { dealRoomId, text } = req.body;
        const id = crypto.randomUUID();
        const comment = { id, user: req.user.id, text, createdAt: new Date().toISOString() };
        const { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('id', dealRoomId).single();
        if (drError) {
            console.error('Error fetching deal room:', drError);
            return res.status(500).json({ message: 'Failed to fetch deal room' });
        }
        if (!drRow) return res.status(404).json({ message: 'Deal room not found' });

        const isFounder = drRow.data.founder === req.user.id;
        let isInvestor = drRow.data.investorIds?.includes(req.user.id);

        if (!isFounder && !isInvestor && drRow.data.startup) {
            const { data: sRow, error: sError } = await supabase.from('startups').select('data').eq('id', drRow.data.startup).single();
            if (sError) {
                console.error('Error fetching startup:', sError);
            }
            if (sRow?.data?.investors?.some((i: any) => String(i.user) === String(req.user.id))) {
                isInvestor = true;
                drRow.data.investorIds = [...(drRow.data.investorIds || []), req.user.id];
            }
        }

        if (!isFounder && !isInvestor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updated = { ...drRow.data, comments: [...(drRow.data.comments || []), comment] };
        const { error: updateError } = await supabase.from('deal_rooms').update({ data: updated }).eq('id', drRow.id);
        if (updateError) {
            console.error('Error posting comment:', updateError);
            return res.status(500).json({ message: 'Failed to post comment' });
        }
        res.json(comment);
    } catch (error) {
        console.error('postComment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateDealStage = async (req: AuthRequest, res: Response) => {
    try {
        const { dealRoomId, stage } = req.body;
        const { data: drRow, error: drError } = await supabase.from('deal_rooms').select('id, data').eq('id', dealRoomId).single();
        if (drError) {
            console.error('Error fetching deal room:', drError);
            return res.status(500).json({ message: 'Failed to fetch deal room' });
        }
        if (!drRow) return res.status(404).json({ message: 'Deal room not found' });

        const isFounder = drRow.data.founder === req.user.id;
        let isInvestor = drRow.data.investorIds?.includes(req.user.id);

        if (!isFounder && !isInvestor && drRow.data.startup) {
            const { data: sRow, error: sError } = await supabase.from('startups').select('data').eq('id', drRow.data.startup).single();
            if (sError) {
                console.error('Error fetching startup:', sError);
            }
            if (sRow?.data?.investors?.some((i: any) => String(i.user) === String(req.user.id))) {
                isInvestor = true;
                drRow.data.investorIds = [...(drRow.data.investorIds || []), req.user.id];
            }
        }

        if (!isFounder && !isInvestor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updated = { ...drRow.data, stage, updatedAt: new Date().toISOString() };
        const { error: updateError } = await supabase.from('deal_rooms').update({ data: updated }).eq('id', drRow.id);
        if (updateError) {
            console.error('Error updating deal stage:', updateError);
            return res.status(500).json({ message: 'Failed to update deal stage' });
        }

        // Map deal room stage to investor pipeline stage and sync
        const dealToInvestorStage: Record<string, string> = {
            'interested': 'interested',
            'under_review': 'underReview',
            'negotiating': 'negotiating',
            'invested': 'invested',
            'closed': 'closed'
        };
        const investorStage = dealToInvestorStage[stage] || 'interested';
        const startupId = drRow.data.startup;
        if (startupId) {
            const { data: sRow, error: sError } = await supabase.from('startups').select('id, data').eq('id', startupId).single();
            if (sError) {
                console.error('Error fetching startup:', sError);
            }
            if (sRow) {
                const startup = sRow.data;
                if (isFounder) {
                    if (drRow.data.investorIds && drRow.data.investorIds.length > 0) {
                        startup.investors?.forEach((i: any) => {
                            if (drRow.data.investorIds.includes(i.user)) {
                                i.stage = investorStage;
                            }
                        });
                    }
                } else {
                    // Only move the stage of an investor already on the startup's
                    // roster. Never fabricate a new roster entry from a stage update
                    // — that would let a caller inject themselves into a founder's
                    // pipeline (and mark themselves "invested").
                    let investor = startup.investors?.find((i: any) => String(i.user) === String(req.user.id));
                    if (investor) {
                        investor.stage = investorStage;
                    }
                }
                const { error: startupUpdateError } = await supabase.from('startups').update({ data: startup }).eq('id', sRow.id);
                if (startupUpdateError) {
                    console.error('Error updating startup:', startupUpdateError);
                }

                // Emit pipeline updates ONLY to the parties involved (founder +
                // affected investors), never to every connected client.
                const pipelinePayload = {
                    startupId,
                    investorId: isFounder ? drRow.data.investorIds?.[0] : req.user.id,
                    stage: investorStage,
                    dealRoomStage: stage
                };
                const recipients = new Set<string>([String(startup.founder)]);
                if (isFounder) {
                    (drRow.data.investorIds || []).forEach((id: string) => recipients.add(String(id)));
                } else {
                    recipients.add(String(req.user.id));
                }
                recipients.forEach((uid) => {
                    if (uid) io.to(`user:${uid}`).emit('pipeline_stage_updated', pipelinePayload);
                });
            }
        }

        res.json({ dealRoom: updated });
    } catch (error) {
        console.error('updateDealStage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
