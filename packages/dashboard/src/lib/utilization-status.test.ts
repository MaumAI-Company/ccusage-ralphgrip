import { describe, it, expect } from 'vitest';
import {
  FIVE_HOURS_MS,
  SEVEN_DAYS_MS,
  formatRelativeAge,
  formatResetEta,
  getPaceStatus,
} from './utilization-status';

const NOW_MS = Date.parse('2026-03-19T12:00:00.000Z');

describe('utilization-status', () => {
  it('formatRelativeAge returns compact freshness text', () => {
    expect(formatRelativeAge('2026-03-19T11:48:00.000Z', NOW_MS)).toBe('12m ago');
  });

  it('formatResetEta returns compact reset text', () => {
    expect(formatResetEta('2026-03-19T14:30:00.000Z', NOW_MS)).toBe('Resets in 2h 30m');
  });

  it('getPaceStatus returns ahead when projected usage is comfortably below limit', () => {
    const resetAt = new Date(NOW_MS + FIVE_HOURS_MS / 2).toISOString();
    expect(getPaceStatus({ usedPercent: 15, resetAt, nowMs: NOW_MS, durationMs: FIVE_HOURS_MS })).toBe('ahead');
  });

  it('getPaceStatus returns on-track when projected usage stays within limit', () => {
    const resetAt = new Date(NOW_MS + SEVEN_DAYS_MS / 2).toISOString();
    expect(getPaceStatus({ usedPercent: 45, resetAt, nowMs: NOW_MS, durationMs: SEVEN_DAYS_MS })).toBe('on-track');
  });

  it('getPaceStatus returns behind when projected usage exceeds limit', () => {
    const resetAt = new Date(NOW_MS + FIVE_HOURS_MS / 2).toISOString();
    expect(getPaceStatus({ usedPercent: 65, resetAt, nowMs: NOW_MS, durationMs: FIVE_HOURS_MS })).toBe('behind');
  });

  it('getPaceStatus returns null when reset timestamp is missing', () => {
    expect(getPaceStatus({ usedPercent: 65, resetAt: null, nowMs: NOW_MS, durationMs: FIVE_HOURS_MS })).toBeNull();
  });
});
