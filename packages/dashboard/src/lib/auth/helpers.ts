// Shared auth helpers for route handlers.

import { NextRequest } from 'next/server';
import { getSession } from './session';
import { verifyAccessToken } from './tokens';

/** Extract authenticated email from session cookie or bearer token. */
export async function getAuthenticatedEmail(request: NextRequest): Promise<string | null> {
  // Try session cookie first
  const session = await getSession();
  if (session) return session.email;

  // Try bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const payload = await verifyAccessToken(authHeader.slice(7));
    if (payload) return payload.email;
  }

  return null;
}
