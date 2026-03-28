import { NextResponse } from 'next/server';
import { isTestBypassEnabled } from '@/lib/auth/test-bypass';
import { setSessionCookie, type SessionData } from '@/lib/auth/session';

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isTestBypassEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  let email: string, name: string, avatarUrl: string | null = null;
  try {
    const body = await request.json();
    email = body.email;
    name = body.name;
    avatarUrl = body.avatarUrl ?? null;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !name) {
    return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
  }

  const sessionData: SessionData = {
    email,
    name,
    avatarUrl,
    provider: 'test',
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
  };
  await setSessionCookie(sessionData);

  return NextResponse.json({ ok: true, email, name });
}
