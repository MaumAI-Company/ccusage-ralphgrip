// Stats service — aggregates all dashboard read queries with caching.
// All dependencies injected — no direct imports of adapters or I/O.

import { getWeekStart, getWeekStartByOffset, getMonthStart } from './time';
import type {
  Clock,
  UsageReadRepository,
  MemberReadRepository,
  BudgetRepository,
  UtilizationReadRepository,
  PlanRepository,
  ToolUsageReadRepository,
} from './ports';

// In-memory cache
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 15_000; // 15 seconds

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiry > now) return entry.data as T;
  const data = await fn();
  cache.set(key, { data, expiry: now + CACHE_TTL });
  return data;
}

/** Invalidate all cached stats (e.g. after display name change). */
export function invalidateStatsCache() {
  cache.clear();
}

export class StatsService {
  constructor(
    private usage: UsageReadRepository,
    private members: MemberReadRepository,
    private budgets: BudgetRepository,
    private utilization: UtilizationReadRepository,
    private plans: PlanRepository,
    private toolUsage: ToolUsageReadRepository,
    private clock: Clock,
  ) {}

  private sinceFromDays(days: number): string {
    return new Date(this.clock.now().getTime() - days * 86400000).toISOString();
  }

  async getAll(days: number) {
    const since = this.sinceFromDays(days);
    const k = String(days);
    const weekStartDate = getWeekStart(this.clock.now());
    const monthStartDate = getMonthStart(this.clock.now());
    const velocitySince = this.sinceFromDays(7);

    const [daily, members, models, teamMembers, weeklyBudgets, monthlyBudgets, velocity, budgetConfigs, sessionCount, rolling5h, rolling7d, utilization, memberPlans, weeklyRanking, previousWeekTop, totalTurns, memberSessionCount, utilizationHistory] = await Promise.all([
      cached(`daily-${k}`, () => this.usage.getDailyUsage(since)),
      cached(`members-${k}`, () => this.usage.getMemberUsage(since)),
      cached(`models-${k}`, () => this.usage.getModelDistribution(since)),
      cached('teamMembers', () => this.members.getAllMembers()),
      cached('weeklyBudgets', () => this.budgets.getMemberBudgetUsage('weekly', weekStartDate.toISOString())),
      cached('monthlyBudgets', () => this.budgets.getMemberBudgetUsage('monthly', monthStartDate.toISOString())),
      cached('velocity', () => this.budgets.getUsageVelocity(velocitySince)),
      cached('budgets', () => this.budgets.getAllBudgets()),
      cached(`sessionCount-${k}`, () => this.usage.getSessionCount(since)),
      cached('rolling5h', () => this.utilization.getRollingUsage5h()),
      cached('rolling7d', () => this.utilization.getRollingUsage7d()),
      cached('utilization', () => this.utilization.getLatestUtilization()),
      cached('memberPlans', () => this.plans.getAllMemberPlans()),
      cached('weeklyRanking', () => this.usage.getMemberUsage(weekStartDate.toISOString())),
      cached('previousWeekTop', () => this.getPreviousWeekTopMembers(3)),
      cached(`totalTurns-${k}`, () => this.usage.getTotalTurns(since)),
      cached(`memberSessionCount-${k}`, () => this.usage.getMemberSessionCount(since)),
      cached(`utilizationHistory-${k}`, () => this.utilization.getUtilizationHistory(since)),
    ]);

    return {
      daily, members, models, teamMembers, weeklyBudgets, monthlyBudgets,
      velocity, budgetConfigs, sessionCount, rolling5h, rolling7d, utilization,
      memberPlans, weeklyRanking, previousWeekTop, totalTurns, memberSessionCount,
      utilizationHistory,
    };
  }

  async getWeeklyRanking(offset: number) {
    // Snapshot now once to prevent clock race at week boundaries
    const now = this.clock.now();
    const [weeklyRanking, previousWeekTop] = await Promise.all([
      this.getWeekMemberUsageByOffset(offset, now),
      this.getWeekMemberUsageByOffset(offset - 1, now).then(r => r.slice(0, 3)),
    ]);
    return { weeklyRanking, previousWeekTop };
  }

  private async getWeekMemberUsageByOffset(offset: number, now: Date) {
    const weekStart = getWeekStartByOffset(offset, now);

    if (offset === 0) {
      return this.usage.getMemberUsage(weekStart.toISOString());
    }

    // Bounded query: exact week window, no subtraction needed
    const weekEnd = getWeekStartByOffset(offset + 1, now);
    return this.usage.getMemberUsagePeriod(weekStart.toISOString(), weekEnd.toISOString());
  }

  private async getPreviousWeekTopMembers(limit: number) {
    const now = this.clock.now();
    const currentWeekStart = getWeekStart(now);
    const prevWeekStart = getWeekStartByOffset(-1, now);

    const data = await this.usage.getMemberUsagePeriod(
      prevWeekStart.toISOString(),
      currentWeekStart.toISOString(),
    );
    return data.slice(0, limit);
  }
}
