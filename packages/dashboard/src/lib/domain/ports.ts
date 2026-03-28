// Port interfaces for Hexagonal Architecture.
// Domain logic depends on these interfaces, never on concrete implementations.

// ============================================
// Clock Port
// ============================================

/** Injectable clock for testability — domain code never calls Date.now() directly. */
export interface Clock {
  now(): Date;
}

/** Default clock — uses system time. */
export const systemClock: Clock = {
  now: () => new Date(),
};

// ============================================
// Config Port
// ============================================

export interface AppConfig {
  sessionSecret: string;
  oauth: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
  };
  allowlistEnabled: boolean;
  testBypassEnabled: boolean;
}

// ============================================
// Row Types (shared value objects)
// ============================================

export interface DailyUsageRow {
  date: string;
  displayName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export interface MemberUsageRow {
  displayName: string;
  totalCost: number;
  totalTokens: number;
}

export interface ModelDistributionRow {
  model: string;
  count: number;
  totalCost: number;
}

export interface MemberSessionCountRow {
  displayName: string;
  sessionCount: number;
}

export interface BudgetUsageRow {
  memberId: string;
  displayName: string;
  budgetUsd: number;
  usedUsd: number;
  usagePercent: number;
}

export interface VelocityRow {
  memberId: string;
  displayName: string;
  dailyAvgUsd: number;
  activeDays: number;
}

export interface BudgetConfigRow {
  id: string;
  memberId: string | null;
  budgetType: 'weekly' | 'monthly';
  budgetUsd: number;
}

export interface UtilizationRow {
  memberId: string;
  displayName: string;
  fiveHourPct: number | null;
  sevenDayPct: number | null;
  fiveHourResetsAt: string | null;
  sevenDayResetsAt: string | null;
  recordedAt: string;
}

export interface RollingUsageRow {
  memberId: string;
  displayName: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  sessionCount: number;
}

export interface UtilizationHistoryRow {
  displayName: string;
  fiveHourPct: number | null;
  sevenDayPct: number | null;
  recordedAt: string;
}

export interface ToolUsageSummaryRow {
  toolName: string;
  totalCalls: number;
  totalAccepts: number;
  totalRejects: number;
}

export interface DailyToolUsageRow {
  date: string;
  toolName: string;
  totalCalls: number;
  totalAccepts: number;
  totalRejects: number;
}

export interface MemberPlanRow {
  id: string;
  memberId: string;
  displayName: string;
  planName: string;
  billingStart: string;
  isPersonal: boolean;
  note: string | null;
}

export interface TeamMemberRow {
  id: string;
  name: string;
  /** Resolved display name: display_name || email || name (always non-null) */
  displayName: string;
  createdAt?: string;
}

export interface UnclaimedMemberRow {
  name: string;
  recordCount: number;
  firstSeen: string;
}

// ============================================
// Write-side Repository Ports (ingestion)
// ============================================

export interface UsageRecordWriteRepository {
  create(memberId: string, sessionId: string, records: ProcessedRecord[], turnCount?: number): Promise<void>;
}

export interface ProcessedRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  projectName: string;
  recordedAt: string;
}

export interface MemberWriteRepository {
  /** Resolve a member by email, creating if needed. Returns the member UUID. */
  getOrCreateByEmail(email: string): Promise<string>;
  /** Resolve an unclaimed member by name, creating if needed. Returns the member UUID. */
  getOrCreateByName(name: string): Promise<string>;
  /** Link an email to a member and set authenticated_at. */
  linkEmail(memberId: string, email: string, authenticatedAt: Date): Promise<void>;
}

export interface ToolUsageWriteRepository {
  create(memberId: string, sessionId: string, entries: ValidToolEntry[], recordedAt: string): Promise<void>;
}

export interface ValidToolEntry {
  toolName: string;
  callCount: number;
  acceptCount: number;
  rejectCount: number;
}

export interface UtilizationWriteRepository {
  create(memberId: string, fiveHourPct: number | null, sevenDayPct: number | null, fiveHourResetsAt: string | null, sevenDayResetsAt: string | null): Promise<void>;
}

// ============================================
// Read-side Repository Ports (dashboard queries)
// ============================================

