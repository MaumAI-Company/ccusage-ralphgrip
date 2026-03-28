import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeModelId, resolveModelKey, estimateCost } from './pricing.mjs';

test('normalizeModelId strips provider prefixes', () => {
  assert.equal(normalizeModelId('openai/gpt-5.3-codex'), 'gpt-5.3-codex');
  assert.equal(normalizeModelId('models/gemini-2.5-flash'), 'gemini-2.5-flash');
});

test('resolveModelKey returns exact match for known model', () => {
  assert.equal(resolveModelKey('gpt-5.4'), 'gpt-5.4');
});

test('resolveModelKey normalizes Claude dot variants', () => {
  assert.equal(resolveModelKey('claude-opus-4.5'), 'claude-opus-4-5');
});

test('resolveModelKey maps antigravity Gemini variants to official Gemini pricing', () => {
  assert.equal(resolveModelKey('antigravity-gemini-3-flash'), 'gemini-3-flash-preview');
  assert.equal(resolveModelKey('antigravity-gemini-3-pro-high'), 'gemini-3-pro-preview');
});

test('resolveModelKey falls back to gpt-5 for unknown gpt- model', () => {
  assert.equal(resolveModelKey('gpt-99'), 'gpt-5');
});

test('resolveModelKey falls back to claude-sonnet-4-6 for completely unknown model', () => {
  assert.equal(resolveModelKey('completely-unknown-model'), 'claude-sonnet-4-6');
});

test('estimateCost returns expected value for GPT model', () => {
  const cost = estimateCost('gpt-5.4', 1000, 500, 0, 0);
  assert.equal(cost, 0.01);
});

test('estimateCost returns expected value for Gemini model alias', () => {
  const cost = estimateCost('antigravity-gemini-3-flash', 1000, 500, 0, 100);
  assert.equal(cost, 0.002005);
});

test('estimateCost returns expected value for Claude model', () => {
  const cost = estimateCost('claude-sonnet-4-6', 1000, 500, 0, 0);
  assert.equal(cost, 0.0105);
});
