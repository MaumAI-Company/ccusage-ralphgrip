import { z } from 'zod';
import { memberName } from './common';
import { UtilizationPayloadSchema } from './usage';

export const UtilizationReportSchema = z.object({
  memberName: memberName.optional(),
  utilization: UtilizationPayloadSchema,
  pluginVersion: z.string().max(32).optional(),
});

export type UtilizationReport = z.infer<typeof UtilizationReportSchema>;
