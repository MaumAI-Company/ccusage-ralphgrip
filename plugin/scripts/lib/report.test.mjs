import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReport, buildReportFromEntries } from './report.mjs';

function makeTranscript(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'ccw-report-'));
  const file = join(dir, 'session.jsonl');
  writeFileSync(file, `${lines.join('\n')}\n`, 'utf-8');
  return file;
}

test('buildReport attaches project name and utilization reset timestamps', () => {
  const transcriptPath = makeTranscript([
    JSON.stringify({
      timestamp: '2026-03-18T02:00:00.000Z',
      message: { model: 'claude-haiku-4-5', usage: { input_tokens: 50, output_tokens: 10 } },
    }),
  ]);

  const report = buildReport({
    config: { memberName: 'Ada' },
    sessionId: 'session-123',
    transcriptPath,
    projectName: 'demo-project',
    reportedAt: '2026-03-19T00:00:00.000Z',
    utilization: {
      fiveHour: 0.5,
      sevenDay: 0.75,
      fiveHourResetsAt: '2026-03-19T05:00:00.000Z',
      sevenDayResetsAt: '2026-03-21T00:00:00.000Z',
    },
  });

  assert.equal(report.memberName, 'Ada');
  assert.equal(report.sessionId, 'session-123');
  assert.equal(report.reportedAt, '2026-03-19T00:00:00.000Z');
  assert.deepEqual(report.utilization, {
    fiveHour: 0.5,
    sevenDay: 0.75,
    fiveHourResetsAt: '2026-03-19T05:00:00.000Z',
    sevenDayResetsAt: '2026-03-21T00:00:00.000Z',
  });
  assert.equal(report.records[0].projectName, 'demo-project');
});

test('buildReportFromEntries builds report from entries array', () => {
  const entries = [
    {
      model: 'claude-haiku-4-5',
      usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      timestamp: '2026-03-18T02:00:00.000Z',
    },
  ];

  const report = buildReportFromEntries({
    config: { memberName: 'Grace' },
    sessionId: 'session-456',
    entries,
    projectName: 'entries-project',
    reportedAt: '2026-03-19T00:00:00.000Z',
  });

  assert.equal(report.memberName, 'Grace');
  assert.equal(report.sessionId, 'session-456');
  assert.equal(report.reportedAt, '2026-03-19T00:00:00.000Z');
  assert.equal(report.records[0].projectName, 'entries-project');
  assert.ok(report.records.length > 0);
});

test('buildReport omits memberName when not in config', () => {
  const transcriptPath = makeTranscript([
    JSON.stringify({
      timestamp: '2026-03-18T02:00:00.000Z',
      message: { model: 'claude-haiku-4-5', usage: { input_tokens: 50, output_tokens: 10 } },
    }),
  ]);

  const report = buildReport({
    config: { serverUrl: 'https://example.com' },
    sessionId: 'session-no-name',
    transcriptPath,
    projectName: 'demo-project',
    reportedAt: '2026-03-19T00:00:00.000Z',
  });

  assert.equal('memberName' in report, false);
  assert.equal(report.sessionId, 'session-no-name');
});

test('buildReportFromEntries omits memberName when not in config', () => {
  const entries = [
    {
      model: 'claude-haiku-4-5',
      usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      timestamp: '2026-03-18T02:00:00.000Z',
    },
  ];

  const report = buildReportFromEntries({
    config: { serverUrl: 'https://example.com' },
    sessionId: 'session-no-name',
    entries,
    projectName: 'entries-project',
    reportedAt: '2026-03-19T00:00:00.000Z',
  });

  assert.equal('memberName' in report, false);
  assert.equal(report.sessionId, 'session-no-name');
});

test('buildReportFromEntries includes memberName when in config', () => {
  const entries = [
    {
      model: 'claude-haiku-4-5',
      usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      timestamp: '2026-03-18T02:00:00.000Z',
    },
  ];

  const report = buildReportFromEntries({
    config: { memberName: 'Grace', serverUrl: 'https://example.com' },
    sessionId: 'session-with-name',
    entries,
    projectName: 'entries-project',
    reportedAt: '2026-03-19T00:00:00.000Z',
  });

  assert.equal(report.memberName, 'Grace');
});

test('buildReportFromEntries returns null for empty entries', () => {
  const report = buildReportFromEntries({
    config: { memberName: 'Grace' },
    sessionId: 'session-empty',
    entries: [],
    projectName: 'entries-project',
    reportedAt: '2026-03-19T00:00:00.000Z',
  });

  assert.equal(report, null);
});
