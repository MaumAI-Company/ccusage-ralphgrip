export interface ToolUsageEntry {
  toolName: string;
  callCount: number;
  acceptCount: number;
  rejectCount: number;
}

export interface ToolUsageSummary {
  toolName: string;
  totalCalls: number;
  totalAccepts: number;
  totalRejects: number;
}

export interface DailyToolUsage {
  date: string;
  toolName: string;
  totalCalls: number;
  totalAccepts: number;
  totalRejects: number;
}

export interface MemberSessionCount {
  displayName: string;
  sessionCount: number;
}

// Collector → Server로 전송하는 데이터
export interface UsageReport {
  memberName: string;
  sessionId: string;
  records: UsageRecord[];
  reportedAt: string;
  pluginVersion?: string;
  toolUsage?: ToolUsageEntry[];
  turnCount?: number;
  utilization?: {
    fiveHour: number | null;
    sevenDay: number | null;
    fiveHourResetsAt?: string | null;
    sevenDayResetsAt?: string | null;
  };
}

export interface UsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  projectName: string;
  recordedAt: string;
}

// DB에 저장되는 팀원
export interface TeamMember {
  id: string;
  name: string;
  createdAt?: string;
}

// Dashboard에서 사용하는 팀원 (간략)
export interface TeamMemberSummary {
  id: string;
  name: string;
  /** Resolved: display_name || email || name */
  displayName: string;
}

// 예산 관련 타입
export interface MemberBudgetUsage {
  memberId: string;
  displayName: string;
  budgetUsd: number;
  usedUsd: number;
  usagePercent: number;
}

export interface UsageVelocity {
  memberId: string;
  displayName: string;
  dailyAvgUsd: number;
  activeDays: number;
}

export interface BudgetConfig {
  id: string;
  memberId: string | null;
  budgetType: 'weekly' | 'monthly';
  budgetUsd: number;
}

export interface RollingUsage {
  memberId: string;
  displayName: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  sessionCount: number;
}

export interface MemberPlan {
  id: string;
  memberId: string;
  displayName: string;
  planName: string;
  billingStart: string;
  isPersonal: boolean;
  note: string | null;
}

export const PLAN_MONTHLY_USD: Record<string, number> = {
  max5: 100,
  max20: 200,
};

export interface UtilizationSnapshot {
  memberId: string;
  displayName: string;
  fiveHourPct: number | null;
  sevenDayPct: number | null;
  fiveHourResetsAt: string | null;
  sevenDayResetsAt: string | null;
  recordedAt: string;
}

export interface UtilizationHistory {
  displayName: string;
  fiveHourPct: number | null;
  sevenDayPct: number | null;
  recordedAt: string;
}
