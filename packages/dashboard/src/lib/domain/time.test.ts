import { describe, it, expect } from 'vitest';
import { getWeekStart, getWeekStartByOffset, getMonthStart, sinceDate, getKSTMondayForDate } from './time';

describe('getWeekStart', () => {
  it('returns Monday 00:00 KST for a Wednesday KST', () => {
    // Wed 2026-03-18 14:00 KST = Wed 2026-03-18 05:00 UTC
    const wed = new Date('2026-03-18T05:00:00Z');
    const result = getWeekStart(wed);
    // Monday 2026-03-16 00:00 KST = Sunday 2026-03-15 15:00 UTC
    expect(result.toISOString()).toBe('2026-03-15T15:00:00.000Z');
  });

  it('returns same Monday for a Monday in KST', () => {
    // Mon 2026-03-16 09:00 KST = Mon 2026-03-16 00:00 UTC
    const mon = new Date('2026-03-16T00:00:00Z');
    const result = getWeekStart(mon);
    expect(result.toISOString()).toBe('2026-03-15T15:00:00.000Z');
  });

  it('handles Sunday (last day of KST week)', () => {
    // Sun 2026-03-22 10:00 KST = Sun 2026-03-22 01:00 UTC
    const sun = new Date('2026-03-22T01:00:00Z');
    const result = getWeekStart(sun);
    // Monday of that week: 2026-03-16 00:00 KST = 2026-03-15 15:00 UTC
    expect(result.toISOString()).toBe('2026-03-15T15:00:00.000Z');
  });

  it('handles KST date boundary (UTC still previous day)', () => {
    // Mon 2026-03-23 01:00 KST = Sun 2026-03-22 16:00 UTC
    // In KST this is Monday, so week start should be that Monday
    const kstMonday = new Date('2026-03-22T16:00:00Z');
    const result = getWeekStart(kstMonday);
    // 2026-03-23 00:00 KST = 2026-03-22 15:00 UTC
    expect(result.toISOString()).toBe('2026-03-22T15:00:00.000Z');
  });
});

describe('getWeekStartByOffset', () => {
  const now = new Date('2026-03-18T05:00:00Z'); // Wed

  it('offset 0 returns current week start', () => {
    expect(getWeekStartByOffset(0, now)).toEqual(getWeekStart(now));
  });

  it('offset -1 returns previous week', () => {
    const prev = getWeekStartByOffset(-1, now);
    const curr = getWeekStart(now);
    expect(curr.getTime() - prev.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('offset 1 returns next week', () => {
    const next = getWeekStartByOffset(1, now);
    const curr = getWeekStart(now);
    expect(next.getTime() - curr.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('getMonthStart', () => {
  it('returns 1st of month 00:00 KST', () => {
    const mid = new Date('2026-03-15T10:00:00Z');
    const result = getMonthStart(mid);
    // 2026-03-01 00:00 KST = 2026-02-28 15:00 UTC
    expect(result.toISOString()).toBe('2026-02-28T15:00:00.000Z');
  });

  it('handles first day of month', () => {
    // 2026-03-01 05:00 KST = 2026-02-28 20:00 UTC
    const first = new Date('2026-02-28T20:00:00Z');
    const result = getMonthStart(first);
    expect(result.toISOString()).toBe('2026-02-28T15:00:00.000Z');
  });
});

describe('sinceDate', () => {
  it('returns ISO string for N days ago', () => {
    const now = new Date('2026-03-20T12:00:00.000Z');
    const result = sinceDate(7, now);
    expect(result).toBe('2026-03-13T12:00:00.000Z');
  });
});

describe('getKSTMondayForDate', () => {
  it('returns Monday date string for a Wednesday KST', () => {
    // Wed 2026-03-18 21:00 KST = Wed 2026-03-18 12:00 UTC
    expect(getKSTMondayForDate(new Date('2026-03-18T12:00:00Z'))).toBe('2026-03-16');
  });

  it('returns same date for a Monday KST', () => {
    // Mon 2026-03-16 09:00 KST = Mon 2026-03-16 00:00 UTC
    expect(getKSTMondayForDate(new Date('2026-03-16T00:00:00Z'))).toBe('2026-03-16');
  });

  it('returns previous Monday for a Sunday KST', () => {
    // Sun 2026-03-22 09:00 KST = Sun 2026-03-22 00:00 UTC
    expect(getKSTMondayForDate(new Date('2026-03-22T00:00:00Z'))).toBe('2026-03-16');
  });

  it('handles KST Monday that is UTC Sunday', () => {
    // Mon 2026-03-23 01:00 KST = Sun 2026-03-22 16:00 UTC
    // In KST this is Monday, so should return 2026-03-23
    expect(getKSTMondayForDate(new Date('2026-03-22T16:00:00Z'))).toBe('2026-03-23');
  });
});
