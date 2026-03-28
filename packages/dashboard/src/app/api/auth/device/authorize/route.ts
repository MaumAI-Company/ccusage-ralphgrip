import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { deviceChallengeService } from '@/lib/container';

// GET: Check if challenge is valid (used by the confirmation page)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const info = await deviceChallengeService.getStatus(code);
  if (info.status === 'not_found' || info.status === 'expired') {
    return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 410 });
  }

  return NextResponse.json({
    status: info.status,
    code,
    userEmail: session.email,
    userName: session.name,
  });
}

// POST: Authorize the challenge
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let code: string;
  try {
    const body = await request.json();
    code = body.code;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const success = await deviceChallengeService.authorize(code, session.email, session.name);
  if (!success) {
    return NextResponse.json({ error: 'Challenge not found, expired, or already used' }, { status: 410 });
  }

  return NextResponse.json({ ok: true });
}
