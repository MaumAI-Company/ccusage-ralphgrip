import { NextRequest, NextResponse } from 'next/server';
import { UsageReportSchema, ToolUsageEntrySchema } from '@/lib/schemas';
import { verifyAccessToken } from '@/lib/auth/tokens';
import { usageService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';

export const POST = apiHandler({}, async ({ request }: { request: NextRequest }) => {
  // Parse and validate body (need raw body for rawUtilization pass-through)
  const rawBody = await request.json();
  const parseResult = UsageReportSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? 'Invalid request body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const body = parseResult.data;

  // Extract authenticated email from bearer token
  let authenticatedEmail: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const payload = await verifyAccessToken(authHeader.slice(7));
    if (payload) authenticatedEmail = payload.email;
  }

  // Filter tool usage through schema validation
  const validatedToolUsage = body.toolUsage?.filter(
    (t) => ToolUsageEntrySchema.safeParse(t).success,
  );

  const result = await usageService.ingestReport({
    memberName: body.memberName ?? undefined,
    sessionId: body.sessionId,
    records: body.records,
    turnCount: body.turnCount,
    reportedAt: body.reportedAt,
    toolUsage: validatedToolUsage,
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
