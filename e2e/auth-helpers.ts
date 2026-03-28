// E2E test helpers for authenticating via test bypass endpoints.

import type { APIRequestContext } from '@playwright/test';

export const TEST_USER = {
  email: 'testuser@maum.ai',
  name: 'Test User',
};

/** Create an authenticated session cookie via POST /api/auth/test-login */
export async function loginWithTestUser(request: APIRequestContext) {
  const res = await request.post('/api/auth/test-login', {
    data: TEST_USER,
  });
  return res;
}

/** Get bearer tokens via POST /api/auth/test-token */
export async function getTestTokens(request: APIRequestContext) {
  const res = await request.post('/api/auth/test-token', {
    data: TEST_USER,
  });
  if (!res.ok()) throw new Error(`Failed to get test tokens: ${res.status()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}
