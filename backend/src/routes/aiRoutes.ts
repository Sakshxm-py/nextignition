import express from 'express';
import { generateStartupSummary, summarizeProfile, summarizePitchDeck, aiChat, matchExperts, matchCofounders, matchClients, aiQuickAction, deriveDeckInsights, analyzeBusinessDocument, generatePortfolioAnalysis, toggleSaveSession, getSavedSessions, enhancePrompt, enhancePost, getQueriesLeft } from '../controllers/aiController';
import { protect, maybeAuth } from '../middleware/auth';
import { uploadDocs } from '../middleware/upload';

const router = express.Router();

router.post('/summary', maybeAuth, generateStartupSummary);
router.post('/profile', maybeAuth, summarizeProfile);
router.post('/pitch-deck', maybeAuth, uploadDocs.single('pitchDeck'), summarizePitchDeck);
router.post('/deck-insights', protect, deriveDeckInsights);
router.post('/chat', protect, aiChat);
router.post('/quick-action', protect, aiQuickAction);
router.post('/match-cofounders', protect, matchCofounders);
router.post('/analyze-document', protect, uploadDocs.single('document'), analyzeBusinessDocument);
router.post('/match-clients', protect, matchClients);
router.post('/match-experts', protect, matchExperts);
router.post('/portfolio-analysis', protect, generatePortfolioAnalysis);
router.post('/save-session/:id', protect, toggleSaveSession);
router.get('/saved-sessions', protect, getSavedSessions);
router.post('/enhance-prompt', protect, enhancePrompt);
router.post('/enhance-post', protect, enhancePost);
router.get('/queries-left/:userId', protect, getQueriesLeft);

export default router;
