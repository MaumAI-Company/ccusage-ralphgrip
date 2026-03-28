import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseToolUsageFromContent, countTurnsFromContent } from './tools.mjs';

// Helper to build a JSONL string from an array of objects
function toJsonl(objects) {
  return objects.map(o => JSON.stringify(o)).join('\n');
}

// Helper to build an assistant line with tool_use blocks
function assistantLine(toolUses) {
  return {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: toolUses.map(({ id, name }) => ({
        type: 'tool_use',
        id,
        name,
        input: {},
      })),
    },
  };
}

// Helper to build a user line with tool_result blocks
function userLine(toolResults, toolUseResult = {}) {
  return {
    type: 'user',
    message: {
      role: 'user',
      content: toolResults.map(({ tool_use_id, is_error }) => ({
        type: 'tool_result',
        tool_use_id,
        ...(is_error !== undefined ? { is_error } : {}),
      })),
    },
    ...(Object.keys(toolUseResult).length > 0 ? { toolUseResult } : {}),
  };
}

describe('parseToolUsageFromContent', () => {
  it('parses tool_use and successful tool_result → correct accept counts', () => {
    const content = toJsonl([
      assistantLine([{ id: 'id1', name: 'Edit' }]),
      userLine([{ tool_use_id: 'id1' }]),
    ]);

    const result = parseToolUsageFromContent(content);
    assert.equal(result.length, 1);
    const edit = result.find(r => r.toolName === 'Edit');
    assert.ok(edit);
    assert.equal(edit.callCount, 1);
    assert.equal(edit.acceptCount, 1);
    assert.equal(edit.rejectCount, 0);
  });

  it('parses tool_result with is_error: true → correct reject count', () => {
    const content = toJsonl([
      assistantLine([{ id: 'id2', name: 'Bash' }]),
      userLine([{ tool_use_id: 'id2', is_error: true }]),
    ]);

    const result = parseToolUsageFromContent(content);
    assert.equal(result.length, 1);
    const bash = result.find(r => r.toolName === 'Bash');
    assert.ok(bash);
    assert.equal(bash.callCount, 1);
    assert.equal(bash.acceptCount, 0);
    assert.equal(bash.rejectCount, 1);
  });

  it('parses tool_result with toolUseResult.interrupted: true → correct reject count', () => {
    const content = toJsonl([
      assistantLine([{ id: 'id3', name: 'Bash' }]),
      userLine([{ tool_use_id: 'id3' }], { interrupted: true }),
    ]);

    const result = parseToolUsageFromContent(content);
    const bash = result.find(r => r.toolName === 'Bash');
    assert.ok(bash);
    assert.equal(bash.callCount, 1);
    assert.equal(bash.acceptCount, 0);
    assert.equal(bash.rejectCount, 1);
  });

  it('parses JSONL with no tools → empty array', () => {
    const content = toJsonl([
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hello' }] } },
      { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'world' }] } },
    ]);

    const result = parseToolUsageFromContent(content);
    assert.deepEqual(result, []);
  });

  it('parses tool_result with is_error absent → treated as accept', () => {
    const content = toJsonl([
      assistantLine([{ id: 'id4', name: 'Read' }]),
      userLine([{ tool_use_id: 'id4' }]),
    ]);

    const result = parseToolUsageFromContent(content);
    const read = result.find(r => r.toolName === 'Read');
    assert.ok(read);
    assert.equal(read.acceptCount, 1);
    assert.equal(read.rejectCount, 0);
  });

  it('multiple calls to same tool → aggregated correctly', () => {
    const content = toJsonl([
      assistantLine([{ id: 'id5', name: 'Edit' }, { id: 'id6', name: 'Edit' }]),
      userLine([{ tool_use_id: 'id5' }]),
      userLine([{ tool_use_id: 'id6', is_error: true }]),
      assistantLine([{ id: 'id7', name: 'Edit' }]),
      userLine([{ tool_use_id: 'id7' }]),
    ]);

    const result = parseToolUsageFromContent(content);
    const edit = result.find(r => r.toolName === 'Edit');
    assert.ok(edit);
    assert.equal(edit.callCount, 3);
    assert.equal(edit.acceptCount, 2);
    assert.equal(edit.rejectCount, 1);
  });

  it('mixed tool types → each tool tracked separately', () => {
    const content = toJsonl([
      assistantLine([{ id: 'id8', name: 'Read' }, { id: 'id9', name: 'Edit' }]),
      userLine([{ tool_use_id: 'id8' }]),
      userLine([{ tool_use_id: 'id9', is_error: true }]),
    ]);

    const result = parseToolUsageFromContent(content);
    assert.equal(result.length, 2);

    const read = result.find(r => r.toolName === 'Read');
    assert.ok(read);
    assert.equal(read.callCount, 1);
    assert.equal(read.acceptCount, 1);
    assert.equal(read.rejectCount, 0);

    const edit = result.find(r => r.toolName === 'Edit');
    assert.ok(edit);
    assert.equal(edit.callCount, 1);
    assert.equal(edit.acceptCount, 0);
    assert.equal(edit.rejectCount, 1);
  });

  it('skips tool_result with unknown tool_use_id', () => {
    const content = toJsonl([
      userLine([{ tool_use_id: 'unknown-id' }]),
    ]);

    const result = parseToolUsageFromContent(content);
    assert.deepEqual(result, []);
  });
});

describe('countTurnsFromContent', () => {
  it('counts assistant lines correctly', () => {
    const content = toJsonl([
      { type: 'assistant', message: { role: 'assistant', content: [] } },
      { type: 'user', message: { role: 'user', content: [] } },
      { type: 'assistant', message: { role: 'assistant', content: [] } },
      { type: 'assistant', message: { role: 'assistant', content: [] } },
    ]);

    assert.equal(countTurnsFromContent(content), 3);
  });

  it('returns 0 for empty content', () => {
    assert.equal(countTurnsFromContent(''), 0);
  });

  it('returns 0 when no assistant lines', () => {
    const content = toJsonl([
      { type: 'user', message: { role: 'user', content: [] } },
    ]);
    assert.equal(countTurnsFromContent(content), 0);
  });

  it('ignores unparseable lines', () => {
    const content = [
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [] } }),
      'not valid json',
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [] } }),
    ].join('\n');

    assert.equal(countTurnsFromContent(content), 2);
  });
});
