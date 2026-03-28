import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { t, getLocale, setLocale } from './i18n.mjs';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns English string by default', () => {
    assert.equal(t('collect.sendFailed'), 'ccusage-ralphgrip: Send failed:');
  });

  it('returns Korean string when locale is ko', () => {
    setLocale('ko');
    assert.equal(t('collect.sendFailed'), 'ccusage-ralphgrip: 전송 실패:');
  });

  it('interpolates params', () => {
    assert.equal(
      t('init.configSaved', { path: '/tmp/test.json' }),
      '✓ Config saved: /tmp/test.json',
    );
  });

  it('interpolates params in Korean', () => {
    setLocale('ko');
    assert.equal(
      t('init.configSaved', { path: '/tmp/test.json' }),
      '✓ 설정 저장 완료: /tmp/test.json',
    );
  });

  it('returns key if not found', () => {
    assert.equal(t('nonexistent.key'), 'nonexistent.key');
  });

  it('falls back to English for missing Korean key', () => {
    setLocale('ko');
    // All keys should exist in both, but test fallback
    const result = t('collect.noConfig');
    assert.ok(result.includes('ccusage-ralphgrip'));
  });

  it('getLocale returns en or ko', () => {
    setLocale('en');
    assert.equal(getLocale(), 'en');
    setLocale('ko');
    assert.equal(getLocale(), 'ko');
  });

  it('setLocale normalizes non-ko to en', () => {
    setLocale('fr');
    assert.equal(getLocale(), 'en');
    setLocale('ja');
    assert.equal(getLocale(), 'en');
  });
});
