import { z } from 'zod';

export const WeeklyRankingQuerySchema = z.object({
  offset: z.coerce.number().int().max(0).default(0),
});

export type WeeklyRankingQuery = z.infer<typeof WeeklyRankingQuerySchema>;
