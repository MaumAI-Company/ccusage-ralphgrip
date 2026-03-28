import { NextResponse } from 'next/server';
import { getAuthenticatedEmail } from '@/lib/auth/helpers';
import { profileService, invalidateStats } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';
import { UpdateProfileSchema } from '@/lib/schemas';

export const GET = apiHandler({}, async ({ request }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await profileService.getProfile(email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!result.claimed) {
    return { claimed: false };
  }

  return {
    claimed: true,
    name: result.profile.name,
    displayName: result.profile.displayName,
    email: result.profile.email,
  };
});

export const PUT = apiHandler({ body: UpdateProfileSchema }, async ({ request, body }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await profileService.updateDisplayName(email, body.displayName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  invalidateStats();
  return { ok: true };
});
