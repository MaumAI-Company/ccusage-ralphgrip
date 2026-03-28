import { z } from 'zod';
import { daysParam } from './common';

export const ReportQuerySchema = z.object({
  days: daysParam,
});

export type ReportQuery = z.infer<typeof ReportQuerySchema>;
