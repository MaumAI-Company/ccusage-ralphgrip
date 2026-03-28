import { NextResponse } from 'next/server';
import { statsService, teamService } from '@/lib/container';

export const dynamic = 'force-dynamic';

export async function GET() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const [stats, teamLeaderboard] = await Promise.all([
    statsService.getAll(1),
    teamService.getLeaderboard(since),
  ]);
  return NextResponse.json({
    teamLeaderboard,
    members: stats.members?.slice(0, 15) ?? [],
    totalCost: stats.members?.reduce((s, m) => s + m.totalCost, 0) ?? 0,
    sessionCount: stats.sessionCount ?? 0,
    teamCount: teamLeaderboard.length,
    memberCount: stats.teamMembers?.length ?? 0,
  });
}
