import { NextResponse } from 'next/server';
import { ReportQuerySchema } from '@/lib/schemas';
import { reportService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler({ query: ReportQuerySchema }, async ({ query }) => {
  const data = await reportService.generateReport(query.days);
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
});
