import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../utils/supabase', () => {
  const conversations = [
    {
      data: {
        id: 'user-1_user-2',
        participants: ['user-1', 'user-2'],
        unreadCount: { 'user-1': 3 },
        lastMessageAt: new Date().toISOString(),
      },
    },
  ];

  const chain: any = {
    select: () => chain,
    filter: () => chain,
    order: () => chain,
    eq: () => chain,
    single: async () => ({ data: null }),
    in: () => chain,
  };

  return {
    supabase: {
      from: (_table: string) => ({
        ...chain,
        select: () => ({
          ...chain,
          filter: () => ({
            ...chain,
            order: async () => ({ data: conversations, error: null }),
          }),
        }),
      }),
    },
  };
});

import { createTestApp } from '../testUtils/createTestApp';

const signTestToken = (payload: Record<string, unknown>) => jwt.sign(payload, 'secret');

describe('Messages routes', () => {
  const app = createTestApp();

  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
  });

  afterEach(() => {
    process.env = oldEnv;
    vi.clearAllMocks();
  });

  it('GET /api/messages/conversations returns unreadCount number', async () => {
    const token = signTestToken({ id: 'user-1', role: 'founder' });

    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('user-1_user-2');
    expect(res.body[0].unreadCount).toBe(3);
  });
});
