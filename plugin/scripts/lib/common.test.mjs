import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCodexSessionContent } from './common.mjs';

test('parseCodexSessionContent reads Codex last_token_usage events', () => {
  const content = [
    JSON.stringify({
      timestamp: '2026-03-16T10:19:10.386Z',
      type: 'session_meta',
      payload: { cwd: '/Users/test/project-alpha' },
    }),
    JSON.stringify({
      timestamp: '2026-03-16T10:19:10.500Z',
      type: 'turn_context',
      payload: {
        turn_id: 'turn-1',
        cwd: '/Users/test/project-alpha',
        model: 'gpt-5.4',
      },
    }),
    JSON.stringify({
      timestamp: '2026-03-16T10:19:11.000Z',
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: {
            input_tokens: 120,
            cached_input_tokens: 30,
            output_tokens: 40,
            reasoning_output_tokens: 10,
          },
        },
      },
    }),
  ].join('\n');

  const parsed = parseCodexSessionContent(content);

  assert.equal(parsed.projectName, 'projects');
  assert.equal(parsed.lastTurnId, 'turn-1');
  assert.equal(parsed.entries.length, 1);
  // input: 120 total - 30 cached = 90 non-cached
  // output: 40 (reasoning 10 is already included, not additive)
  assert.deepEqual(parsed.entries[0], {
    model: 'gpt-5.4',
    usage: {
      input_tokens: 90,
      output_tokens: 40,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 30,
    },
    timestamp: '2026-03-16T10:19:11.000Z',
    turnId: 'turn-1',
  });
});

test('parseCodexSessionContent falls back to total_token_usage deltas', () => {
  const content = [
    JSON.stringify({
      timestamp: '2026-03-16T10:19:10.500Z',
      type: 'turn_context',
      payload: {
        turn_id: 'turn-1',
        cwd: '/Users/test/project-beta',
        model: 'gpt-5.3-codex',
      },
    }),
    JSON.stringify({
      timestamp: '2026-03-16T10:19:11.000Z',
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: {
          total_token_usage: {
            input_tokens: 100,
            cached_input_tokens: 20,
            output_tokens: 15,
            reasoning_output_tokens: 5,
          },
        },
      },
    }),
    JSON.stringify({
      timestamp: '2026-03-16T10:19:12.000Z',
      type: 'turn_context',
      payload: {
        turn_id: 'turn-2',
        cwd: '/Users/test/project-beta',
        model: 'gpt-5.3-codex',
      },
    }),
    JSON.stringify({
      timestamp: '2026-03-16T10:19:13.000Z',
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: {
          total_token_usage: {
            input_tokens: 160,
            cached_input_tokens: 35,
            output_tokens: 25,
            reasoning_output_tokens: 10,
          },
        },
      },
    }),
  ].join('\n');

  const parsed = parseCodexSessionContent(content);

  assert.equal(parsed.entries.length, 2);
  // Turn 1: input 100-20=80 non-cached, output 15 (reasoning already included)
  assert.deepEqual(parsed.entries[0].usage, {
    input_tokens: 80,
    output_tokens: 15,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 20,
  });
  // Turn 2: input (160-35)-(100-20)=45 non-cached, output 25-15=10, cache 35-20=15
  assert.deepEqual(parsed.entries[1].usage, {
    input_tokens: 45,
    output_tokens: 10,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 15,
  });
  assert.equal(parsed.lastTurnId, 'turn-2');
  assert.equal(parsed.projectName, 'projects');
});

test('parseCodexSessionContent ignores duplicate token_count events for the same turn', () => {
  const duplicateEvent = {
    timestamp: '2026-03-16T10:19:11.000Z',
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: {
        last_token_usage: {
          input_tokens: 300,
          cached_input_tokens: 120,
          output_tokens: 25,
          reasoning_output_tokens: 5,
        },
      },
    },
  };

  const content = [
    JSON.stringify({
      timestamp: '2026-03-16T10:19:10.500Z',
      type: 'turn_context',
      payload: {
        turn_id: 'turn-1',
        cwd: '/Users/test/project-gamma',
        model: 'gpt-5.4',
      },
    }),
    JSON.stringify(duplicateEvent),
    JSON.stringify({
      ...duplicateEvent,
      timestamp: '2026-03-16T10:19:11.050Z',
    }),
  ].join('\n');

  const parsed = parseCodexSessionContent(content);

  assert.equal(parsed.entries.length, 1);
  // input_tokens: 300 total - 120 cached = 180 non-cached
  // output_tokens: 25 (reasoning_output_tokens is already included, not additive)
  assert.deepEqual(parsed.entries[0].usage, {
    input_tokens: 180,
    output_tokens: 25,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 120,
  });
});
