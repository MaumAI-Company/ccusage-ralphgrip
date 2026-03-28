import { NextResponse } from 'next/server';
import { teamService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';
import { getAuthenticatedEmail } from '@/lib/auth/helpers';
import { CreateTeamSchema } from '@/lib/schemas';

export const GET = apiHandler({}, async () => {
  return teamService.getAllTeamsGrouped();
});

export const POST = apiHandler({ body: CreateTeamSchema }, async ({ request, body }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const teamId = await teamService.createTeam(body.name, body.displayName, body.color);
  return { success: true, teamId };
});
