import { NextResponse } from 'next/server';
import { UtilizationReportSchema } from '@/lib/schemas';
import { verifyAccessToken } from '@/lib/auth/tokens';
import { usageService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';

export const POST = apiHandler({}, async ({ request }) => {
  const rawBody = await request.json();
  const parseResult = UtilizationReportSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? 'Invalid request body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const body = parseResult.data;

  let authenticatedEmail: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const payload = await verifyAccessToken(authHeader.slice(7));
    if (payload) authenticatedEmail = payload.email;
  }

  const result = await usageService.ingestUtilization({
    memberName: body.memberName ?? undefined,
    utilization: body.utilization,
    rawUtilization: rawBody.utilization,
    authenticatedEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if ('message' in result) {
    return { success: true, message: result.message };
  }

  return { success: true };
});
