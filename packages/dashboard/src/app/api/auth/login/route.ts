import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { googleProvider } from '@/lib/auth/google';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/auth/provider';
import { getRedirectUri } from '@/lib/auth/config';

const PKCE_COOKIE = 'ccusage_pkce';
const STATE_COOKIE = 'ccusage_state';
const COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('return_to') || '/';

  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Encode return_to in a separate cookie (state param is opaque for CSRF)
  const redirectUri = getRedirectUri(request.url);
  const authUrl = googleProvider.buildAuthUrl({
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
  });

  const cookieStore = await cookies();

  // Store PKCE verifier and state in short-lived cookies
  cookieStore.set(PKCE_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  cookieStore.set(STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  return NextResponse.redirect(authUrl);
}
