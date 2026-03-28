#!/usr/bin/env node

/**
 * ccusage-ralphgrip background worker
 *
 * Spawned by collect.mjs as a detached process. Reads the hook payload
 * from a temp file, parses the transcript, and sends the report.
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { loadConfig, loadSentSessions, saveSentSessions, markSessionSent, getPluginVersion } from './lib/config.mjs';
import { parseJsonlFile, aggregateByModel, parseOpenCodeSessionMessages, parseGeminiConversationFile } from './lib/transcripts.mjs';
import { parseToolUsage, countTurns } from './lib/tools.mjs';
import { sendReport } from './lib/transport.mjs';
import { fetchUtilization } from './lib/utilization.mjs';

const PROJECT_NAME = 'projects';

function detectSourceFromPath(transcriptPath, hookPayload = null) {
  if (transcriptPath.endsWith('.jsonl')) {
    return { source: 'claude', opencodeSessionId: null };
  }

  const opencodeMatch = transcriptPath.match(/[\\/]message[\\/](ses_[^/\\]+)[\\/]/);
  if (opencodeMatch) {
    return { source: 'opencode', opencodeSessionId: opencodeMatch[1] };
  }

  if (
    transcriptPath.endsWith('.json') &&
    (/[\\/]chats[\\/]session-[^/\\]+\.json$/i.test(transcriptPath)
      || hookPayload?.hook_event_name === 'SessionEnd')
  ) {
    return { source: 'gemini', opencodeSessionId: null };
  }

  return { source: 'claude', opencodeSessionId: null };
}

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath || !existsSync(payloadPath)) {
    process.exit(0);
  }

  let hookPayload;
  try {
    hookPayload = JSON.parse(readFileSync(payloadPath, 'utf-8'));
  } finally {
    // Clean up temp file regardless of parse success
    try { unlinkSync(payloadPath); } catch {}
  }

  const config = loadConfig();
  if (!config) process.exit(0);

  let sessionId = hookPayload.session_id || hookPayload.sessionId || 'unknown';
  const transcriptPath = hookPayload.transcript_path || hookPayload.transcriptPath || '';

  if (!transcriptPath || !existsSync(transcriptPath)) {
    return;
  }

  const sourceInfo = detectSourceFromPath(transcriptPath, hookPayload);
  if (sourceInfo.source === 'opencode' && sourceInfo.opencodeSessionId) {
    sessionId = sourceInfo.opencodeSessionId;
  }

  const geminiSession = sourceInfo.source === 'gemini'
    ? parseGeminiConversationFile(transcriptPath)
    : null;

  if (sourceInfo.source === 'gemini' && geminiSession?.sessionId) {
    sessionId = geminiSession.sessionId;
  }

  const entries = sourceInfo.source === 'opencode' && sourceInfo.opencodeSessionId
    ? parseOpenCodeSessionMessages(sourceInfo.opencodeSessionId)
    : sourceInfo.source === 'gemini'
      ? geminiSession?.entries || []
      : parseJsonlFile(transcriptPath);

  if (entries.length === 0) return;

  const records = aggregateByModel(entries);
  records.forEach((record) => {
    record.projectName = PROJECT_NAME;
  });

  // Fetch utilization in parallel with building the rest of the report
  const utilizationPromise = sourceInfo.source === 'gemini' || sourceInfo.source === 'codex'
    ? Promise.resolve(null)
    : fetchUtilization();

  const toolUsage = sourceInfo.source === 'claude' ? parseToolUsage(transcriptPath) : undefined;
  const turnCount = sourceInfo.source === 'claude' ? countTurns(transcriptPath) : undefined;

  const utilization = await utilizationPromise;

  const report = {
    ...(config.memberName ? { memberName: config.memberName } : {}),
    sessionId,
    records,
    reportedAt: new Date().toISOString(),
    pluginVersion: getPluginVersion(),
    ...(utilization ? { utilization } : {}),
    ...(toolUsage && toolUsage.length > 0 ? { toolUsage } : {}),
    ...(turnCount !== undefined && turnCount > 0 ? { turnCount } : {}),
  };

  try {
    await sendReport(config.serverUrl, report, config);
    const sent = loadSentSessions();
    markSessionSent(sent, sourceInfo.source, sessionId, new Date().toISOString());
    saveSentSessions(sent);
  } catch {
    // Silent failure — catchup script will retry on next SessionStart
  }
}

main();
