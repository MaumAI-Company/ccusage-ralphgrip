import { NextResponse } from 'next/server';
import { UpsertBudgetSchema } from '@/lib/schemas';
import { budgetService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';
import { getAuthenticatedEmail } from '@/lib/auth/helpers';

export const GET = apiHandler({}, async () => {
  return budgetService.getAll();
});

export const POST = apiHandler({ body: UpsertBudgetSchema }, async ({ request, body }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await budgetService.upsert(body.memberId, body.budgetType, body.budgetUsd);
  return { success: true };
});
