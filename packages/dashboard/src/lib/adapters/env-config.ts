// Environment variable adapter — the only place process.env is read for app config.
// Satisfies the AppConfig port interface.

import type { AppConfig } from '@/lib/domain/ports';

let _cached: AppConfig | null = null;

export function loadAppConfig(): AppConfig {
  if (_cached) return _cached;

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET are required.');
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) throw new Error('SESSION_SECRET is required');

  _cached = {
    sessionSecret,
    oauth: {
      clientId,
      clientSecret,
      redirectUri: process.env.AUTH_REDIRECT_URI,
    },
    allowlistEnabled: process.env.AUTH_ALLOWLIST_ENABLED === 'true',
    testBypassEnabled: process.env.AUTH_TEST_BYPASS === 'true',
  };
  return _cached;
}

/** Reset cached config — for testing only */
export function _resetConfigCache(): void {
  _cached = null;
}
