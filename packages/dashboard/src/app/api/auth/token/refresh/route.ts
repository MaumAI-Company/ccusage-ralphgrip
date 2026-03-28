import { NextRequest, NextResponse } from 'next/server';
import { refreshTokenService } from '@/lib/container';
import { signAccessToken } from '@/lib/auth/tokens';

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

  const user = await refreshTokenService.validate(refreshToken);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
  }

  const accessToken = await signAccessToken({
    sub: user.email,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({
    access_token: accessToken,
    expires_in: 3600,
  });
}
