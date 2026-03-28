// Auth configuration helpers — delegates to AppConfig port via env-config adapter.
// No direct process.env reads.

import { loadAppConfig } from '@/lib/adapters/env-config';

export function getRedirectUri(requestUrl: string): string {
  const config = loadAppConfig();
  if (config.oauth.redirectUri) return config.oauth.redirectUri;
  const url = new URL(requestUrl);
  return `${url.origin}/api/auth/callback`;
}

export function getBaseUrl(requestUrl: string): string {
  // Behind a reverse proxy, request.url shows the internal address (e.g. localhost:3002).
  // Derive the public base URL from AUTH_REDIRECT_URI if configured.
  const config = loadAppConfig();
  if (config.oauth.redirectUri) {
    const url = new URL(config.oauth.redirectUri);
    return url.origin;
  }
  const url = new URL(requestUrl);
  return url.origin;
}

export interface OAuthClientCredentials {
  clientId: string;
  clientSecret: string;
}

export function loadOAuthCredentials(): OAuthClientCredentials {
  const config = loadAppConfig();
  return { clientId: config.oauth.clientId, clientSecret: config.oauth.clientSecret };
}
