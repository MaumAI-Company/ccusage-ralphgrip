import test from 'node:test';
import assert from 'node:assert/strict';
import { getSentSessionKey, isSessionSent, markSessionSent, validateMemberName } from './config.mjs';

test('getSentSessionKey returns opencode:{id} for opencode source', () => {
  assert.equal(getSentSessionKey('opencode', 'abc123'), 'opencode:abc123');
});

test('getSentSessionKey returns codex:{id} for codex source', () => {
  assert.equal(getSentSessionKey('codex', 'xyz789'), 'codex:xyz789');
});

test('getSentSessionKey returns gemini:{id} for gemini source', () => {
  assert.equal(getSentSessionKey('gemini', 'gem-123'), 'gemini:gem-123');
});

test('getSentSessionKey returns plain id for claude source', () => {
  assert.equal(getSentSessionKey('claude', 'session-42'), 'session-42');
});

test('isSessionSent checks prefixed key', () => {
  const sent = { 'opencode:abc123': true };
  assert.equal(isSessionSent(sent, 'opencode', 'abc123'), true);
  assert.equal(isSessionSent(sent, 'opencode', 'other'), false);
});

test('isSessionSent backward compat: finds raw opencode key without prefix', () => {
  const sent = { 'abc123': true };
  assert.equal(isSessionSent(sent, 'opencode', 'abc123'), true);
});

test('markSessionSent sets the correct prefixed key', () => {
  const sent = {};
  markSessionSent(sent, 'opencode', 'abc123', true);
  assert.equal(sent['opencode:abc123'], true);

  const sent2 = {};
  markSessionSent(sent2, 'codex', 'xyz789', true);
  assert.equal(sent2['codex:xyz789'], true);

  const sent3 = {};
  markSessionSent(sent3, 'gemini', 'gem-123', true);
  assert.equal(sent3['gemini:gem-123'], true);
});

// --- validateMemberName ---

test('validateMemberName does not warn for valid Latin name', (t) => {
  const original = process.stderr.write;
  let warned = false;
  process.stderr.write = () => { warned = true; return true; };
  try {
    validateMemberName('John Doe');
    assert.equal(warned, false);
  } finally {
    process.stderr.write = original;
  }
});

test('validateMemberName does not warn for valid Korean name', (t) => {
  const original = process.stderr.write;
  let warned = false;
  process.stderr.write = () => { warned = true; return true; };
  try {
    validateMemberName('홍길동');
    assert.equal(warned, false);
  } finally {
    process.stderr.write = original;
  }
});

test('validateMemberName warns for names with special characters', (t) => {
  const original = process.stderr.write;
  let output = '';
  process.stderr.write = (msg) => { output += msg; return true; };
  try {
    validateMemberName('John<script>');
    assert.ok(output.includes('disallowed characters'));
  } finally {
    process.stderr.write = original;
  }
});

test('validateMemberName does not warn for empty or non-string input', (t) => {
  const original = process.stderr.write;
  let warned = false;
  process.stderr.write = () => { warned = true; return true; };
  try {
    validateMemberName('');
    validateMemberName(null);
    validateMemberName(undefined);
    assert.equal(warned, false);
  } finally {
    process.stderr.write = original;
  }
});
