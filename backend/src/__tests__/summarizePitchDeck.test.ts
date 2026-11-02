process.env.OPENROUTER_API_KEY = 'test-key';
import request from 'supertest';
import express from 'express';
import { summarizePitchDeck } from '../controllers/aiController';
import { protect } from '../middleware/auth';

// Mock Supabase
jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { data: { aiUsage: { queries: 0, lastQueryDate: '2026-06-08' } } }, error: null }),
      }),
      insert: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => Promise.resolve({ data: { data: { aiUsage: { queries: 0, lastQueryDate: '2026-06-08' } } }, error: null })),
    }),
  },
}));

// Mock settings
jest.mock('../utils/settingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({ dailyLimit: 10 }),
}));

// Mock text extractor
const mockExtractDeckTextFromFile = jest.fn().mockResolvedValue({ text: 'Extracted PDF Pitch Deck Content!' });
jest.mock('../utils/deckTextExtractor', () => ({
  extractDeckTextFromFile: (...args: any[]) => mockExtractDeckTextFromFile(...args),
  extractDeckTextFromBuffer: (...args: any[]) => mockExtractDeckTextFromFile(...args),
}));

// Mock OpenRouter
jest.mock('../controllers/aiController', () => {
  const originalModule = jest.requireActual('../controllers/aiController');
  return {
    ...originalModule,
  };
});

// Since callOpenRouter is a private helper inside aiController, let's spy/mock axios or OpenRouter endpoint
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Auth middleware
jest.mock('../middleware/auth', () => ({
  protect: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
  maybeAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
}));

import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(express.json());
app.post('/api/ai/pitch-deck', protect, upload.single('pitchDeck'), summarizePitchDeck);

describe('summarizePitchDeck Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('extracts text from the file and forwards it to the model', async () => {
    // Mock successful OpenRouter response returning the expected JSON
    const mockAiResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              executiveSummary: 'This is a great startup.',
              highlights: ['High growth potential'],
              strengths: ['Great team'],
              gaps: ['Needs fundraising slide'],
              redFlags: [],
              moatType: 'IP',
              investorReadinessScore: 85,
              scoreMetrics: [],
            }),
          },
        },
      ],
    };
    mockedAxios.post.mockResolvedValueOnce({ data: mockAiResponse });

    // Call endpoint mimicking file upload
    const response = await request(app)
      .post('/api/ai/pitch-deck')
      .field('content', '')
      .attach('pitchDeck', Buffer.from('dummy-pdf-data'), {
        filename: 'pitchdeck.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    // Ensure text was extracted from file
    expect(mockExtractDeckTextFromFile).toHaveBeenCalled();
    // Ensure axios call (OpenRouter) was made with the extracted text
    expect(mockedAxios.post).toHaveBeenCalled();
    const axiosArgs = mockedAxios.post.mock.calls[0];
    expect(axiosArgs[0]).toContain('openrouter.ai');
    expect(JSON.stringify(axiosArgs[1])).toContain('Extracted PDF Pitch Deck Content!');
    
    // Ensure final response has parsed values
    expect(response.body.summary).toBe('This is a great startup.');
    expect(response.body.investorReadinessScore).toBe(85);
  });
});
