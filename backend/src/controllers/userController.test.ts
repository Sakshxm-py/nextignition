import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../utils/supabase', () => {
  const updateChain: any = {
    eq: async () => ({ data: null, error: null }),
  };

  const usersChain: any = {
    select: () => usersChain,
    eq: () => usersChain,
    single: async () => ({
      data: {
        data: {
          id: 'user-1',
          name: 'Test User',
          role: 'founder',
          avatar: 'http://example.com/avatar.png',
        },
      },
      error: null,
    }),
    update: () => updateChain,
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'users') return usersChain;
        return usersChain;
      },
    },
  };
});

import { createTestApp } from '../testUtils/createTestApp';

const signTestToken = (payload: Record<string, unknown>) => jwt.sign(payload, 'secret');

describe('User routes', () => {
  const app = createTestApp();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('DELETE /api/auth/avatar clears avatar', async () => {
    const token = signTestToken({ id: 'user-1', role: 'founder' });

    const res = await request(app)
      .delete('/api/auth/avatar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ avatar: '' });
  });
});
