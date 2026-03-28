// Generic OAuth2 provider interface — any OAuth2-compliant provider can implement this.

export interface OAuth2UserInfo {
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface OAuth2Provider {
  /** Display name (e.g., "Google") */
  name: string;

  /** Build the authorization URL for the redirect */
  buildAuthUrl(params: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: 'S256';
  }): string;

  /** Exchange an authorization code for tokens */
  exchangeCode(params: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<OAuth2TokenResponse>;

  /** Fetch user info using the access token */
  getUserInfo(accessToken: string): Promise<OAuth2UserInfo>;
}

// PKCE helpers

export async function generateCodeVerifier(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
