import { NextResponse } from 'next/server';
import { StatsQuerySchema } from '@/lib/schemas';
import { statsService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler({ query: StatsQuerySchema }, async ({ query }) => {
  const data = await statsService.getAll(query.days);
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
  return response;
});
