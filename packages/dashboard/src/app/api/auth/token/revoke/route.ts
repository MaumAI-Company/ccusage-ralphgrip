import { NextRequest, NextResponse } from 'next/server';
import { refreshTokenService } from '@/lib/container';

export async function POST(request: NextRequest) {
  let refreshToken: string;
  try {
    const body = await request.json();
    refreshToken = body.refresh_token;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!refreshToken) {
    return NextResponse.json({ error: 'Missing refresh_token' }, { status: 400 });
  }

  await refreshTokenService.revoke(refreshToken);
  return NextResponse.json({ ok: true });
}
