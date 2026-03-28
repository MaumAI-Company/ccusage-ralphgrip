import { NextResponse } from 'next/server';
import { StatsQuerySchema } from '@/lib/schemas';
import { teamService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler({ query: StatsQuerySchema }, async ({ query }) => {
  const sinceDate = new Date(Date.now() - query.days * 86400000).toISOString();
  const data = await teamService.getLeaderboard(sinceDate);
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
  return response;
});
