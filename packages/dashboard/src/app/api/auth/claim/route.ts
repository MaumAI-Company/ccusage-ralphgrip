import { NextResponse } from 'next/server';
import { getAuthenticatedEmail } from '@/lib/auth/helpers';
import { claimService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler({}, async ({ request }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const unclaimed = await claimService.getUnclaimed();
  return { unclaimed };
});

export const POST = apiHandler({}, async ({ request }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let memberName: string;
  try {
    const body = await request.json();
    memberName = body.memberName;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!memberName) {
    return NextResponse.json({ error: 'Missing memberName' }, { status: 400 });
  }

  const result = await claimService.claim(memberName, email);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return { ok: true, memberName: result.memberName, email: result.email };
});
