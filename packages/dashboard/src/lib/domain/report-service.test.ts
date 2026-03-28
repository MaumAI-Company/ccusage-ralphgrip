import { describe, it, expect, beforeEach } from 'vitest';
import { ReportService } from './report-service';
import { MockReportRepo, fixedClock } from '@/lib/test-utils/mock-repos';

describe('ReportService', () => {
  let repo: MockReportRepo;
  let service: ReportService;

  beforeEach(() => {
    repo = new MockReportRepo();
    service = new ReportService(repo, fixedClock());
  });

  it('generates report by calling concurrent repo methods', async () => {
    repo.members = [
      { memberId: 'm1', displayName: 'Alice', name: 'alice', cost: 1.5, sessions: 1, activeDays: 1 },
      { memberId: 'm2', displayName: 'Bob', name: 'bob', cost: 2.0, sessions: 1, activeDays: 1 },
    ];
    repo.daily = [{ date: '2026-03-24', cost: 3.5, sessions: 2, members: 2 }];
    repo.weekly = [{ weekStart: '2026-03-24', cost: 3.5, sessions: 2, members: 2 }];
    repo.models = [
      { model: 'claude-sonnet-4-6', cost: 1.5, sessions: 1 },
      { model: 'claude-opus-4-6', cost: 2.0, sessions: 1 },
    ];
    repo.projects = [{ project: 'proj-a', cost: 3.5, sessions: 2, members: 2 }];
    repo.summary = { totalCost: 3.5, totalSessions: 2, totalMembers: 2, periodStart: '2026-03-24', periodEnd: '2026-03-24' };
    repo.plans = [];

    const result = await service.generateReport(30);
    expect(result.summary.totalCost).toBe(3.5);
    expect(result.summary.totalSessions).toBe(2);
    expect(result.members).toHaveLength(2);
    expect(result.models).toHaveLength(2);
    expect(result.daily).toHaveLength(1);
    expect(result.weekly).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
  });

  it('handles empty data from all repo methods', async () => {
    const result = await service.generateReport(7);
    expect(result.summary.totalCost).toBe(0);
    expect(result.members).toHaveLength(0);
    expect(result.daily).toHaveLength(0);
    expect(result.weekly).toHaveLength(0);
    expect(result.models).toHaveLength(0);
    expect(result.projects).toHaveLength(0);
  });
});
