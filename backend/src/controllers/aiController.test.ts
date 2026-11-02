import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('axios', () => {
    return {
        default: {
            post: vi.fn(),
        },
    };
});

vi.mock('../utils/supabase', () => {
    const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        or: () => chain,
        filter: () => chain,
        single: async () => ({
            data: {
                data: {
                    id: 'user-1',
                    name: 'Test User',
                    role: 'founder',
                    profile: {
                        location: 'Test City',
                        bio: 'Test bio',
                        skills: ['TypeScript'],
                        interests: [],
                        expertise: [],
                        experience: '1y',
                    },
                },
            },
        }),
        insert: async () => ({}),
        update: async () => ({}),
        upsert: async () => ({}),
    };

    return {
        supabase: {
            from: () => chain,
        },
    };
});

import axios from 'axios';
import { createTestApp } from '../testUtils/createTestApp';

const signTestToken = (payload: Record<string, unknown>) => jwt.sign(payload, 'secret');

describe('AI routes', () => {
    const app = createTestApp();

    const oldEnv = process.env;

    beforeEach(() => {
        process.env = { ...oldEnv };
        process.env.OPENROUTER_API_KEY = 'test-key';
        (axios.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: {
                choices: [{ message: { content: 'ok' } }],
            },
        });
    });

    afterEach(() => {
        process.env = oldEnv;
        vi.clearAllMocks();
    });

    it('POST /api/ai/summary returns 400 when idea is missing', async () => {
        const token = signTestToken({ id: 'user-1', role: 'founder' });

        const res = await request(app)
            .post('/api/ai/summary')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body?.message).toBe('Idea is required.');
    });

    it('POST /api/ai/chat returns 400 when message is missing', async () => {
        const token = signTestToken({ id: 'user-1', role: 'founder' });

        const res = await request(app)
            .post('/api/ai/chat')
            .set('Authorization', `Bearer ${token}`)
            .send({ message: '   ' });

        expect(res.status).toBe(400);
        expect(res.body?.message).toBe('Message is required.');
    });

    it('POST /api/ai/summary includes request context and clientContext currentPage', async () => {
        const token = signTestToken({ id: 'user-1', role: 'founder' });

        const res = await request(app)
            .post('/api/ai/summary')
            .set('Authorization', `Bearer ${token}`)
            .send({
                idea: 'My startup idea',
                clientContext: {
                    currentPage: '/ignisha',
                    sessionFlags: {
                        onboardingComplete: true,
                    },
                },
            });

        expect(res.status).toBe(200);
        expect(res.body?.summary).toBe('ok');

        const axiosPostCalls = (axios.post as unknown as ReturnType<typeof vi.fn>).mock.calls;
        expect(axiosPostCalls.length).toBeGreaterThan(0);

        const payload = axiosPostCalls[0]?.[1];
        const messages = payload?.messages as { role: string; content: string }[];
        const systemMessage = messages?.find((m) => m.role === 'system')?.content || '';

        expect(systemMessage).toContain('Request context:');
        expect(systemMessage).toContain('currentPage: /ignisha');
        expect(systemMessage).toContain('sessionFlags: onboardingComplete=true');
    });
});
