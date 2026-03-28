#!/usr/bin/env node

/**
 * ccusage-worv Catch-up script
 *
 * SessionStart catches unsent Claude sessions, OpenCode can invoke the same
 * entrypoint with a specific session ID, Gemini CLI can replay saved chat
 * transcripts, and Codex notify can sync a thread by parsing ~/.codex/sessions
 * JSONL logs.
 */

import { existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { CLAUDE_PROJECTS_DIR, CODEX_SESSIONS_DIR, GEMINI_TMP_DIR, OPENCODE_MESSAGES_DIR } from './lib/paths.mjs';
import { loadConfig, loadSentSessions, saveSentSessions, getSentSessionKey, isSessionSent, markSessionSent, getPluginVersion } from './lib/config.mjs';
import { t } from './lib/i18n.mjs';
import { parseJsonlFile, aggregateByModel, parseOpenCodeSessionMessages, parseGeminiConversationFile, findCodexSessionFile, parseCodexSession, parseCodexSessionFile } from './lib/transcripts.mjs';
import { parseToolUsage, countTurns } from './lib/tools.mjs';
import { sendReport } from './lib/transport.mjs';
import { fetchUtilization } from './lib/utilization.mjs';
import { checkForUpdate } from './lib/update-check.mjs';

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ACTIVE_WINDOW_MS = 60_000;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 250);
  });
}

function printUsage() {
  console.log(t('catchup.usage'));
  console.log('');
  console.log(t('catchup.optAll'));
  console.log(t('catchup.optSession'));
  console.log(t('catchup.optCodex'));
}

function parseCliArgs(argv) {
  const options = {
    all: false,
    sessionId: null,
    codexSessionId: null,
    activeWindowMs: DEFAULT_ACTIVE_WINDOW_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--all') {
      options.all = true;
      continue;
    }

    if (arg === '--session') {
      options.sessionId = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--session=')) {
      options.sessionId = arg.slice('--session='.length) || null;
      continue;
    }

    if (arg === '--codex-session' || arg === '--thread') {
      options.codexSessionId = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--codex-session=')) {
      options.codexSessionId = arg.slice('--codex-session='.length) || null;
      continue;
    }

    if (arg.startsWith('--thread=')) {
      options.codexSessionId = arg.slice('--thread='.length) || null;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return options;
}

function normalizeSessionId(sessionId) {
  if (typeof sessionId !== 'string') return null;
  const trimmed = sessionId.trim();
  return trimmed.startsWith('ses_') ? trimmed : null;
}

function normalizeCodexSessionId(sessionId) {
  if (typeof sessionId !== 'string') return null;
  const trimmed = sessionId.trim();
  if (!trimmed) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

function resolveHookSessionId(payload) {
  if (!payload || typeof payload !== 'object') return null;

  return normalizeSessionId(
    payload.sessionID
    || payload.sessionId
    || payload.session_id
    || payload.id
    || payload.session?.id
    || payload.session?.sessionID
    || payload.session?.sessionId
    || payload.session?.session_id
  );
}

async function resolveRunOptions() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.sessionId) {
    options.sessionId = normalizeSessionId(options.sessionId);
    return options;
  }

  if (options.codexSessionId) {
    options.codexSessionId = normalizeCodexSessionId(options.codexSessionId);
    return options;
  }

  let raw = '';
  try {
    raw = await readStdin();
  } catch {
    return options;
  }

  if (!raw.trim()) return options;

  try {
    const parsed = JSON.parse(raw);
    const sessionId = resolveHookSessionId(parsed);
    if (sessionId) options.sessionId = sessionId;
    if (!options.codexSessionId) {
      options.codexSessionId = normalizeCodexSessionId(
        parsed['thread-id']
        || parsed.thread_id
        || parsed.threadId
        || parsed.session_id
      );
    }
  } catch {
    // ignore non-JSON stdin
  }

  return options;
}

function resolveCutoff(options) {
  if (options.all) return 0;
  return Date.now() - DEFAULT_MAX_AGE_MS;
}

const PROJECT_NAME = 'projects';