export interface UsageReadRepository {
  getDailyUsage(sinceDate: string): Promise<DailyUsageRow[]>;
  getMemberUsage(sinceDate: string): Promise<MemberUsageRow[]>;
  getMemberUsagePeriod(startDate: string, endDate: string): Promise<MemberUsageRow[]>;
  getModelDistribution(sinceDate: string): Promise<ModelDistributionRow[]>;
  getSessionCount(sinceDate: string): Promise<number>;
  getTotalTurns(sinceDate: string): Promise<number>;
  getMemberSessionCount(sinceDate: string): Promise<MemberSessionCountRow[]>;
}

export interface MemberReadRepository {
  getAllMembers(): Promise<TeamMemberRow[]>;
}

export interface BudgetRepository {
  getMemberBudgetUsage(periodType: string, periodStart: string): Promise<BudgetUsageRow[]>;
  getUsageVelocity(sinceDate: string): Promise<VelocityRow[]>;
  upsertBudget(memberId: string | null, budgetType: string, budgetUsd: number): Promise<void>;
  getAllBudgets(): Promise<BudgetConfigRow[]>;
}

export interface UtilizationReadRepository {
  getLatestUtilization(): Promise<UtilizationRow[]>;
  getRollingUsage5h(): Promise<RollingUsageRow[]>;
  getRollingUsage7d(): Promise<RollingUsageRow[]>;
  getUtilizationHistory(sinceDate: string): Promise<UtilizationHistoryRow[]>;
}

export interface PlanRepository {
  getAllMemberPlans(): Promise<MemberPlanRow[]>;
  upsertMemberPlan(memberId: string, planName: string, billingStart: string, isPersonal: boolean, note: string | null): Promise<void>;
}

export interface ToolUsageReadRepository {
  getToolUsageSummary(sinceDate: string): Promise<ToolUsageSummaryRow[]>;
  getDailyToolUsage(sinceDate: string): Promise<DailyToolUsageRow[]>;
}

export interface ReportRepository {
  getReportMembers(sinceDate: string): Promise<import('./reporting').MemberReport[]>;
  getReportDaily(sinceDate: string): Promise<import('./reporting').DailyReport[]>;
  getReportWeekly(sinceDate: string): Promise<import('./reporting').WeeklyReport[]>;
  getReportModels(sinceDate: string): Promise<import('./reporting').ModelReport[]>;
  getReportProjects(sinceDate: string): Promise<import('./reporting').ProjectReport[]>;
  getReportSummary(sinceDate: string): Promise<import('./reporting').ReportSummary>;
  getMemberPlansForReport(): Promise<ReportPlanRow[]>;
}

export interface ReportPlanRow {
  memberId: unknown;
  displayName: string;
  planName: unknown;
  billingStart: unknown;
  isPersonal: unknown;
  email: string;
  cardType: string;
  companySupported: boolean;
}

export interface ClaimRepository {
  getUnclaimedMembersWithCounts(): Promise<UnclaimedMemberRow[]>;
  findMemberByName(name: string): Promise<{ id: string; email: string | null } | null>;
  claimMember(memberId: string, email: string): Promise<void>;
}

// ============================================
// Profile Repository Port
// ============================================

export interface MemberProfileRow {
  id: string;
  name: string;
  displayName: string | null;
  email: string | null;
}

export interface ProfileRepository {
  getMemberByEmail(email: string): Promise<MemberProfileRow | null>;
  updateDisplayName(memberId: string, displayName: string): Promise<void>;
}

// ============================================
// Auth Repository Ports
// ============================================

export interface DeviceChallengeRow {
  status: string;
  userEmail: string | null;
  userName: string | null;
  expiresAt: string;
}

export interface DeviceChallengeRepository {
  create(challengeHash: string, expiresAt: string): Promise<void>;
  getByHash(challengeHash: string): Promise<DeviceChallengeRow | null>;
  authorize(challengeHash: string, userEmail: string, userName: string): Promise<boolean>;
  deleteByHash(challengeHash: string): Promise<void>;
}

export interface RefreshTokenRepository {
  store(tokenHash: string, userEmail: string, userName: string, expiresAt: string): Promise<void>;
  findByHash(tokenHash: string): Promise<{ userEmail: string; userName: string; expiresAt: string } | null>;
  deleteByHash(tokenHash: string): Promise<void>;
}

export interface AllowlistRepository {
  isEmailInList(email: string): Promise<boolean>;
}
