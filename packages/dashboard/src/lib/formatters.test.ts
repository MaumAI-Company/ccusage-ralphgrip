import { describe, it, expect } from 'vitest';
import { formatProjectName, shortModelName, formatDate, formatTokens } from './formatters';

describe('formatProjectName', () => {
  it('extracts last segment from macOS path', () => {
    expect(formatProjectName('-Users-hletrd-git-G2')).toBe('G2');
  });

  it('extracts last segment from nested path', () => {
    expect(formatProjectName('-Users-hletrd-flash-shared-judgekit')).toBe('judgekit');
  });

  it('extracts last segment from Linux path', () => {
    expect(formatProjectName('-home-khemoo-pt-unreal')).toBe('unreal');
  });

  it('extracts last segment from mount path', () => {
    expect(formatProjectName('-mnt-harbor-users-claude-GitHub-harness')).toBe('harness');
  });

  it('returns plain string without hyphen prefix unchanged', () => {
    expect(formatProjectName('projects')).toBe('projects');
    expect(formatProjectName('codex')).toBe('codex');
  });

  it('returns empty string for empty input', () => {
    expect(formatProjectName('')).toBe('');
  });

  it('returns raw value when cleaned result would be empty', () => {
    expect(formatProjectName('-')).toBe('-');
  });

  it('handles single-segment path', () => {
    expect(formatProjectName('-myproject')).toBe('myproject');
  });
});

describe('shortModelName', () => {
  it('strips claude- prefix and date suffix', () => {
    expect(shortModelName('claude-sonnet-4-5-20251022')).toBe('sonnet-4-5');
  });

  it('strips claude- prefix only', () => {
    expect(shortModelName('claude-haiku-3')).toBe('haiku-3');
  });

  it('strips anthropic/ vendor prefix and claude- prefix', () => {
    expect(shortModelName('anthropic/claude-opus-4')).toBe('opus-4');
  });

  it('strips antigravity- prefix', () => {
    expect(shortModelName('antigravity-claude-sonnet-4-5')).toBe('sonnet-4-5');
  });

  it('strips models/ prefix', () => {
    expect(shortModelName('models/claude-opus-4-20250514')).toBe('opus-4');
  });

  it('replaces -latest suffix', () => {
    expect(shortModelName('claude-sonnet-4-latest')).toBe('sonnet-4');
  });

  it('replaces -preview suffix', () => {
    expect(shortModelName('claude-opus-4-preview')).toBe('opus-4 preview');
  });

  it('strips openai. vendor prefix', () => {
    expect(shortModelName('openai.gpt-4o')).toBe('gpt-4o');
  });
});

describe('formatDate', () => {
  it('formats a date string as M/D', () => {
    expect(formatDate('2026-03-25')).toBe('3/25');
  });

  it('formats a date string in January', () => {
    expect(formatDate('2026-01-01')).toBe('1/1');
  });

  it('formats a date string in December', () => {
    expect(formatDate('2026-12-31')).toBe('12/31');
  });
});

describe('formatTokens', () => {
  it('formats millions with one decimal', () => {
    expect(formatTokens(1_500_000)).toBe('1.5M');
  });

  it('formats exactly 1M', () => {
    expect(formatTokens(1_000_000)).toBe('1.0M');
  });

  it('formats thousands with one decimal', () => {
    expect(formatTokens(2_500)).toBe('2.5K');
  });

  it('formats exactly 1K', () => {
    expect(formatTokens(1_000)).toBe('1.0K');
  });

  it('formats small numbers as plain integer string', () => {
    expect(formatTokens(999)).toBe('999');
  });

  it('formats zero', () => {
    expect(formatTokens(0)).toBe('0');
  });
});
