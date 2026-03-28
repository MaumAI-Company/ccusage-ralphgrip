// Mock repository implementations for all port interfaces.
// Each mock records calls and returns canned data — no I/O.

import type {
  UsageRecordWriteRepository, MemberWriteRepository, ToolUsageWriteRepository,
  UtilizationWriteRepository, UsageReadRepository, MemberReadRepository,
  BudgetRepository, UtilizationReadRepository, PlanRepository,
  ToolUsageReadRepository, ReportRepository, ClaimRepository,
  ProcessedRecord, ValidToolEntry, DailyUsageRow, MemberUsageRow,
  ModelDistributionRow, MemberSessionCountRow, BudgetUsageRow, VelocityRow,
  BudgetConfigRow, UtilizationRow, RollingUsageRow, UtilizationHistoryRow,
  MemberPlanRow, ToolUsageSummaryRow, DailyToolUsageRow, TeamMemberRow,
  ReportPlanRow, UnclaimedMemberRow, Clock,
} from '@/lib/domain/ports';


// Write-side mocks
export class MockUsageRecordWriteRepo implements UsageRecordWriteRepository {
  calls: Array<{ memberId: string; sessionId: string; records: ProcessedRecord[]; turnCount?: number }> = [];
  async create(memberId: string, sessionId: string, records: ProcessedRecord[], turnCount?: number) {
    this.calls.push({ memberId, sessionId, records, turnCount });
  }
}

export class MockMemberWriteRepo implements MemberWriteRepository {
  linkEmailCalls: Array<{ memberId: string; email: string; authenticatedAt: Date }> = [];
  getOrCreateByEmailCalls: string[] = [];
  getOrCreateByNameCalls: string[] = [];
  /** Map of email → memberId for getOrCreateByEmail lookups. */
  membersByEmail: Map<string, string> = new Map();
  /** Map of name → memberId for getOrCreateByName lookups. */
  membersByName: Map<string, string> = new Map();
  shouldThrow = false;
  private nextId = 1;

  async getOrCreateByEmail(email: string): Promise<string> {
    this.getOrCreateByEmailCalls.push(email);
    const existing = this.membersByEmail.get(email);
    if (existing) return existing;
    const id = `member-${this.nextId++}`;
    this.membersByEmail.set(email, id);
    return id;
  }

  async getOrCreateByName(name: string): Promise<string> {
    this.getOrCreateByNameCalls.push(name);
    const existing = this.membersByName.get(name);
    if (existing) return existing;
    const id = `member-${this.nextId++}`;
    this.membersByName.set(name, id);
    return id;
  }

  async linkEmail(memberId: string, email: string, authenticatedAt: Date) {
    if (this.shouldThrow) throw new Error('mock error');
    this.linkEmailCalls.push({ memberId, email, authenticatedAt });
  }
}

export class MockToolUsageWriteRepo implements ToolUsageWriteRepository {
  calls: Array<{ memberId: string; sessionId: string; entries: ValidToolEntry[]; recordedAt: string }> = [];
  async create(memberId: string, sessionId: string, entries: ValidToolEntry[], recordedAt: string) {
    this.calls.push({ memberId, sessionId, entries, recordedAt });
  }
}

export class MockUtilizationWriteRepo implements UtilizationWriteRepository {
  calls: Array<{ memberId: string; fiveHourPct: number | null; sevenDayPct: number | null; fiveHourResetsAt: string | null; sevenDayResetsAt: string | null }> = [];
  async create(memberId: string, fiveHourPct: number | null, sevenDayPct: number | null, fiveHourResetsAt: string | null, sevenDayResetsAt: string | null) {
    this.calls.push({ memberId, fiveHourPct, sevenDayPct, fiveHourResetsAt, sevenDayResetsAt });
  }
}

