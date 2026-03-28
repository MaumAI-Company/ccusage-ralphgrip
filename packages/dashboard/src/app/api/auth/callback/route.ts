import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { googleProvider } from '@/lib/auth/google';
import { setSessionCookie, type SessionData } from '@/lib/auth/session';
import { allowlistService } from '@/lib/container';
import { getRedirectUri, getBaseUrl } from '@/lib/auth/config';

const PKCE_COOKIE = 'ccusage_pkce';
const STATE_COOKIE = 'ccusage_state';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const errorParam = request.nextUrl.searchParams.get('error');
  const baseUrl = getBaseUrl(request.url);

  if (errorParam) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=missing_params`);
  }

  const cookieStore = await cookies();
  const pkceCookie = cookieStore.get(PKCE_COOKIE);
  const stateCookie = cookieStore.get(STATE_COOKIE);

  if (!pkceCookie?.value || !stateCookie?.value) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=expired_session`);
  }

  // Validate state for CSRF protection
  let returnTo = '/';
  try {
    const stateData = JSON.parse(stateCookie.value);
    if (stateData.state !== stateParam) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=invalid_state`);
    }
    returnTo = stateData.returnTo || '/';
  } catch {
    return NextResponse.redirect(`${baseUrl}/?auth_error=invalid_state`);
  }

  // Clean up PKCE/state cookies
  cookieStore.delete(PKCE_COOKIE);
  cookieStore.delete(STATE_COOKIE);

  try {
    // Exchange code for tokens
    const redirectUri = getRedirectUri(request.url);
    const tokenResponse = await googleProvider.exchangeCode({
      code,
      redirectUri,
      codeVerifier: pkceCookie.value,
    });

    // Fetch user info
    const userInfo = await googleProvider.getUserInfo(tokenResponse.access_token);

    // Check allowlist
    if (!(await allowlistService.isEmailAllowed(userInfo.email))) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=not_allowed`);
    }

    // Set session cookie
    const sessionData: SessionData = {
      email: userInfo.email,
      name: userInfo.name,
      avatarUrl: userInfo.avatarUrl,
      provider: 'google',
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
    };
    await setSessionCookie(sessionData);

    // Validate returnTo is a relative path (prevent open redirect)
    const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/';
    return NextResponse.redirect(`${baseUrl}${safeReturnTo}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}/?auth_error=exchange_failed`);
  }
}
