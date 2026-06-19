/**
 * Base k6 test template.
 * This file documents patterns used by the k6 script generator.
 * It is NOT executed directly — the backend generates scripts dynamically.
 *
 * Supported env vars:
 *   BASE_URL                      - target service base URL
 *   K6_PROMETHEUS_RW_SERVER_URL   - Prometheus remote write endpoint
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── Options ───────────────────────────────────────────────────
export const options = {
  // Override with stages for ramp-up patterns
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],        // < 5% errors
    http_req_duration: ['p(95)<500'],      // p95 < 500ms
  },
};

// ── Custom metrics ────────────────────────────────────────────
const errorRate = new Rate('errors');
const requestCount = new Counter('request_count');

// ── Auth helper (single login per VU) ─────────────────────────
const sessions = new Map();

function getToken(baseUrl) {
  const vuId = __VU;
  if (!sessions.has(vuId)) {
    const res = http.post(`${baseUrl}/auth/login`, JSON.stringify({
      username: __ENV.AUTH_USER || 'test',
      password: __ENV.AUTH_PASS || 'test',
    }), { headers: { 'Content-Type': 'application/json' } });

    check(res, { 'login ok': (r) => r.status === 200 });
    sessions.set(vuId, res.json()['token']);
  }
  return sessions.get(vuId);
}

// ── Default function ──────────────────────────────────────────
export default function () {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

  const headers = {
    'Content-Type': 'application/json',
    // Authorization: `Bearer ${getToken(BASE_URL)}`,  // uncomment for auth
  };

  // Example: GET /health
  const res = http.get(`${BASE_URL}/health`, { headers });

  requestCount.add(1);
  errorRate.add(res.status >= 400);

  check(res, {
    'status 200': (r) => r.status === 200,
    'latency < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