// Read-side mocks
export class MockUsageReadRepo implements UsageReadRepository {
  dailyUsage: DailyUsageRow[] = [];
  memberUsage: MemberUsageRow[] = [];
  memberUsageCalls: string[] = [];
  memberUsagePeriodCalls: Array<{ startDate: string; endDate: string }> = [];
  memberUsagePeriodData: MemberUsageRow[] | null = null;
  modelDistribution: ModelDistributionRow[] = [];
  sessionCount = 0;
  totalTurns = 0;
  memberSessionCount: MemberSessionCountRow[] = [];
  async getDailyUsage() { return this.dailyUsage; }
  async getMemberUsage(sinceDate: string) {
    this.memberUsageCalls.push(sinceDate);
    return this.memberUsage;
  }
  async getMemberUsagePeriod(startDate: string, endDate: string) {
    this.memberUsagePeriodCalls.push({ startDate, endDate });
    return this.memberUsagePeriodData ?? this.memberUsage;
  }
  async getModelDistribution() { return this.modelDistribution; }
  async getSessionCount() { return this.sessionCount; }
  async getTotalTurns() { return this.totalTurns; }
  async getMemberSessionCount() { return this.memberSessionCount; }
}

export class MockMemberReadRepo implements MemberReadRepository {
  members: TeamMemberRow[] = [];
  async getAllMembers() { return this.members; }
}

export class MockBudgetRepo implements BudgetRepository {
  budgetUsage: BudgetUsageRow[] = [];
  velocity: VelocityRow[] = [];
  budgets: BudgetConfigRow[] = [];
  upsertCalls: Array<{ memberId: string | null; budgetType: string; budgetUsd: number }> = [];
  async getMemberBudgetUsage() { return this.budgetUsage; }
  async getUsageVelocity() { return this.velocity; }
  async getAllBudgets() { return this.budgets; }
  async upsertBudget(memberId: string | null, budgetType: string, budgetUsd: number) {
    this.upsertCalls.push({ memberId, budgetType, budgetUsd });
  }
}

export class MockUtilizationReadRepo implements UtilizationReadRepository {
  latest: UtilizationRow[] = [];
  rolling5h: RollingUsageRow[] = [];
  rolling7d: RollingUsageRow[] = [];
  history: UtilizationHistoryRow[] = [];
  async getLatestUtilization() { return this.latest; }
  async getRollingUsage5h() { return this.rolling5h; }
  async getRollingUsage7d() { return this.rolling7d; }
  async getUtilizationHistory() { return this.history; }
}

export class MockPlanRepo implements PlanRepository {
  plans: MemberPlanRow[] = [];
  upsertCalls: Array<{ memberId: string; planName: string; billingStart: string; isPersonal: boolean; note: string | null }> = [];
  async getAllMemberPlans() { return this.plans; }
  async upsertMemberPlan(memberId: string, planName: string, billingStart: string, isPersonal: boolean, note: string | null) {
    this.upsertCalls.push({ memberId, planName, billingStart, isPersonal, note });
  }
}

export class MockToolUsageReadRepo implements ToolUsageReadRepository {
  summary: ToolUsageSummaryRow[] = [];
  daily: DailyToolUsageRow[] = [];
  async getToolUsageSummary() { return this.summary; }
  async getDailyToolUsage() { return this.daily; }
}

export class MockReportRepo implements ReportRepository {
  members: import('@/lib/domain/reporting').MemberReport[] = [];
  daily: import('@/lib/domain/reporting').DailyReport[] = [];
  weekly: import('@/lib/domain/reporting').WeeklyReport[] = [];
  models: import('@/lib/domain/reporting').ModelReport[] = [];
  projects: import('@/lib/domain/reporting').ProjectReport[] = [];
  summary: import('@/lib/domain/reporting').ReportSummary = { totalCost: 0, totalSessions: 0, totalMembers: 0, periodStart: '', periodEnd: '' };
  plans: ReportPlanRow[] = [];
  async getReportMembers() { return this.members; }
  async getReportDaily() { return this.daily; }
  async getReportWeekly() { return this.weekly; }
  async getReportModels() { return this.models; }
  async getReportProjects() { return this.projects; }
  async getReportSummary() { return this.summary; }
  async getMemberPlansForReport() { return this.plans; }
}

export class MockClaimRepo implements ClaimRepository {
  unclaimed: UnclaimedMemberRow[] = [];
  members: Map<string, { id: string; email: string | null }> = new Map();
  claimCalls: Array<{ memberId: string; email: string }> = [];
  async getUnclaimedMembersWithCounts() { return this.unclaimed; }
  async findMemberByName(name: string) { return this.members.get(name) ?? null; }
  async claimMember(memberId: string, email: string) { this.claimCalls.push({ memberId, email }); }
}

export function fixedClock(date: Date | string = '2026-03-24T12:00:00Z'): Clock {
  const d = typeof date === 'string' ? new Date(date) : date;
  return { now: () => d };
}
