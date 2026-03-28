import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSyncTriggerSessionId } from './opencode-plugin.mjs';

test('resolveSyncTriggerSessionId reads session.idle payloads', () => {
  const sessionId = resolveSyncTriggerSessionId({
    type: 'session.idle',
    properties: {
      sessionID: 'ses_idle123',
    },
  });

  assert.equal(sessionId, 'ses_idle123');
});

test('resolveSyncTriggerSessionId accepts alternate session key shapes', () => {
  const sessionId = resolveSyncTriggerSessionId({
    type: 'session.idle',
    properties: {
      session: {
        id: 'ses_nested123',
      },
    },
  });

  assert.equal(sessionId, 'ses_nested123');
});

test('resolveSyncTriggerSessionId reads assistant message updates', () => {
  const sessionId = resolveSyncTriggerSessionId({
    type: 'message.updated',
    properties: {
      info: {
        role: 'assistant',
        sessionID: 'ses_msg123',
      },
    },
  });

  assert.equal(sessionId, 'ses_msg123');
});

test('resolveSyncTriggerSessionId ignores non-assistant messages', () => {
  const sessionId = resolveSyncTriggerSessionId({
    type: 'message.updated',
    properties: {
      info: {
        role: 'user',
        sessionID: 'ses_user123',
      },
    },
  });

  assert.equal(sessionId, null);
});

test('resolveSyncTriggerSessionId ignores unrelated events', () => {
  const sessionId = resolveSyncTriggerSessionId({
    type: 'session.created',
    properties: {
      info: {
        id: 'ses_created123',
      },
    },
  });

  assert.equal(sessionId, null);
});
