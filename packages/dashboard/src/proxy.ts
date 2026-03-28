import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { decrypt } from '@/lib/auth/session';
import { jwtVerify } from 'jose';
import { loadAppConfig } from '@/lib/adapters/env-config';
import { routing } from '@/i18n/routing';

const SESSION_COOKIE = 'ccusage_session';

// Feature flag: allow unauthenticated usage submissions from legacy plugins.
// Set ALLOW_UNAUTHED_USAGE=true in .env.local to enable.
// Remove once all plugin users have updated to OAuth-enabled versions.
const ALLOW_UNAUTHED_USAGE = process.env.ALLOW_UNAUTHED_USAGE === 'true';

const intlMiddleware = createIntlMiddleware(routing);

// Routes that never require authentication
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/install',
  '/api/version',
  '/_next/',
  '/favicon.ico',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// Strip locale prefix to get the logical path for auth checks
function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || '/';
    }
  }
  return pathname;
}

// Pages that are public (no auth required) — checked against logical path (without locale prefix)
const PUBLIC_PAGES = ['/setup'];

function isPublicPage(logicalPath: string): boolean {
  return PUBLIC_PAGES.some(page => logicalPath === page || logicalPath.startsWith(page + '/'));
}

function getSigningKey(): Uint8Array {
  const { sessionSecret } = loadAppConfig();
  return new TextEncoder().encode(sessionSecret);
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API and static routes: skip locale handling, apply auth directly
  if (isApiRoute(pathname) || pathname.startsWith('/_next/') || pathname.includes('.')) {
    const response = NextResponse.next();
    addSecurityHeaders(response);

    if (isPublicRoute(pathname)) return response;

    // Feature flag: allow legacy plugins to POST usage without auth
    if (ALLOW_UNAUTHED_USAGE && (pathname === '/api/usage' || pathname === '/api/utilization') && request.method === 'POST') {
      return response;
    }

    // Auth check for API routes
    const sessionCookie = request.cookies.get(SESSION_COOKIE);
    if (sessionCookie?.value) {
      const session = await decrypt(sessionCookie.value);
      if (session) return response;
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        await jwtVerify(authHeader.slice(7), getSigningKey());
        return response;
      } catch {
        // Invalid token, fall through to 401
      }
    }

    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return response;
  }

  // Page routes: run next-intl middleware for locale detection/redirect
  const response = intlMiddleware(request);
  addSecurityHeaders(response);

  // Determine the logical path (without locale prefix) for auth checks
  const logicalPath = stripLocale(pathname);
  if (isPublicPage(logicalPath)) return response;

  // Auth check for page routes
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (sessionCookie?.value) {
    const session = await decrypt(sessionCookie.value);
    if (session) return response;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      await jwtVerify(authHeader.slice(7), getSigningKey());
      return response;
    } catch {
      // Invalid token, fall through
    }
  }

  // No valid auth — let page through, frontend AuthGate handles the login UI
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
  ],
};
