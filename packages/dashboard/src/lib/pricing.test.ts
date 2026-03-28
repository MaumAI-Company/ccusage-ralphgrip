import { describe, it, expect } from 'vitest';
import { estimateCost, resolveModelKey } from './pricing';

describe('resolveModelKey', () => {
  it('returns exact match for known model', () => {
    expect(resolveModelKey('claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
  });

  it('resolves date-suffixed Claude model via prefix match', () => {
    expect(resolveModelKey('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5');
  });

  it('falls back to gpt-5 for unknown gpt models', () => {
    expect(resolveModelKey('gpt-99-turbo')).toBe('gpt-5');
  });

  it('falls back to claude-sonnet-4-6 for completely unknown models', () => {
    expect(resolveModelKey('unknown-model-xyz')).toBe('claude-sonnet-4-6');
  });

  it('picks longest prefix match', () => {
    // gpt-5-mini should match gpt-5-mini, not gpt-5
    expect(resolveModelKey('gpt-5-mini')).toBe('gpt-5-mini');
  });
});

describe('estimateCost', () => {
  it('calculates cost for claude-sonnet-4-6 input only', () => {
    // $3/1M input tokens
    const cost = estimateCost('claude-sonnet-4-6', 1_000_000, 0);
    expect(cost).toBe(3);
  });

  it('calculates cost for output tokens', () => {
    // $15/1M output tokens
    const cost = estimateCost('claude-sonnet-4-6', 0, 1_000_000);
    expect(cost).toBe(15);
  });

  it('combines input + output + cache', () => {
    // 100K input ($0.30) + 50K output ($0.75) + 10K cache write ($0.0375) + 20K cache read ($0.006)
    const cost = estimateCost('claude-sonnet-4-6', 100_000, 50_000, 10_000, 20_000);
    expect(cost).toBeCloseTo(1.0935, 4);
  });

  it('returns 0 for zero tokens', () => {
    expect(estimateCost('claude-sonnet-4-6', 0, 0, 0, 0)).toBe(0);
  });

  it('uses fallback pricing for unknown models', () => {
    // Falls back to claude-sonnet-4-6 pricing
    const known = estimateCost('claude-sonnet-4-6', 1000, 500);
    const unknown = estimateCost('totally-unknown-model', 1000, 500);
    expect(unknown).toBe(known);
  });

  it('handles cache tokens with claude-opus-4-6', () => {
    // cache write: $6.25/1M, cache read: $0.50/1M
    const cost = estimateCost('claude-opus-4-6', 0, 0, 1_000_000, 1_000_000);
    expect(cost).toBe(6.75);
  });
});
