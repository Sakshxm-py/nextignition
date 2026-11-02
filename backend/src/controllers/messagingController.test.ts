import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../utils/supabase', () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    filter: () => chain,
    single: async () => ({ data: null }),
    insert: async () => ({ data: null }),
    update: async () => ({ data: null }),
    upsert: async () => ({ data: null }),
    match: () => chain,
    in: () => chain,
  };

  // For follow check we want: follows.single() returns a row so DM is allowed
  const followChain: any = {
    select: () => followChain,
    eq: () => followChain,
    single: async () => ({ data: { id: 'follow-1' } }),
  };

  // For startups pipeline check we want: startups.single() returns null (follow is enough)
  const startupChain: any = {
    select: () => startupChain,
    eq: () => startupChain,
    filter: () => startupChain,
    single: async () => ({ data: null }),
  };

  const usersChain: any = {
    select: () => usersChain,
    in: async () => ({
      data: [
        { id: 'user-1', data: { id: 'user-1', name: 'Test User 1', role: 'founder' } },
        { id: 'user-2', data: { id: 'user-2', name: 'Test User 2', role: 'investor' } },
      ],
    }),
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'follows') return followChain;
        if (table === 'startups') return startupChain;
        if (table === 'users') return usersChain;
        return chain;
      },
    },
  };
});

import { createTestApp } from '../testUtils/createTestApp';

const signTestToken = (payload: Record<string, unknown>) => jwt.sign(payload, 'secret');

describe('Messaging routes', () => {
  const app = createTestApp();

  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
  });

  afterEach(() => {
    process.env = oldEnv;
    vi.clearAllMocks();
  });

  it('POST /api/messaging/conversations accepts otherUserId payload', async () => {
    const token = signTestToken({ id: 'user-1', role: 'founder' });

    const res = await request(app)
      .post('/api/messaging/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ otherUserId: 'user-2' });

    expect([200, 201]).toContain(res.status);
    expect(res.body?._id).toBe('user-1_user-2');
    expect(res.body?.id).toBe('user-1_user-2');
    expect(Array.isArray(res.body?.participants)).toBe(true);
    expect(res.body?.participants?.map((p: any) => p?._id)).toEqual(['user-1', 'user-2']);
  });

  it('POST /api/messaging/conversations returns 400 when missing participants/otherUserId', async () => {
    const token = signTestToken({ id: 'user-1', role: 'founder' });

    const res = await request(app)
      .post('/api/messaging/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