function getOpenCodeSyncCursor(sentSessions, sessionId) {
  if (!sentSessions || typeof sentSessions !== 'object') return null;

  const key = getSentSessionKey('opencode', sessionId);
  const raw = sentSessions[key] ?? sentSessions[sessionId] ?? null;
  if (!raw) return null;

  if (typeof raw === 'object') {
    return {
      syncedAt: typeof raw.syncedAt === 'string' ? raw.syncedAt : null,
      lastMessageId: typeof raw.lastMessageId === 'string' ? raw.lastMessageId : null,
      lastCursorKey: typeof raw.lastCursorKey === 'string' ? raw.lastCursorKey : null,
      state: typeof raw.state === 'string' ? raw.state : 'sent',
    };
  }

  if (raw === 'empty') {
    return {
      syncedAt: null,
      lastMessageId: null,
      lastCursorKey: null,
      state: 'empty',
    };
  }

  if (typeof raw === 'string') {
    return {
      syncedAt: raw,
      lastMessageId: null,
      lastCursorKey: null,
      state: 'sent',
    };
  }

  return null;
}

function filterNewOpenCodeEntries(entries, cursor) {
  if (!cursor) return entries;

  if (cursor.lastMessageId) {
    const lastIndex = entries.findIndex((entry) => entry.messageId === cursor.lastMessageId);
    if (lastIndex >= 0) {
      const matchedEntry = entries[lastIndex];
      if (cursor.lastCursorKey && matchedEntry?.cursorKey === cursor.lastCursorKey) {
        return entries.slice(lastIndex + 1);
      }

      return entries.slice(lastIndex);
    }
  }

  if (cursor.syncedAt) {
    return entries.filter((entry) => entry.timestamp > cursor.syncedAt);
  }

  if (cursor.state === 'empty') {
    return entries;
  }

  return [];
}

function hasPendingOpenCodeSync(sentSessions, sessionId) {
  const entries = parseOpenCodeSessionMessages(sessionId);
  if (entries.length === 0) {
    const cursor = getOpenCodeSyncCursor(sentSessions, sessionId);
    return !cursor || cursor.state !== 'empty';
  }

  const cursor = getOpenCodeSyncCursor(sentSessions, sessionId);
  return filterNewOpenCodeEntries(entries, cursor).length > 0;
}

function buildOpenCodeReportSessionId(sessionId, entries) {
  const lastEntry = entries[entries.length - 1];
  if (!lastEntry) return sessionId;
  return `${sessionId}:${lastEntry.messageId || lastEntry.timestamp}`;
}

function getCodexSyncCursor(sentSessions, sessionId) {
  if (!sentSessions || typeof sentSessions !== 'object') return null;

  const key = getSentSessionKey('codex', sessionId);
  const raw = sentSessions[key] ?? null;
  if (!raw) return null;

  if (typeof raw === 'object') {
    return {
      state: typeof raw.state === 'string' ? raw.state : 'sent',
      syncedAt: typeof raw.syncedAt === 'string' ? raw.syncedAt : null,
      lastTurnId: typeof raw.lastTurnId === 'string' ? raw.lastTurnId : null,
      lastRecordedAt: typeof raw.lastRecordedAt === 'string' ? raw.lastRecordedAt : null,
    };
  }

  if (raw === 'empty') {
    return {
      state: 'empty',
      syncedAt: null,
      lastTurnId: null,
      lastRecordedAt: null,
    };
  }

  if (typeof raw === 'string') {
    return {
      state: 'sent',
      syncedAt: raw,
      lastTurnId: null,
      lastRecordedAt: null,
    };
  }

  return null;
}

function hasPendingCodexSync(sentSessions, sessionId, parsedSession = null) {
  const session = parsedSession || parseCodexSession(sessionId);
  if (!session) return false;

  if (session.entries.length === 0) {
    const cursor = getCodexSyncCursor(sentSessions, sessionId);
    return !cursor || cursor.state !== 'empty';
  }

  const cursor = getCodexSyncCursor(sentSessions, sessionId);
  if (!cursor) return true;
  if (cursor.state === 'empty') return true;
  if (session.lastTurnId && cursor.lastTurnId) {
    return session.lastTurnId !== cursor.lastTurnId;
  }
  if (session.lastRecordedAt && cursor.lastRecordedAt) {
    return session.lastRecordedAt !== cursor.lastRecordedAt;
  }
  return true;
}

