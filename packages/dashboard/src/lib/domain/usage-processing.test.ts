import { describe, it, expect } from 'vitest';
import { processUsageRecords, validateUtilizationTimestamps } from './usage-processing';

describe('processUsageRecords', () => {
  it('filters out synthetic models', () => {
    const records = [
      { model: '<synthetic>', inputTokens: 100, outputTokens: 50, recordedAt: '2026-03-01T00:00:00Z' },
      { model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50, recordedAt: '2026-03-01T00:00:00Z' },
    ];
    const result = processUsageRecords(records);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('claude-sonnet-4-6');
  });

  it('recalculates cost server-side (ignores client cost)', () => {
    const records = [
      { model: 'claude-sonnet-4-6', inputTokens: 1_000_000, outputTokens: 0, recordedAt: '2026-03-01T00:00:00Z' },
    ];
    const result = processUsageRecords(records);
    // claude-sonnet-4-6 input: $3/1M tokens
    expect(result[0].costUsd).toBe(3);
  });

  it('normalizes missing cache tokens to 0', () => {
    const records = [
      { model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50, recordedAt: '2026-03-01T00:00:00Z' },
    ];
    const result = processUsageRecords(records);
    expect(result[0].cacheCreationTokens).toBe(0);
    expect(result[0].cacheReadTokens).toBe(0);
  });

  it('preserves valid cache tokens', () => {
    const records = [
      { model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50, cacheCreationTokens: 200, cacheReadTokens: 300, recordedAt: '2026-03-01T00:00:00Z' },
    ];
    const result = processUsageRecords(records);
    expect(result[0].cacheCreationTokens).toBe(200);
    expect(result[0].cacheReadTokens).toBe(300);
  });

  it('truncates projectName to 256 chars', () => {
    const records = [
      { model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50, projectName: 'x'.repeat(500), recordedAt: '2026-03-01T00:00:00Z' },
    ];
    const result = processUsageRecords(records);
    expect(result[0].projectName).toHaveLength(256);
  });

  it('defaults missing projectName to empty', () => {
    const records = [
      { model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50, recordedAt: '2026-03-01T00:00:00Z' },
    ];
    const result = processUsageRecords(records);
    expect(result[0].projectName).toBe('');
  });

  it('returns empty array for all-synthetic input', () => {
    const records = [
      { model: '<synthetic>', inputTokens: 100, outputTokens: 50, recordedAt: '2026-03-01T00:00:00Z' },
    ];
    expect(processUsageRecords(records)).toEqual([]);
  });
});

describe('validateUtilizationTimestamps', () => {
  it('returns null when no utilization provided', () => {
    expect(validateUtilizationTimestamps(undefined, undefined)).toBeNull();
  });

  it('returns null when timestamps are valid', () => {
    const parsed = { fiveHourResetsAt: '2026-03-01T05:00:00Z', sevenDayResetsAt: null };
    const raw = { fiveHourResetsAt: '2026-03-01T05:00:00Z' };
    expect(validateUtilizationTimestamps(parsed, raw)).toBeNull();
  });

  it('returns error when raw had value but parsed is null (invalid date)', () => {
    const parsed = { fiveHourResetsAt: null, sevenDayResetsAt: null };
    const raw = { fiveHourResetsAt: 'not-a-date' };
    expect(validateUtilizationTimestamps(parsed, raw)).toBe('Invalid utilization reset timestamp');
  });

  it('allows empty/null/undefined raw values', () => {
    const parsed = { fiveHourResetsAt: null, sevenDayResetsAt: null };
    expect(validateUtilizationTimestamps(parsed, { fiveHourResetsAt: '' })).toBeNull();
    expect(validateUtilizationTimestamps(parsed, { fiveHourResetsAt: null })).toBeNull();
    expect(validateUtilizationTimestamps(parsed, {})).toBeNull();
  });
});
