// Usage ingestion domain service.
// All dependencies injected — no direct imports of adapters or I/O.

import { processUsageRecords, validateUtilizationTimestamps } from './usage-processing';
import type {
  Clock,
  UsageRecordWriteRepository,
  MemberWriteRepository,
  ToolUsageWriteRepository,
  UtilizationWriteRepository,
  ValidToolEntry,
} from './ports';

export interface IngestReportInput {
  memberName?: string;
  sessionId: string;
  records: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    projectName?: string;
    recordedAt: string;
  }>;
  turnCount?: number;
  reportedAt?: string;
  toolUsage?: ValidToolEntry[];
  utilization?: {
    fiveHour: number | null;
    sevenDay: number | null;
    fiveHourResetsAt: string | null;
    sevenDayResetsAt: string | null;
  };
  rawUtilization?: {
    fiveHourResetsAt?: unknown;
    sevenDayResetsAt?: unknown;
  };
  authenticatedEmail?: string | null;
}

export interface IngestUtilizationInput {
  memberName?: string;
  utilization: {
    fiveHour: number | null;
    sevenDay: number | null;
    fiveHourResetsAt: string | null;
    sevenDayResetsAt: string | null;
  };
  rawUtilization?: {
    fiveHourResetsAt?: unknown;
    sevenDayResetsAt?: unknown;
  };
  authenticatedEmail?: string | null;
}

export type IngestResult =
  | { ok: true }
  | { ok: true; message: string }
  | { ok: false; error: string };

export class UsageService {
  private onIngest: () => void;

  constructor(
    private usageRecords: UsageRecordWriteRepository,
    private members: MemberWriteRepository,
    private toolUsage: ToolUsageWriteRepository,
    private utilization: UtilizationWriteRepository,
    private clock: Clock,
    onIngest?: () => void,
  ) {
    this.onIngest = onIngest ?? (() => {});
  }

  async ingestReport(input: IngestReportInput): Promise<IngestResult> {
    // Resolve member identity to a UUID upfront.
    // Authenticated email is the primary identity — memberName is only used
    // for unclaimed/unauthenticated records.
    let memberId: string;
    if (input.authenticatedEmail) {
      memberId = await this.members.getOrCreateByEmail(input.authenticatedEmail);
    } else if (input.memberName) {
      memberId = await this.members.getOrCreateByName(input.memberName);
    } else {
      return { ok: false, error: 'Either memberName or authenticated email is required' };
    }

    const validatedRecords = processUsageRecords(input.records);

    const utilError = validateUtilizationTimestamps(input.utilization, input.rawUtilization);
    if (utilError) {
      return { ok: false, error: utilError };
    }

    if (validatedRecords.length === 0) {
      return { ok: true, message: 'No valid records after filtering' };
    }

    await this.usageRecords.create(memberId, input.sessionId, validatedRecords, input.turnCount);

    // Notify SSE subscribers that data has changed (fire-and-forget)
    this.onIngest();

    // Link email to member if not already linked (for unclaimed records that now authenticate)
    if (input.authenticatedEmail && input.memberName) {
      try {
        await this.members.linkEmail(memberId, input.authenticatedEmail, this.clock.now());
      } catch (err) {
        console.error('Failed to auto-link email:', err);
      }
    }

    if (input.toolUsage && input.toolUsage.length > 0) {
      try {
        const recordedAt = validatedRecords[0]?.recordedAt ?? input.reportedAt ?? this.clock.now().toISOString();
        await this.toolUsage.create(memberId, input.sessionId, input.toolUsage, recordedAt);
      } catch (err) {
        console.error('Failed to save tool usage:', err);
      }
    }

    if (
      input.utilization &&
      (input.utilization.fiveHour !== null || input.utilization.sevenDay !== null ||
       input.utilization.fiveHourResetsAt !== null || input.utilization.sevenDayResetsAt !== null)
    ) {
      try {
        await this.utilization.create(
          memberId,
          typeof input.utilization.fiveHour === 'number' ? input.utilization.fiveHour : null,
          typeof input.utilization.sevenDay === 'number' ? input.utilization.sevenDay : null,
          input.utilization.fiveHourResetsAt ?? null,
          input.utilization.sevenDayResetsAt ?? null,
        );
      } catch (err) {
        console.error('Failed to save utilization:', err);
      }
    }

    return { ok: true };
  }

  async ingestUtilization(input: IngestUtilizationInput): Promise<IngestResult> {
    let memberId: string;
    if (input.authenticatedEmail) {
      memberId = await this.members.getOrCreateByEmail(input.authenticatedEmail);
    } else if (input.memberName) {
      memberId = await this.members.getOrCreateByName(input.memberName);
    } else {
      return { ok: false, error: 'Either memberName or authenticated email is required' };
    }

    const utilError = validateUtilizationTimestamps(input.utilization, input.rawUtilization);
    if (utilError) {
      return { ok: false, error: utilError };
    }

    if (input.utilization.fiveHour === null && input.utilization.sevenDay === null &&
        input.utilization.fiveHourResetsAt === null && input.utilization.sevenDayResetsAt === null) {
      return { ok: true, message: 'No utilization data to store' };
    }

    await this.utilization.create(
      memberId,
      typeof input.utilization.fiveHour === 'number' ? input.utilization.fiveHour : null,
      typeof input.utilization.sevenDay === 'number' ? input.utilization.sevenDay : null,
      input.utilization.fiveHourResetsAt ?? null,
      input.utilization.sevenDayResetsAt ?? null,
    );

    this.onIngest();
    return { ok: true };
  }
}
