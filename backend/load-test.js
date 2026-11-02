/**
 * k6 Load Test: POST /api/auth/google
 * ─────────────────────────────────────────────────────────────────
 * Usage:
 *   k6 run load-test.js
 *   k6 run --env TOKEN="<real_google_id_token>" load-test.js
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * On Windows (scoop): scoop install k6
 * ─────────────────────────────────────────────────────────────────
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric: track failure rate
const errorRate = new Rate('error_rate');

export const options = {
  scenarios: {
    // Ramp to 200 req/s over 10s, hold for 30s, ramp down
    google_auth_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { target: 200, duration: '10s' }, // ramp up
        { target: 200, duration: '30s' }, // sustained load
        { target: 0,   duration: '10s' }, // ramp down
      ],
    },
  },
  thresholds: {
    // ≥ 99% of valid-token requests must return 200  // <-- IMPORTANT
    'http_req_failed': ['rate<0.01'],
    'error_rate': ['rate<0.01'],
    'http_req_duration': ['p(95)<2000'], // 95th percentile < 2s
  },
};

// Reuse a single valid token for the duration (token valid ~1hr from Google)
// Set via: k6 run --env TOKEN="eyJhbGci..." load-test.js
const VALID_TOKEN = __ENV.TOKEN || 'REPLACE_WITH_REAL_GOOGLE_ID_TOKEN';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // ── Happy path: valid token ─────────────────────────────────────────────────
  const validRes = http.post(
    `${BASE_URL}/api/auth/google`,
    JSON.stringify({ token: VALID_TOKEN }),
    { headers }
  );

  const validOk = check(validRes, {
    'valid token → 200': (r) => r.status === 200,
    'response has token field': (r) => {
      try { return !!JSON.parse(r.body).token; } catch { return false; }
    },
  });
  errorRate.add(!validOk);

  sleep(0.005); // small sleep to avoid overwhelming local server

  // ── Security path: forged token must return 401 ─────────────────────────────
  const forgedRes = http.post(
    `${BASE_URL}/api/auth/google`,
    JSON.stringify({ token: 'forged.jwt.token' }),
    { headers }
  );

  check(forgedRes, {
    'forged token → 401': (r) => r.status === 401, // <-- IMPORTANT: must fail
  });
}

/**
 * k6 Summary Interpretation:
 * ─────────────────────────────────────────────────────────────────
 * ✓ checks.........................: 99.xx%  → security gates hold
 * ✓ error_rate....................: 0.00%   → valid tokens succeed
 * ✓ http_req_duration (p95).......: < 2000ms → acceptable latency
 *
 * If error_rate > 1%:
 *   - Token may have expired (exp claim) → refresh from OAuth Playground
 *   - Rate limiter may be kicking in     → check rateLimit config in index.ts
 *   - Server OOM / DB connection pool exhausted → check Supabase limits
 */
