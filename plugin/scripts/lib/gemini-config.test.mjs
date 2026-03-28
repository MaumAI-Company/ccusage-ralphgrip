import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GEMINI_CCUSAGE_HOOK_NAME,
  createGeminiSessionEndHook,
  hasGeminiSessionEndHook,
  updateGeminiSettings,
} from './gemini-config.mjs';

const COMMAND = 'node "/tmp/ccusage-worv/collect.mjs"';

test('createGeminiSessionEndHook builds a managed SessionEnd command hook', () => {
  assert.deepEqual(createGeminiSessionEndHook(COMMAND), {
    hooks: [{
      name: GEMINI_CCUSAGE_HOOK_NAME,
      description: 'Sync Gemini CLI usage to ccusage-worv after each session.',
      type: 'command',
      command: COMMAND,
      timeout: 15000,
    }],
  });
});

test('updateGeminiSettings appends the managed SessionEnd hook when missing', () => {
  const updated = updateGeminiSettings({}, COMMAND);

  assert.equal(updated.hooksConfig.enabled, true);
  assert.equal(updated.hooks.SessionEnd.length, 1);
  assert.equal(updated.hooks.SessionEnd[0].hooks[0].name, GEMINI_CCUSAGE_HOOK_NAME);
  assert.equal(updated.hooks.SessionEnd[0].hooks[0].command, COMMAND);
  assert.equal(hasGeminiSessionEndHook(updated, COMMAND), true);
});

test('updateGeminiSettings preserves foreign hooks and replaces prior managed hooks', () => {
  const existing = {
    hooks: {
      SessionEnd: [
        {
          hooks: [{
            name: 'foreign-hook',
            type: 'command',
            command: 'echo keep-me',
            timeout: 1000,
          }],
        },
        {
          hooks: [{
            name: GEMINI_CCUSAGE_HOOK_NAME,
            type: 'command',
            command: 'node "/old/collect.mjs"',
            timeout: 5000,
          }],
        },
      ],
    },
    hooksConfig: {
      enabled: false,
    },
  };

  const updated = updateGeminiSettings(existing, COMMAND);

  assert.equal(updated.hooksConfig.enabled, true);
  assert.equal(updated.hooks.SessionEnd.length, 2);
  assert.equal(updated.hooks.SessionEnd[0].hooks[0].command, 'echo keep-me');
  assert.equal(updated.hooks.SessionEnd[1].hooks[0].command, COMMAND);
  assert.equal(updated.hooks.SessionEnd[1].hooks[0].timeout, 15000);
  assert.equal(hasGeminiSessionEndHook(updated, COMMAND), true);
});