function findUnsentClaudeTranscripts(sentSessions, cutoff, activeWindowMs) {
  const unsent = [];

  if (!existsSync(CLAUDE_PROJECTS_DIR)) return unsent;

  const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join(CLAUDE_PROJECTS_DIR, dirent.name));

  for (const projDir of projectDirs) {
    let files;
    try {
      files = readdirSync(projDir).filter((fileName) => fileName.endsWith('.jsonl'));
    } catch {
      continue;
    }

    for (const fileName of files) {
      const sessionId = fileName.replace('.jsonl', '');
      if (isSessionSent(sentSessions, 'claude', sessionId)) continue;

      const filePath = join(projDir, fileName);
      try {
        const stat = statSync(filePath);
        if (stat.mtimeMs < cutoff) continue;
        if (activeWindowMs > 0 && Date.now() - stat.mtimeMs < activeWindowMs) continue;

        unsent.push({ source: 'claude', sessionId, filePath });
      } catch {
        continue;
      }
    }
  }

  return unsent;
}

function findUnsentOpenCodeSessions(sentSessions, cutoff, activeWindowMs) {
  const unsent = [];
  if (!existsSync(OPENCODE_MESSAGES_DIR)) return unsent;

  let sessionDirs = [];
  try {
    sessionDirs = readdirSync(OPENCODE_MESSAGES_DIR, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith('ses_'));
  } catch {
    return unsent;
  }

  for (const dirent of sessionDirs) {
    const sessionId = dirent.name;
    const dirPath = join(OPENCODE_MESSAGES_DIR, sessionId);

    try {
      const stat = statSync(dirPath);
      if (stat.mtimeMs < cutoff) continue;
      if (activeWindowMs > 0 && Date.now() - stat.mtimeMs < activeWindowMs) continue;
      if (!hasPendingOpenCodeSync(sentSessions, sessionId)) continue;

      unsent.push({
        source: 'opencode',
        sessionId,
        filePath: dirPath,
      });
    } catch {
      continue;
    }
  }

  return unsent;
}

function findSpecificOpenCodeSession(sentSessions, sessionId) {
  const normalized = normalizeSessionId(sessionId);
  if (!normalized) return [];

  const dirPath = join(OPENCODE_MESSAGES_DIR, normalized);
  if (!existsSync(dirPath)) return [];
  if (!hasPendingOpenCodeSync(sentSessions, normalized)) return [];

  return [{
    source: 'opencode',
    sessionId: normalized,
    filePath: dirPath,
  }];
}

function listGeminiConversationFiles(dirPath = GEMINI_TMP_DIR, results = []) {
  if (!existsSync(dirPath)) return results;

  let dirents = [];
  try {
    dirents = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const dirent of dirents) {
    const fullPath = join(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      listGeminiConversationFiles(fullPath, results);
      continue;
    }

    if (!dirent.isFile() || !dirent.name.startsWith('session-') || !dirent.name.endsWith('.json')) {
      continue;
    }

    if (!/[\\/]chats[\\/]/.test(fullPath)) continue;
    results.push(fullPath);
  }

  return results;
}

function findUnsentGeminiSessions(sentSessions, cutoff, activeWindowMs) {
  const unsent = [];
  const files = listGeminiConversationFiles();

  for (const filePath of files) {
    try {
      const stat = statSync(filePath);
      if (stat.mtimeMs < cutoff) continue;
      if (activeWindowMs > 0 && Date.now() - stat.mtimeMs < activeWindowMs) continue;

      const session = parseGeminiConversationFile(filePath);
      const sessionId = typeof session.sessionId === 'string' ? session.sessionId.trim() : '';
      if (!sessionId || isSessionSent(sentSessions, 'gemini', sessionId)) continue;

      unsent.push({
        source: 'gemini',
        sessionId,
        filePath,
        lastRecordedAt: session.lastRecordedAt,
      });
    } catch {
      continue;
    }
  }

  return unsent;
}

