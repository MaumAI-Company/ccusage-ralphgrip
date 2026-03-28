// Pure usage record processing — validation, cost recalculation, filtering.
// No DB or HTTP dependencies.

import { estimateCost } from '@/lib/pricing';

export interface ParsedUsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  projectName: string;
  recordedAt: string;
}

interface RawRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  projectName?: string;
  recordedAt: string;
}

/**
 * Validate and recalculate cost for usage records.
 * Filters out synthetic models, normalizes cache tokens, recalculates cost server-side.
 */
export function processUsageRecords(records: RawRecord[]): ParsedUsageRecord[] {
  const validated: ParsedUsageRecord[] = [];

  for (const r of records) {
    if (r.model === '<synthetic>') continue;

    const cacheCreationTokens = Number.isInteger(r.cacheCreationTokens) && (r.cacheCreationTokens ?? 0) >= 0
      ? r.cacheCreationTokens!
      : 0;
    const cacheReadTokens = Number.isInteger(r.cacheReadTokens) && (r.cacheReadTokens ?? 0) >= 0
      ? r.cacheReadTokens!
      : 0;

    const costUsd = estimateCost(r.model, r.inputTokens, r.outputTokens, cacheCreationTokens, cacheReadTokens);

    validated.push({
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      costUsd,
      projectName: (r.projectName ?? '').slice(0, 256),
      recordedAt: r.recordedAt,
    });
  }

  return validated;
}

/**
 * Validate utilization reset timestamps.
 * Returns error message if invalid, null if OK.
 */
export function validateUtilizationTimestamps(
  parsed: { fiveHourResetsAt: string | null; sevenDayResetsAt: string | null } | undefined,
  raw: { fiveHourResetsAt?: unknown; sevenDayResetsAt?: unknown } | undefined,
): string | null {
  if (!parsed || !raw) return null;

  const hadFiveHour = raw.fiveHourResetsAt !== undefined && raw.fiveHourResetsAt !== null && raw.fiveHourResetsAt !== '';
  const hadSevenDay = raw.sevenDayResetsAt !== undefined && raw.sevenDayResetsAt !== null && raw.sevenDayResetsAt !== '';

  if ((hadFiveHour && parsed.fiveHourResetsAt === null) || (hadSevenDay && parsed.sevenDayResetsAt === null)) {
    return 'Invalid utilization reset timestamp';
  }

  return null;
}
