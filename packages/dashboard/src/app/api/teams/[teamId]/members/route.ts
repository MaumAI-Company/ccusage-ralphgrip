import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';
import { getAuthenticatedEmail } from '@/lib/auth/helpers';
import { TeamMemberSchema } from '@/lib/schemas';

export const POST = apiHandler({ body: TeamMemberSchema }, async ({ request, body }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const teamId = extractTeamId(request);
  await teamService.assignMember(teamId, body.memberId);
  return { success: true };
});

export const DELETE = apiHandler({ body: TeamMemberSchema }, async ({ request, body }) => {
  const email = await getAuthenticatedEmail(request);
  if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const teamId = extractTeamId(request);
  await teamService.removeMember(teamId, body.memberId);
  return { success: true };
});

/** Extract teamId from the URL path: /api/teams/{teamId}/members */
function extractTeamId(request: NextRequest): string {
  const segments = new URL(request.url).pathname.split('/');
  // Segments: ['', 'api', 'teams', '{teamId}', 'members']
  const idx = segments.indexOf('teams');
  return segments[idx + 1];
}