function findUnsentCodexSessions(sentSessions, cutoff, activeWindowMs) {
  const unsent = [];
  if (!existsSync(CODEX_SESSIONS_DIR)) return unsent;

  const walk = (dirPath) => {
    let dirents = [];
    try {
      dirents = readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const dirent of dirents) {
      const fullPath = join(dirPath, dirent.name);

      if (dirent.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!dirent.isFile() || !dirent.name.endsWith('.jsonl')) {
        continue;
      }

      const session = parseCodexSessionFile(fullPath);
      const sessionId = normalizeCodexSessionId(session.sessionId);
      if (!sessionId) continue;

      try {
        const stat = statSync(fullPath);
        if (stat.mtimeMs < cutoff) continue;
        if (activeWindowMs > 0 && Date.now() - stat.mtimeMs < activeWindowMs) continue;
        if (!hasPendingCodexSync(sentSessions, sessionId, session)) continue;

        unsent.push({
          source: 'codex',
          sessionId,
          filePath: fullPath,
          lastTurnId: session.lastTurnId,
          lastRecordedAt: session.lastRecordedAt,
        });
      } catch {
        continue;
      }
    }
  };

  walk(CODEX_SESSIONS_DIR);
  return unsent;
}

function findSpecificCodexSession(sentSessions, sessionId) {
  const normalized = normalizeCodexSessionId(sessionId);
  if (!normalized) return [];

  const filePath = findCodexSessionFile(normalized);
  if (!filePath) return [];
  const session = parseCodexSessionFile(filePath);
  if (!hasPendingCodexSync(sentSessions, normalized, session)) return [];
  return [{
    source: 'codex',
    sessionId: normalized,
    filePath,
    lastTurnId: session.lastTurnId,
    lastRecordedAt: session.lastRecordedAt,
  }];
}

export function findUnsentTranscripts(sentSessions, options = {}) {
  if (options.sessionId) {
    return findSpecificOpenCodeSession(sentSessions, options.sessionId);
  }

  if (options.codexSessionId) {
    return findSpecificCodexSession(sentSessions, options.codexSessionId);
  }

  const cutoff = resolveCutoff(options);
  const activeWindowMs = typeof options.activeWindowMs === 'number'
    ? Math.max(0, options.activeWindowMs)
    : DEFAULT_ACTIVE_WINDOW_MS;
  const claudeUnsent = findUnsentClaudeTranscripts(sentSessions, cutoff, activeWindowMs);
  const openCodeUnsent = findUnsentOpenCodeSessions(sentSessions, cutoff, activeWindowMs);
  const geminiUnsent = findUnsentGeminiSessions(sentSessions, cutoff, activeWindowMs);
  const codexUnsent = findUnsentCodexSessions(sentSessions, cutoff, activeWindowMs);

  return [...claudeUnsent, ...openCodeUnsent, ...geminiUnsent, ...codexUnsent];
}

