import { NextRequest, NextResponse } from 'next/server';
import { deviceChallengeService } from '@/lib/container';
import { getBaseUrl } from '@/lib/auth/config';

export async function POST(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request.url);
    const challenge = await deviceChallengeService.create(baseUrl);
    return NextResponse.json(challenge);
  } catch (err) {
    console.error('Device challenge creation failed:', err);
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
  }
}
