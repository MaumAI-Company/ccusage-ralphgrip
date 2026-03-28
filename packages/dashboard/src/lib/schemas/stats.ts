import { z } from 'zod';
import { daysParam } from './common';

export const StatsQuerySchema = z.object({
  days: daysParam,
});

export type StatsQuery = z.infer<typeof StatsQuerySchema>;
