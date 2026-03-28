import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aggregateByModel, parseJsonlFile, parseGeminiConversationFile } from './transcripts.mjs';

function makeJsonl(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'ccw-transcripts-'));
  const file = join(dir, 'session.jsonl');
  writeFileSync(file, `${lines.join('\n')}\n`, 'utf-8');
  return file;
}

function makeJsonFile(name, payload) {
  const dir = mkdtempSync(join(tmpdir(), 'ccw-transcripts-'));
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(payload, null, 2), 'utf-8');
  return file;
}

test('parseJsonlFile ignores malformed and synthetic entries', () => {
  const file = makeJsonl([
    JSON.stringify({ timestamp: '2026-03-18T00:00:00.000Z', message: { model: 'claude-sonnet-4-6', usage: { input_tokens: 10, output_tokens: 5 } } }),
    '{not json',
    JSON.stringify({ timestamp: '2026-03-18T00:01:00.000Z', message: { model: '<synthetic>', usage: { input_tokens: 99, output_tokens: 99 } } }),
    JSON.stringify({ timestamp: '2026-03-18T00:02:00.000Z', message: { model: '', usage: { input_tokens: 99, output_tokens: 99 } } }),
  ]);

  assert.deepEqual(parseJsonlFile(file), [
    {
      model: 'claude-sonnet-4-6',
      usage: { input_tokens: 10, output_tokens: 5 },
      timestamp: '2026-03-18T00:00:00.000Z',
    },
  ]);
});

test('parseGeminiConversationFile converts prompt/cache/thought tokens into billed usage', () => {
  const file = makeJsonFile('session-2026-03-24T00-00-1234abcd.json', {
    sessionId: 'gem-session-123',
    messages: [
      {
        id: 'm1',
        type: 'user',
        timestamp: '2026-03-24T00:00:00.000Z',
        content: [],
      },
      {
        id: 'm2',
        type: 'gemini',
        model: 'gemini-3.1-pro-preview',
        timestamp: '2026-03-24T00:00:05.000Z',
        content: [],
        tokens: {
          input: 1200,
          output: 200,
          cached: 300,
          thoughts: 50,
          tool: 25,
          total: 1450,
        },
      },
    ],
  });

  assert.deepEqual(parseGeminiConversationFile(file), {
    sessionId: 'gem-session-123',
    entries: [
      {
        model: 'gemini-3.1-pro-preview',
        usage: {
          input_tokens: 900,
          output_tokens: 250,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 300,
        },
        timestamp: '2026-03-24T00:00:05.000Z',
      },
    ],
    lastRecordedAt: '2026-03-24T00:00:05.000Z',
  });
});

test('aggregateByModel sums tokens and keeps latest timestamp', () => {
  const records = aggregateByModel([
    {
      model: 'claude-sonnet-4-6',
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: 20,
        cache_read_input_tokens: 30,
      },
      timestamp: '2026-03-18T00:00:00.000Z',
    },
    {
      model: 'claude-sonnet-4-6',
      usage: {
        input_tokens: 1,
        output_tokens: 2,
        cache_creation_input_tokens: 3,
        cache_read_input_tokens: 4,
      },
      timestamp: '2026-03-18T01:00:00.000Z',
    },
  ]);

  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    model: 'claude-sonnet-4-6',
    inputTokens: 11,
    outputTokens: 7,
    cacheCreationTokens: 23,
    cacheReadTokens: 34,
    costUsd: 0.00023444999999999998,
    projectName: '',
    recordedAt: '2026-03-18T01:00:00.000Z',
  });
});
