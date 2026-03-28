// Google OAuth2 provider implementation.
// Reads client credentials from shared config (OAUTH_CLIENT_FILE or OAUTH_CLIENT_ID/SECRET).

import type { OAuth2Provider, OAuth2TokenResponse, OAuth2UserInfo } from './provider';
import { loadOAuthCredentials } from './config';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const googleProvider: OAuth2Provider = {
  name: 'Google',

  buildAuthUrl({ redirectUri, state, codeChallenge, codeChallengeMethod }) {
    const { clientId } = loadOAuthCredentials();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri, codeVerifier }) {
    const { clientId, clientSecret } = loadOAuthCredentials();
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google token exchange failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<OAuth2TokenResponse>;
  },

  async getUserInfo(accessToken) {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
    const data = await res.json();
    return {
      email: data.email,
      name: data.name || data.email,
      avatarUrl: data.picture || null,
    } as OAuth2UserInfo;
  },
};
