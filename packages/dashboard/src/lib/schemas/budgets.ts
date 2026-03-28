import { z } from 'zod';
import { uuid, budgetType } from './common';

export const UpsertBudgetSchema = z.object({
  memberId: uuid.nullable().optional().default(null),
  budgetType,
  budgetUsd: z.number().min(0).max(1_000_000).refine((v) => !isNaN(v), {
    message: 'budgetUsd must not be NaN',
  }),
});

export type UpsertBudget = z.infer<typeof UpsertBudgetSchema>;
