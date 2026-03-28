import createClient from 'openapi-fetch';
import type { paths } from './api-types';
import type {
  MemberBudgetUsage, UsageVelocity, BudgetConfig, RollingUsage,
  UtilizationSnapshot, MemberPlan, ToolUsageSummary, DailyToolUsage,
  MemberSessionCount, TeamMemberSummary, UtilizationHistory,
} from './types';

const client = createClient<paths>({ baseUrl: '' });

// Shared frontend types (previously duplicated inline)

export interface DailyEntry {
  date: string;
  displayName: string;
  model: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface MemberSummary {
  displayName: string;
  totalCost: number;
  totalTokens: number;
}

export interface ModelSummary {
  model: string;
  count: number;
  totalCost: number;
}

export interface HackathonTeamEntry {
  teamId: string;
  teamName: string;
  teamDisplayName: string;
  teamColor: string | null;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  memberCount: number;
}

export interface StatsResponse {
  daily: DailyEntry[];
  members: MemberSummary[];
  models: ModelSummary[];
  teamMembers: TeamMemberSummary[];
  weeklyBudgets: MemberBudgetUsage[];
  monthlyBudgets: MemberBudgetUsage[];
  velocity: UsageVelocity[];
  budgetConfigs: BudgetConfig[];
  sessionCount: number;
  rolling5h: RollingUsage[];
  rolling7d: RollingUsage[];
  utilization: UtilizationSnapshot[];
  memberPlans: MemberPlan[];
  weeklyRanking: MemberSummary[];
  previousWeekTop: MemberSummary[];
  toolUsageSummary: ToolUsageSummary[];
  dailyToolUsage: DailyToolUsage[];
  totalTurns: number;
  memberSessionCount: MemberSessionCount[];
  utilizationHistory: UtilizationHistory[];
  teamLeaderboard: HackathonTeamEntry[];
}

export interface ReportMember {
  memberId: string;
  displayName: string;
  name: string;
  cost: number;
  sessions: number;
  activeDays: number;
}

export interface ReportPlan {
  memberId: string;
  displayName: string;
  planName: string;
  billingStart: string;
  isPersonal: boolean;
  email: string;
  cardType: string;
  companySupported: boolean;
}

export interface ReportData {
  summary: { totalCost: number; totalSessions: number; totalMembers: number; periodStart: string; periodEnd: string };
  members: ReportMember[];
  daily: { date: string; cost: number; sessions: number; members: number }[];
  weekly: { weekStart: string; cost: number; sessions: number; members: number }[];
  models: { model: string; cost: number; sessions: number }[];
  plans: ReportPlan[];
  projects: { project: string; cost: number; sessions: number; members: number }[];
}

export interface WeeklyRankingResponse {
  weeklyRanking: MemberSummary[];
  previousWeekTop: MemberSummary[];
}

// Typed API methods

export const api = {
  getStats: async (days: number, signal?: AbortSignal): Promise<StatsResponse> => {
    const res = await fetch(`/api/stats?days=${days}`, { signal });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return res.json();
  },

  getReport: async (days: number, signal?: AbortSignal): Promise<ReportData> => {
    const res = await fetch(`/api/report?days=${days}`, { signal });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return res.json();
  },

  getWeeklyRanking: async (offset: number): Promise<WeeklyRankingResponse> => {
    const res = await fetch(`/api/weekly-ranking?offset=${offset}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },

  postBudget: async (body: { memberId: string | null; budgetType: 'weekly' | 'monthly'; budgetUsd: number }) => {
    return client.POST('/api/budgets', { body });
  },

  postPlan: async (body: {
    memberId: string;
    planName: string;
    billingStart: string;
    isPersonal?: boolean;
    note?: string | null;
  }) => {
    return client.POST('/api/plans', { body });
  },
};
