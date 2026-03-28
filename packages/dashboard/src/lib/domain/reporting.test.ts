import { describe, it, expect } from 'vitest';
import {
  aggregateByMember, aggregateByDate, aggregateByWeek,
  aggregateByModel, aggregateByProject, buildReportSummary,
  type RawUsageRecord,
} from './reporting';

const makeRecord = (overrides: Partial<RawUsageRecord> = {}): RawUsageRecord => ({
  costUsd: 1.5,
  sessionId: 'sess-1',
  recordedAt: '2026-03-18T10:00:00Z',
  memberId: 'member-1',
  memberName: 'Alice',
  memberDisplayName: 'Alice Kim',
  model: 'claude-sonnet-4-6',
  projectName: 'my-project',
  ...overrides,
});

describe('aggregateByMember', () => {
  it('groups by memberId and sums cost', () => {
    const records = [
      makeRecord({ costUsd: 10 }),
      makeRecord({ costUsd: 5, sessionId: 'sess-2' }),
    ];
    const result = aggregateByMember(records);
    expect(result).toHaveLength(1);
    expect(result[0].cost).toBe(15);
    expect(result[0].sessions).toBe(2);
    expect(result[0].displayName).toBe('Alice Kim');
  });

  it('counts active days by date portion of recordedAt', () => {
    const records = [
      makeRecord({ recordedAt: '2026-03-18T10:00:00Z' }),
      makeRecord({ recordedAt: '2026-03-18T14:00:00Z', sessionId: 'sess-2' }),
      makeRecord({ recordedAt: '2026-03-19T10:00:00Z', sessionId: 'sess-3' }),
    ];
    const result = aggregateByMember(records);
    expect(result[0].activeDays).toBe(2);
  });

  it('sorts by cost descending', () => {
    const records = [
      makeRecord({ memberId: 'a', memberName: 'Low', costUsd: 5 }),
      makeRecord({ memberId: 'b', memberName: 'High', costUsd: 20 }),
    ];
    const result = aggregateByMember(records);
    expect(result[0].name).toBe('High');
  });

  it('returns empty for empty input', () => {
    expect(aggregateByMember([])).toEqual([]);
  });
});

describe('aggregateByDate', () => {
  it('groups by date and counts unique sessions/members', () => {
    const records = [
      makeRecord({ recordedAt: '2026-03-18T10:00:00Z' }),
      makeRecord({ recordedAt: '2026-03-18T14:00:00Z', sessionId: 'sess-2', memberId: 'member-2' }),
      makeRecord({ recordedAt: '2026-03-19T10:00:00Z', sessionId: 'sess-3' }),
    ];
    const result = aggregateByDate(records);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-03-18');
    expect(result[0].sessions).toBe(2);
    expect(result[0].members).toBe(2);
    expect(result[1].date).toBe('2026-03-19');
  });

  it('sorts by date ascending', () => {
    const records = [
      makeRecord({ recordedAt: '2026-03-20T00:00:00Z' }),
      makeRecord({ recordedAt: '2026-03-18T00:00:00Z', sessionId: 'sess-2' }),
    ];
    const result = aggregateByDate(records);
    expect(result[0].date).toBe('2026-03-18');
  });
});

describe('aggregateByWeek', () => {
  it('groups records into Monday-based weeks', () => {
    const records = [
      makeRecord({ recordedAt: '2026-03-18T10:00:00Z' }), // Wed — week of 2026-03-16
      makeRecord({ recordedAt: '2026-03-23T10:00:00Z', sessionId: 'sess-2' }), // Mon — week of 2026-03-23
    ];
    const result = aggregateByWeek(records);
    expect(result).toHaveLength(2);
    expect(result[0].weekStart).toBe('2026-03-16');
    expect(result[1].weekStart).toBe('2026-03-23');
  });
});

describe('aggregateByModel', () => {
  it('groups by model and sorts by cost desc', () => {
    const records = [
      makeRecord({ model: 'claude-sonnet-4-6', costUsd: 5 }),
      makeRecord({ model: 'claude-opus-4-6', costUsd: 20, sessionId: 'sess-2' }),
      makeRecord({ model: 'claude-sonnet-4-6', costUsd: 3, sessionId: 'sess-3' }),
    ];
    const result = aggregateByModel(records);
    expect(result[0].model).toBe('claude-opus-4-6');
    expect(result[0].cost).toBe(20);
    expect(result[1].model).toBe('claude-sonnet-4-6');
    expect(result[1].cost).toBe(8);
  });
});

describe('aggregateByProject', () => {
  it('groups by project and respects limit', () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      makeRecord({ projectName: `project-${i}`, sessionId: `sess-${i}` }),
    );
    const result = aggregateByProject(records, 5);
    expect(result).toHaveLength(5);
  });

  it('defaults empty projectName to (unknown)', () => {
    const records = [makeRecord({ projectName: '' })];
    const result = aggregateByProject(records);
    expect(result[0].project).toBe('(unknown)');
  });
});

describe('buildReportSummary', () => {
  it('calculates totals from member and daily data', () => {
    const members = [
      { memberId: 'a', displayName: 'A', name: 'A', cost: 10.123, sessions: 2, activeDays: 1 },
      { memberId: 'b', displayName: 'B', name: 'B', cost: 5.456, sessions: 1, activeDays: 1 },
    ];
    const daily = [
      { date: '2026-03-18', cost: 8, sessions: 2, members: 2 },
      { date: '2026-03-19', cost: 7.58, sessions: 1, members: 1 },
    ];
    const records = [
      makeRecord({ sessionId: 'a' }),
      makeRecord({ sessionId: 'b' }),
      makeRecord({ sessionId: 'a' }), // duplicate session
    ];
    const result = buildReportSummary(members, daily, records);
    expect(result.totalCost).toBe(15.58);
    expect(result.totalSessions).toBe(2);
    expect(result.totalMembers).toBe(2);
    expect(result.periodStart).toBe('2026-03-18');
    expect(result.periodEnd).toBe('2026-03-19');
  });

  it('handles empty inputs', () => {
    const result = buildReportSummary([], [], []);
    expect(result.totalCost).toBe(0);
    expect(result.totalSessions).toBe(0);
    expect(result.periodStart).toBe('');
  });
});
