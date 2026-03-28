import { NextRequest, NextResponse } from 'next/server';
import { deviceChallengeService, refreshTokenService } from '@/lib/container';
import { signAccessToken, generateRefreshToken } from '@/lib/auth/tokens';

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge');
  if (!challenge) {
    return NextResponse.json({ error: 'Missing challenge parameter' }, { status: 400 });
  }

  const info = await deviceChallengeService.getStatus(challenge);

  switch (info.status) {
    case 'not_found':
    case 'expired':
      return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 410 });

    case 'pending':
      return NextResponse.json({ status: 'pending' });

    case 'authorized': {
      // Issue tokens and consume the challenge (one-time use)
      const email = info.userEmail!;
      const name = info.userName!;

      const accessToken = await signAccessToken({ sub: email, email, name });
      const refreshToken = generateRefreshToken();
      await refreshTokenService.store(refreshToken, email, name);
      await deviceChallengeService.consume(challenge);

      return NextResponse.json({
        status: 'authorized',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        user: { email, name },
      });
    }
  }
}
