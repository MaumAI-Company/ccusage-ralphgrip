import { describe, it, expect, beforeEach } from 'vitest';
import { StatsService, invalidateStatsCache } from './stats-service';
import {
  MockUsageReadRepo, MockMemberReadRepo, MockBudgetRepo,
  MockUtilizationReadRepo, MockPlanRepo, MockToolUsageReadRepo, fixedClock,
} from '@/lib/test-utils/mock-repos';

// Fixed clock: 2026-03-25T12:00:00Z
// KST = 2026-03-25T21:00:00 → week start = Monday 2026-03-23 00:00 KST = 2026-03-22T15:00:00.000Z
const WEEK_START_0 = '2026-03-22T15:00:00.000Z'; // current week start (Monday 2026-03-23 KST)
const WEEK_START_MINUS1 = '2026-03-15T15:00:00.000Z'; // prev week start
const WEEK_START_MINUS2 = '2026-03-08T15:00:00.000Z'; // two weeks ago start

describe('StatsService', () => {
  let usage: MockUsageReadRepo;
  let service: StatsService;

  beforeEach(() => {
    invalidateStatsCache();
    usage = new MockUsageReadRepo();
    const members = new MockMemberReadRepo();
    members.members = [{ id: 'm1', name: 'alice', displayName: 'alice' }];
    service = new StatsService(
      usage, members, new MockBudgetRepo(), new MockUtilizationReadRepo(),
      new MockPlanRepo(), new MockToolUsageReadRepo(), fixedClock('2026-03-25T12:00:00Z'),
    );
  });

  it('getAll returns all dashboard fields', async () => {
    usage.memberUsage = [{ displayName: 'alice', totalCost: 10, totalTokens: 500 }];
    usage.sessionCount = 5;
    const result = await service.getAll(30);

    expect(result).toHaveProperty('daily');
    expect(result).toHaveProperty('members');
    expect(result).toHaveProperty('sessionCount', 5);
    expect(result).toHaveProperty('teamMembers');
    expect(result).toHaveProperty('weeklyRanking');
    expect(result).toHaveProperty('utilizationHistory');
  });

  it('getWeeklyRanking returns ranking and previous week', async () => {
    usage.memberUsage = [
      { displayName: 'alice', totalCost: 20, totalTokens: 1000 },
      { displayName: 'bob', totalCost: 10, totalTokens: 500 },
    ];
    const result = await service.getWeeklyRanking(0);
    expect(result.weeklyRanking).toHaveLength(2);
    expect(result).toHaveProperty('previousWeekTop');
  });

  it('getWeeklyRanking(0) calls getMemberUsage for current week, getMemberUsagePeriod for previous week', async () => {
    await service.getWeeklyRanking(0);

    // Current week (offset=0) uses getMemberUsage with week start
    expect(usage.memberUsageCalls).toHaveLength(1);
    expect(usage.memberUsageCalls[0]).toBe(WEEK_START_0);

    // Previous week (offset=-1) uses getMemberUsagePeriod with bounded window
    expect(usage.memberUsagePeriodCalls).toHaveLength(1);
    expect(usage.memberUsagePeriodCalls[0]).toEqual({
      startDate: WEEK_START_MINUS1,
      endDate: WEEK_START_0,
    });
  });

  it('getWeeklyRanking(-1) calls getMemberUsagePeriod for both current and previous', async () => {
    await service.getWeeklyRanking(-1);

    // No getMemberUsage calls — both offsets are non-zero, so both use getMemberUsagePeriod
    expect(usage.memberUsageCalls).toHaveLength(0);

    // Two getMemberUsagePeriod calls: offset=-1 and offset=-2
    expect(usage.memberUsagePeriodCalls).toHaveLength(2);

    const starts = usage.memberUsagePeriodCalls.map(c => c.startDate);
    const ends = usage.memberUsagePeriodCalls.map(c => c.endDate);

    // Each call should span exactly 7 days
    for (const call of usage.memberUsagePeriodCalls) {
      const diffMs = new Date(call.endDate).getTime() - new Date(call.startDate).getTime();
      expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
    }

    // The two calls should cover offset=-1 and offset=-2
    expect(starts).toContain(WEEK_START_MINUS1);
    expect(ends).toContain(WEEK_START_0);
    expect(starts).toContain(WEEK_START_MINUS2);
    expect(ends).toContain(WEEK_START_MINUS1);
  });

  it('getWeeklyRanking returns previousWeekTop sliced to 3', async () => {
    usage.memberUsage = [
      { displayName: 'a', totalCost: 50, totalTokens: 5000 },
      { displayName: 'b', totalCost: 40, totalTokens: 4000 },
      { displayName: 'c', totalCost: 30, totalTokens: 3000 },
      { displayName: 'd', totalCost: 20, totalTokens: 2000 },
      { displayName: 'e', totalCost: 10, totalTokens: 1000 },
    ];
    const result = await service.getWeeklyRanking(0);
    expect(result.previousWeekTop).toHaveLength(3);
  });

  it('getPreviousWeekTopMembers uses getMemberUsagePeriod (tested via getAll)', async () => {
    await service.getAll(30);

    // getAll calls getPreviousWeekTopMembers which calls getMemberUsagePeriod
    const periodCall = usage.memberUsagePeriodCalls.find(
      c => c.startDate === WEEK_START_MINUS1 && c.endDate === WEEK_START_0,
    );
    expect(periodCall).toBeDefined();
  });
});
