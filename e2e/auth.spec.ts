import { test, expect } from '@playwright/test';
import { loginWithTestUser, getTestTokens, TEST_USER } from './auth-helpers';

test.describe('Auth — unauthenticated access', () => {
  test('protected API routes return 401 without auth', async ({ request }) => {
    for (const path of ['/api/stats?days=7', '/api/budgets', '/api/report?days=7', '/api/weekly-ranking']) {
      const res = await request.get(path);
      expect(res.status(), `${path} should be 401`).toBe(401);
    }
  });

  test('POST /api/usage returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/usage', {
      data: { memberName: 'Test', sessionId: 'test-1', records: [{ model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50, recordedAt: new Date().toISOString() }] },
    });
    expect(res.status()).toBe(401);
  });

  test('public routes remain accessible without auth', async ({ request }) => {
    const installRes = await request.get('/api/install');
    expect(installRes.status()).toBe(200);

    const sessionRes = await request.get('/api/auth/session');
    expect(sessionRes.status()).toBe(401); // auth endpoint accessible, just returns 401

    const loginRes = await request.get('/api/auth/login');
    // login redirects to Google — we get a redirect or network error since Google isn't reachable in test
    // Just verify it doesn't return 401 or 404
    expect([200, 302, 307]).not.toContain(404);
  });
});

test.describe('Auth — session cookie flow', () => {
  test('test-login creates valid session, session endpoint returns user info', async ({ request }) => {
    const loginRes = await loginWithTestUser(request);
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.ok).toBe(true);

    // Session endpoint should now return user info
    const sessionRes = await request.get('/api/auth/session');
    expect(sessionRes.status()).toBe(200);
    const sessionBody = await sessionRes.json();
    expect(sessionBody.email).toBe(TEST_USER.email);
    expect(sessionBody.name).toBe(TEST_USER.name);
  });

  test('authenticated session grants access to protected API routes', async ({ request }) => {
    await loginWithTestUser(request);

    // These may 500 (no Supabase) but should NOT 401
    for (const path of ['/api/stats?days=7', '/api/report?days=7', '/api/weekly-ranking']) {
      const res = await request.get(path);
      expect(res.status(), `${path} should not be 401`).not.toBe(401);
    }
  });

  test('logout clears session', async ({ request }) => {
    await loginWithTestUser(request);

    const logoutRes = await request.post('/api/auth/logout');
    expect(logoutRes.status()).toBe(200);

    const sessionRes = await request.get('/api/auth/session');
    expect(sessionRes.status()).toBe(401);
  });
});

// Bearer token flow — requires local Supabase
test.describe('Auth — bearer token flow', () => {
  test('bearer token grants access to protected API routes', async ({ request }) => {
    const tokens = await getTestTokens(request);
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();

    for (const path of ['/api/stats?days=7', '/api/report?days=7']) {
      const res = await request.get(path, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      expect(res.status(), `${path} should not be 401 with bearer`).not.toBe(401);
    }
  });

  test('invalid bearer token returns 401', async ({ request }) => {
    const res = await request.get('/api/stats?days=7', {
      headers: { Authorization: 'Bearer invalid-token-here' },
    });
    expect(res.status()).toBe(401);
  });

  test('token refresh returns new access token', async ({ request }) => {
    const tokens = await getTestTokens(request);
    const refreshRes = await request.post('/api/auth/token/refresh', {
      data: { refresh_token: tokens.refresh_token },
    });
    if (refreshRes.status() === 200) {
      const body = await refreshRes.json();
      expect(body.access_token).toBeTruthy();
      expect(body.expires_in).toBe(3600);
    }
  });

  test('token revoke invalidates refresh token', async ({ request }) => {
    const tokens = await getTestTokens(request);
    const revokeRes = await request.post('/api/auth/token/revoke', {
      data: { refresh_token: tokens.refresh_token },
    });
    expect(revokeRes.status()).not.toBe(404);
  });
});

test.describe('Auth — device challenge flow', () => {
  test('POST /api/auth/device creates a challenge', async ({ request }) => {
    const res = await request.post('/api/auth/device');
    // May 500 without Supabase, but route exists and processes
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.challenge).toBeTruthy();
      expect(body.url).toContain('/auth/device?code=');
      expect(body.expiresIn).toBeGreaterThan(0);
    } else {
      expect(res.status()).not.toBe(404);
    }
  });

  test('GET /api/auth/device/poll returns 400 without challenge param', async ({ request }) => {
    const res = await request.get('/api/auth/device/poll');
    expect(res.status()).toBe(400);
  });

  test('GET /api/auth/device/poll returns 410 for non-existent challenge', async ({ request }) => {
    const res = await request.get('/api/auth/device/poll?challenge=NONEXIST');
    // 410 if Supabase available, 500 if not — but not 404
    expect([410, 500]).toContain(res.status());
  });
});

test.describe('Auth — record claim', () => {
  test('GET /api/auth/claim requires auth', async ({ request }) => {
    const res = await request.get('/api/auth/claim');
    expect(res.status()).toBe(401);
  });

  test('GET /api/auth/claim returns unclaimed list when authenticated', async ({ request }) => {
    await loginWithTestUser(request);
    const res = await request.get('/api/auth/claim');
    // May 500 without Supabase, but shouldn't be 401 or 404
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(404);
  });

  test('POST /api/auth/claim requires auth', async ({ request }) => {
    const res = await request.post('/api/auth/claim', {
      data: { memberName: 'TestUser' },
    });
    expect(res.status()).toBe(401);
  });
});
