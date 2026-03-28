import { z } from 'zod';

export const UpsertPlanSchema = z.object({
  memberId: z.string().min(1),
  planName: z.string().min(1),
  billingStart: z.string().min(1),
  isPersonal: z.boolean().optional().default(false),
  note: z.string().nullable().optional().default(null),
});

export type UpsertPlan = z.infer<typeof UpsertPlanSchema>;
