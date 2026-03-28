import { NextResponse } from 'next/server';
import { isTestBypassEnabled } from '@/lib/auth/test-bypass';
import { signAccessToken, generateRefreshToken } from '@/lib/auth/tokens';
import { refreshTokenService } from '@/lib/container';

export async function POST(request: Request) {
  if (!isTestBypassEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  let email: string, name: string;
  try {
    const body = await request.json();
    email = body.email;
    name = body.name;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !name) {
    return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
  }

  const accessToken = await signAccessToken({ sub: email, email, name });
  const refreshToken = generateRefreshToken();
  await refreshTokenService.store(refreshToken, email, name);

  return NextResponse.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
  });
}
