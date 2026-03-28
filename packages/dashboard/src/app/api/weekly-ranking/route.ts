import { WeeklyRankingQuerySchema } from '@/lib/schemas';
import { statsService } from '@/lib/container';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler({ query: WeeklyRankingQuerySchema }, async ({ query }) => {
  return statsService.getWeeklyRanking(query.offset);
});
