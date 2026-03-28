import test from 'node:test';
import assert from 'node:assert/strict';

import { extractTopLevelNotifyCommand, updateTopLevelNotifyCommand } from './codex-config.mjs';

test('extractTopLevelNotifyCommand reads top-level notify arrays', () => {
  const config = [
    '# comment',
    'notify = ["node", "/tmp/original.mjs"]',
    'model = "gpt-5.4"',
    '',
    '[projects."/tmp"]',
    'trust_level = "trusted"',
  ].join('\n');

  const result = extractTopLevelNotifyCommand(config);

  assert.deepEqual(result.value, ['node', '/tmp/original.mjs']);
  assert.equal(result.startLine, 1);
  assert.equal(result.endLine, 1);
});

test('updateTopLevelNotifyCommand replaces existing notify arrays', () => {
  const config = [
    '# comment',
    'notify = ["node", "/tmp/original.mjs"]',
    'model = "gpt-5.4"',
    '',
    '[projects."/tmp"]',
    'trust_level = "trusted"',
  ].join('\n');

  const updated = updateTopLevelNotifyCommand(config, ['node', '/tmp/ccusage-worv.mjs']);

  assert.match(updated, /^# comment\nnotify = \["node", "\/tmp\/ccusage-worv\.mjs"\]\nmodel = "gpt-5\.4"/);
  assert.doesNotMatch(updated, /original\.mjs/);
});

test('updateTopLevelNotifyCommand inserts notify before the first table when missing', () => {
  const config = [
    '# comment',
    'model = "gpt-5.4"',
    '',
    '[projects."/tmp"]',
    'trust_level = "trusted"',
  ].join('\n');

  const updated = updateTopLevelNotifyCommand(config, ['node', '/tmp/ccusage-worv.mjs']);

  assert.match(updated, /^# comment\nmodel = "gpt-5\.4"\n\nnotify = \["node", "\/tmp\/ccusage-worv\.mjs"\]\n\[projects\."\/tmp"\]/);
});
