import { z } from 'zod';
import {
  memberName,
  sessionId,
  isoDate,
  optionalIsoDate,
  nonNegInt,
  tokenCount,
  modelName,
  MAX_STRING_LENGTH,
  MAX_RECORDS_PER_REPORT,
} from './common';

export const ToolUsageEntrySchema = z.object({
  toolName: z.string().min(1),
  callCount: nonNegInt,
  acceptCount: nonNegInt,
  rejectCount: nonNegInt,
});

export const UsageRecordSchema = z.object({
  model: modelName,
  inputTokens: tokenCount,
  outputTokens: tokenCount,
  cacheCreationTokens: z.number().optional().default(0),
  cacheReadTokens: z.number().optional().default(0),
  costUsd: z.number().optional(), // ignored — server recalculates
  projectName: z.string().max(MAX_STRING_LENGTH).optional().default(''),
  recordedAt: isoDate,
});

export const UtilizationPayloadSchema = z.object({
  fiveHour: z.number().nullable(),
  sevenDay: z.number().nullable(),
  fiveHourResetsAt: optionalIsoDate,
  sevenDayResetsAt: optionalIsoDate,
});

export const UsageReportSchema = z.object({
  memberName: memberName.optional(),
  sessionId,
  records: z.array(UsageRecordSchema).min(1).max(MAX_RECORDS_PER_REPORT),
  reportedAt: z.string().optional(),
  toolUsage: z.array(ToolUsageEntrySchema).optional(),
  turnCount: z.number().optional(),
  utilization: UtilizationPayloadSchema.optional(),
  pluginVersion: z.string().max(32).optional(),
});

export type UsageReport = z.infer<typeof UsageReportSchema>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export type ToolUsageEntry = z.infer<typeof ToolUsageEntrySchema>;
