import { NextResponse } from 'next/server';
import { UpsertPlanSchema } from '@/lib/schemas';
import { planService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';
import { getAuthenticatedEmail } from '@/lib/auth/helpers';

export const GET = apiHandler({}, async () => {
  return planService.getAll();
});

export const POST = apiHandler({ body: UpsertPlanSchema }, async ({ request, body }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await planService.upsert(body.memberId, body.planName, body.billingStart, body.isPersonal, body.note);
  return { ok: true };
});