export async function runCatchup(configOverride, options = {}) {
  const config = configOverride || loadConfig();
  if (!config) return { success: false, total: 0 };

  const sent = loadSentSessions();
  const unsent = findUnsentTranscripts(sent, options);

  if (unsent.length === 0) return { success: true, total: 0 };

  const utilization = await fetchUtilization();
  let successCount = 0;

  for (const { source, sessionId, filePath } of unsent) {
    try {
      const allEntries = source === 'opencode'
        ? parseOpenCodeSessionMessages(sessionId)
        : source === 'gemini'
          ? (parseGeminiConversationFile(filePath).entries || [])
          : source === 'codex'
            ? (parseCodexSessionFile(filePath).entries || [])
            : parseJsonlFile(filePath);

      const cursor = source === 'opencode'
        ? getOpenCodeSyncCursor(sent, sessionId)
        : source === 'codex'
          ? getCodexSyncCursor(sent, sessionId)
          : null;
      const entries = source === 'opencode'
        ? filterNewOpenCodeEntries(allEntries, cursor)
        : allEntries;

      if (allEntries.length === 0) {
        markSessionSent(sent, source, sessionId, 'empty');
        continue;
      }

      if (entries.length === 0) {
        continue;
      }

      const records = aggregateByModel(entries);
      records.forEach((record) => { record.projectName = PROJECT_NAME; });

      const reportSessionId = source === 'opencode'
        ? buildOpenCodeReportSessionId(sessionId, entries)
        : sessionId;

      const toolUsage = source === 'claude' ? parseToolUsage(filePath) : undefined;
      const turnCount = source === 'claude' ? countTurns(filePath) : undefined;

      const report = {
        ...(config.memberName ? { memberName: config.memberName } : {}),
        sessionId: reportSessionId,
        records,
        reportedAt: new Date().toISOString(),
        pluginVersion: getPluginVersion(),
        ...(source === 'codex' || source === 'gemini' || !utilization ? {} : { utilization }),
        ...(toolUsage && toolUsage.length > 0 && { toolUsage }),
        ...(turnCount !== undefined && turnCount > 0 && { turnCount }),
      };

      await sendReport(config.serverUrl, report, config);

      if (source === 'opencode') {
        const lastEntry = entries[entries.length - 1];
        markSessionSent(sent, source, sessionId, {
          state: 'sent',
          syncedAt: lastEntry?.timestamp || new Date().toISOString(),
          lastMessageId: lastEntry?.messageId || null,
          lastCursorKey: lastEntry?.cursorKey || null,
        });
      } else if (source === 'codex') {
        const lastEntry = entries[entries.length - 1];
        markSessionSent(sent, source, sessionId, {
          state: 'sent',
          syncedAt: new Date().toISOString(),
          lastTurnId: lastEntry?.turnId || null,
          lastRecordedAt: lastEntry?.timestamp || null,
        });
      } else {
        markSessionSent(sent, source, sessionId, new Date().toISOString());
      }

      successCount += 1;
    } catch (error) {
      console.error(t('catchup.failed', { sessionId }), error.message);
    }
  }

  saveSentSessions(sent);
  return { success: true, total: successCount };
}

export async function runOpenCodeCatchup(configOverride, options = {}) {
  const sessionId = normalizeSessionId(options.sessionId);
  if (!sessionId) {
    return { success: false, total: 0 };
  }

  return runCatchup(configOverride, {
    sessionId,
    activeWindowMs: 0,
  });
}

export async function runCodexCatchup(configOverride, options = {}) {
  const sessionId = normalizeCodexSessionId(options.sessionId || options.threadId);
  if (!sessionId) {
    return { success: false, total: 0 };
  }

  return runCatchup(configOverride, {
    codexSessionId: sessionId,
    activeWindowMs: 0,
  });
}

/**
 * Remove old plugin version directories left behind after upgrade.
 * Safe to run on SessionStart because CLAUDE_PLUGIN_ROOT already points
 * to the new version — old directories are no longer needed.
 */
function cleanupOldVersions() {
  const currentVersion = getPluginVersion();
  if (!currentVersion || currentVersion === 'unknown') return;

  const parentDir = join(homedir(), '.claude', 'plugins', 'ccusage-worv');
  if (!existsSync(parentDir)) return;

  try {
    for (const entry of readdirSync(parentDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== currentVersion) {
        rmSync(join(parentDir, entry.name), { recursive: true, force: true });
      }
    }
  } catch {
    // best-effort cleanup
  }
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  cleanupOldVersions();
  const config = loadConfig();
  const [options, updateInfo] = await Promise.all([
    resolveRunOptions(),
    config?.serverUrl ? checkForUpdate(config.serverUrl) : Promise.resolve(null),
  ]);
  const { total } = await runCatchup(config, options);
  if (total > 0) {
    console.error(t('catchup.synced', { total }));
  }
  if (updateInfo?.hasUpdate) {
    console.error(`ccusage-worv: update available (${updateInfo.currentVersion} → ${updateInfo.latestVersion}). Claude Code: /plugin marketplace update worv | Others: curl -sL ${config.serverUrl}/api/install | bash`);
  }
}
