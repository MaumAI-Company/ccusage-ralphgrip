import { describe, it, expect } from 'vitest';
import { sanitizeName, memberName } from './common';

describe('sanitizeName', () => {
  it('passes through plain Latin names', () => {
    expect(sanitizeName('John Doe')).toBe('John Doe');
  });

  it('passes through Korean names', () => {
    expect(sanitizeName('김민수')).toBe('김민수');
  });

  it('passes through mixed Latin-Korean names', () => {
    expect(sanitizeName('Ben 김민수')).toBe('Ben 김민수');
  });

  it('allows hyphens, periods, and apostrophes', () => {
    expect(sanitizeName("Jean-Pierre O'Brien Jr.")).toBe("Jean-Pierre O'Brien Jr.");
  });

  it('allows digits', () => {
    expect(sanitizeName('user42')).toBe('user42');
  });

  it('strips HTML tags', () => {
    expect(sanitizeName('<script>alert("xss")</script>')).toBe('scriptalertxssscript');
  });

  it('strips emoji and special characters', () => {
    expect(sanitizeName('John 🚀 Doe!@#$%')).toBe('John Doe');
  });

  it('collapses multiple spaces to one', () => {
    expect(sanitizeName('John    Doe')).toBe('John Doe');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeName('  John Doe  ')).toBe('John Doe');
  });

  it('handles combined issues: special chars + multiple spaces', () => {
    expect(sanitizeName('  John!!   Doe@@  ')).toBe('John Doe');
  });

  it('returns empty string for all-invalid input', () => {
    expect(sanitizeName('!@#$%^&*()')).toBe('');
  });
});

describe('memberName schema', () => {
  it('accepts valid Latin name', () => {
    expect(memberName.parse('John Doe')).toBe('John Doe');
  });

  it('accepts valid Korean name', () => {
    expect(memberName.parse('홍길동')).toBe('홍길동');
  });

  it('sanitizes and accepts name with extra spaces', () => {
    expect(memberName.parse('  John   Doe  ')).toBe('John Doe');
  });

  it('strips invalid characters before validation', () => {
    expect(memberName.parse('John<script>Doe')).toBe('JohnscriptDoe');
  });

  it('rejects empty string', () => {
    expect(() => memberName.parse('')).toThrow();
  });

  it('rejects string that becomes empty after sanitization', () => {
    expect(() => memberName.parse('!@#$%')).toThrow();
  });

  it('rejects name exceeding 80 characters', () => {
    const longName = 'A'.repeat(81);
    expect(() => memberName.parse(longName)).toThrow();
  });

  it('accepts name at exactly 80 characters', () => {
    const name80 = 'A'.repeat(80);
    expect(memberName.parse(name80)).toBe(name80);
  });
});
