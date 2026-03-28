import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    email: session.email,
    name: session.name,
    avatarUrl: session.avatarUrl,
    provider: session.provider,
  });
}
