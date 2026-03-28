import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { OPENCODE_MESSAGES_DIR, OPENCODE_SESSIONS_DIR, CODEX_SESSIONS_DIR, GEMINI_TMP_DIR } from './paths.mjs';
import { estimateCost } from './pricing.mjs';

// --- Utility functions ---

function toNonNegativeInt(value) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function toIsoTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

// --- Claude JSONL parsers ---

function parseSingleJsonlFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const entries = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const msg = parsed.message;
      if (msg && msg.model && msg.usage && msg.usage.input_tokens !== undefined) {
        if (msg.model === '<synthetic>' || msg.model === '') continue;
        entries.push({
          model: msg.model,
          usage: msg.usage,
          timestamp: toIsoTimestamp(parsed.timestamp),
        });
      }
    } catch {
      // skip malformed lines
    }
  }

  return entries;
}

function parseClaudeJsonlFile(filePath) {
  const paths = [filePath];

  // Include subagent transcripts ({sessionId}/subagents/*.jsonl)
  const sessionDir = filePath.replace(/\.jsonl$/, '');
  const subagentsDir = join(sessionDir, 'subagents');
  if (existsSync(subagentsDir)) {
    try {
      const files = readdirSync(subagentsDir);
      for (const f of files) {
        if (f.endsWith('.jsonl')) {
          paths.push(join(subagentsDir, f));
        }
      }
    } catch {
      // ignore read errors
    }
  }

  const allEntries = [];
  for (const p of paths) {
    allEntries.push(...parseSingleJsonlFile(p));
  }
  return allEntries;
}

// --- OpenCode parsers ---

function parseOpenCodeMessageObject(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.role !== 'assistant') return null;

  const model = typeof parsed.modelID === 'string'
    ? parsed.modelID
    : (typeof parsed.model === 'string' ? parsed.model : '');
  if (!model || model === '<synthetic>') return null;

  const tokens = parsed.tokens && typeof parsed.tokens === 'object' ? parsed.tokens : {};
  const cache = tokens.cache && typeof tokens.cache === 'object' ? tokens.cache : {};

  // OpenCode: tokens.output already includes tokens.reasoning (subset, not additive)
  // OpenCode: tokens.input already includes cache.read for OpenAI models
  const rawInput = toNonNegativeInt(tokens.input);
  const outputTokens = toNonNegativeInt(tokens.output);
  const cacheCreationTokens = toNonNegativeInt(cache.write);
  const cacheReadTokens = toNonNegativeInt(cache.read);
  const inputTokens = Math.max(0, rawInput - cacheReadTokens);

  if (inputTokens === 0 && outputTokens === 0 && cacheCreationTokens === 0 && cacheReadTokens === 0) {
    return null;
  }

  const timestamp = toIsoTimestamp(parsed.time && parsed.time.created);

  return {
    model,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_read_input_tokens: cacheReadTokens,
    },
    timestamp,
  };
}

function parseOpenCodeMessageFile(filePath) {
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    const entry = parseOpenCodeMessageObject(parsed);
    if (!entry) return [];

    const messageId = typeof parsed.id === 'string' && parsed.id.trim()
      ? parsed.id.trim()
      : null;

    const cursorKey = [
      messageId || 'unknown',
      entry.timestamp,
      entry.usage.input_tokens,
      entry.usage.output_tokens,
      entry.usage.cache_creation_input_tokens,
      entry.usage.cache_read_input_tokens,
    ].join(':');

    return [{
      ...entry,
      cursorKey,
      ...(messageId ? { messageId } : {}),
    }];
  } catch {
    return [];
  }
}

export function loadOpenCodeSessionMetadata(sessionId) {
  if (!existsSync(OPENCODE_SESSIONS_DIR)) return null;

  try {
    const bucketDirs = readdirSync(OPENCODE_SESSIONS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(OPENCODE_SESSIONS_DIR, d.name));

    for (const bucketDir of bucketDirs) {
      const candidatePath = join(bucketDir, `${sessionId}.json`);
      if (!existsSync(candidatePath)) continue;
      try {
        return JSON.parse(readFileSync(candidatePath, 'utf-8'));
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function parseOpenCodeSessionMessages(sessionId) {
  const sessionDir = join(OPENCODE_MESSAGES_DIR, sessionId);
  if (!existsSync(sessionDir)) return [];

  let files = [];
  try {
    files = readdirSync(sessionDir)
      .filter(name => name.endsWith('.json'))
      .map(name => join(sessionDir, name));
  } catch {
    return [];
  }

  const entries = [];
  for (const filePath of files) {
    const parsedEntries = parseOpenCodeMessageFile(filePath);
    if (parsedEntries.length > 0) entries.push(...parsedEntries);
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return entries;
}

// --- Gemini CLI parsers ---

function parseGeminiMessageObject(message) {
  if (!message || typeof message !== 'object' || message.type !== 'gemini') return null;

  const model = typeof message.model === 'string' ? message.model.trim() : '';
  if (!model || model === '<synthetic>') return null;

  const tokens = message.tokens && typeof message.tokens === 'object' ? message.tokens : {};
  const promptTokens = toNonNegativeInt(tokens.input);
  const cacheReadTokens = toNonNegativeInt(tokens.cached);
  const candidateTokens = toNonNegativeInt(tokens.output);
  const thoughtsTokens = toNonNegativeInt(tokens.thoughts);

  const inputTokens = Math.max(0, promptTokens - cacheReadTokens);
  const outputTokens = candidateTokens + thoughtsTokens;

  if (inputTokens === 0 && outputTokens === 0 && cacheReadTokens === 0) {
    return null;
  }

  return {
    model,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: cacheReadTokens,
    },
    timestamp: toIsoTimestamp(message.timestamp),
  };
}

export function parseGeminiConversationFile(filePath) {
  const fallbackSessionId = basename(filePath).replace(/\.json$/i, '');
  const empty = {
    sessionId: fallbackSessionId,
    entries: [],
    lastRecordedAt: null,
  };

  if (!existsSync(filePath)) return empty;

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    const sessionId = typeof parsed?.sessionId === 'string' && parsed.sessionId.trim()
      ? parsed.sessionId.trim()
      : fallbackSessionId;
    const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
    const entries = [];

    for (const message of messages) {
      const entry = parseGeminiMessageObject(message);
      if (entry) entries.push(entry);
    }

    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      sessionId,
      entries,
      lastRecordedAt: entries[entries.length - 1]?.timestamp || null,
    };
  } catch {
    return empty;
  }
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

export function findGeminiConversationFile(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId.trim()) return null;
  const normalized = sessionId.trim();

  const files = listGeminiConversationFiles();
  for (const filePath of files) {
    const parsed = parseGeminiConversationFile(filePath);
    if (parsed.sessionId === normalized) return filePath;
  }

  return null;
}

// --- Codex parsers ---

function parseCodexUsageObject(usage, previousTotals = null) {
  if (!usage || typeof usage !== 'object') return null;

  // OpenAI API: input_tokens INCLUDES cached_input_tokens (overlap)
  // OpenAI API: output_tokens INCLUDES reasoning_output_tokens (subset, not additive)
  const inputTokens = toNonNegativeInt(usage.input_tokens);
  const cachedInputTokens = toNonNegativeInt(usage.cached_input_tokens);
  const outputTokens = toNonNegativeInt(usage.output_tokens);

  if (!previousTotals) {
    return {
      input_tokens: Math.max(0, inputTokens - cachedInputTokens),
      output_tokens: outputTokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: cachedInputTokens,
    };
  }

  const prevInputTokens = toNonNegativeInt(previousTotals.input_tokens);
  const prevCachedInputTokens = toNonNegativeInt(previousTotals.cached_input_tokens);
  const prevOutputTokens = toNonNegativeInt(previousTotals.output_tokens);

  return {
    input_tokens: Math.max(0, (inputTokens - cachedInputTokens) - (prevInputTokens - prevCachedInputTokens)),
    output_tokens: Math.max(0, outputTokens - prevOutputTokens),
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: Math.max(0, cachedInputTokens - prevCachedInputTokens),
  };
}

function extractCodexSessionId(filePath) {
  const match = basename(filePath).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
  return match ? match[1] : null;
}

export function parseCodexSessionContent(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const entries = [];

  let sessionCwd = '';
  let currentTurnModel = '';
  let currentTurnCwd = '';
  let currentTurnId = null;
  let lastTurnId = null;
  let lastRecordedAt = null;
  let previousTotalUsage = null;
  let lastTokenUsageKey = null; // dedup key for identical token_count events

  for (const line of lines) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== 'object') continue;
    const payload = parsed.payload && typeof parsed.payload === 'object' ? parsed.payload : {};
    const timestamp = toIsoTimestamp(parsed.timestamp);

    if (parsed.type === 'session_meta' && typeof payload.cwd === 'string' && payload.cwd.trim()) {
      sessionCwd = payload.cwd;
      continue;
    }

    if (parsed.type === 'turn_context') {
      currentTurnId = typeof payload.turn_id === 'string' && payload.turn_id.trim()
        ? payload.turn_id.trim()
        : null;
      currentTurnModel = typeof payload.model === 'string' ? payload.model.trim() : '';
      currentTurnCwd = typeof payload.cwd === 'string' && payload.cwd.trim()
        ? payload.cwd
        : sessionCwd;
      continue;
    }

    if (parsed.type !== 'event_msg' || payload.type !== 'token_count' || !currentTurnModel) {
      continue;
    }

    const info = payload.info && typeof payload.info === 'object' ? payload.info : {};
    const lastTokenUsage = info.last_token_usage && typeof info.last_token_usage === 'object'
      ? info.last_token_usage
      : null;
    const totalTokenUsage = info.total_token_usage && typeof info.total_token_usage === 'object'
      ? info.total_token_usage
      : null;
    // Dedup: skip identical last_token_usage (retransmitted events)
    const usageSource = lastTokenUsage || totalTokenUsage;
    const tokenUsageKey = usageSource ? JSON.stringify(usageSource) : null;
    if (tokenUsageKey && tokenUsageKey === lastTokenUsageKey) {
      continue;
    }
    lastTokenUsageKey = tokenUsageKey;

    const usage = lastTokenUsage
      ? parseCodexUsageObject(lastTokenUsage)
      : parseCodexUsageObject(totalTokenUsage, previousTotalUsage);

    if (totalTokenUsage) {
      previousTotalUsage = totalTokenUsage;
    }

    if (!usage) continue;

    const inputTokens = toNonNegativeInt(usage.input_tokens);
    const outputTokens = toNonNegativeInt(usage.output_tokens);
    const cacheReadTokens = toNonNegativeInt(usage.cache_read_input_tokens);
    const cacheCreationTokens = toNonNegativeInt(usage.cache_creation_input_tokens);

    if (inputTokens === 0 && outputTokens === 0 && cacheReadTokens === 0 && cacheCreationTokens === 0) {
      continue;
    }

    entries.push({
      model: currentTurnModel,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: cacheCreationTokens,
        cache_read_input_tokens: cacheReadTokens,
      },
      timestamp,
      ...(currentTurnId ? { turnId: currentTurnId } : {}),
    });

    lastTurnId = currentTurnId || lastTurnId;
    lastRecordedAt = timestamp;
    // Keep currentTurnModel — Codex emits multiple token_count events per turn
    // for each agent step/tool call. Only reset on new turn_context.
    currentTurnId = null;
  }

  const projectRoot = currentTurnCwd || sessionCwd;
  const projectName = 'projects';

  return {
    entries,
    projectName,
    cwd: projectRoot,
    lastTurnId,
    lastRecordedAt,
  };
}

function listCodexSessionFiles(dirPath = CODEX_SESSIONS_DIR, results = []) {
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
      listCodexSessionFiles(fullPath, results);
      continue;
    }

    if (dirent.isFile() && dirent.name.endsWith('.jsonl')) {
      results.push(fullPath);
    }
  }

  return results;
}

export function findCodexSessionFile(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId.trim()) return null;
  const normalized = sessionId.trim();
  const files = listCodexSessionFiles();
  const match = files.find(filePath => filePath.endsWith(`${normalized}.jsonl`));
  return match || null;
}

export function parseCodexSessionFile(filePath) {
  if (!existsSync(filePath)) {
    return {
      sessionId: extractCodexSessionId(filePath),
      entries: [],
      projectName: 'codex',
      cwd: '',
      lastTurnId: null,
      lastRecordedAt: null,
    };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = parseCodexSessionContent(content);
    return {
      sessionId: extractCodexSessionId(filePath),
      ...parsed,
    };
  } catch {
    return {
      sessionId: extractCodexSessionId(filePath),
      entries: [],
      projectName: 'codex',
      cwd: '',
      lastTurnId: null,
      lastRecordedAt: null,
    };
  }
}

export function parseCodexSession(sessionId) {
  const filePath = findCodexSessionFile(sessionId);
  if (!filePath) return null;
  return {
    filePath,
    ...parseCodexSessionFile(filePath),
  };
}

// --- Dispatch ---

export function parseJsonlFile(filePath) {
  if (filePath.endsWith('.jsonl')) return parseClaudeJsonlFile(filePath);
  if (filePath.endsWith('.json')) return parseOpenCodeMessageFile(filePath);
  return [];
}

// --- Aggregation ---

export function aggregateByModel(entries) {
  const byModel = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry.model !== 'string' || entry.model === '') continue;

    const usage = entry.usage;
    if (!usage) continue;

    const inputTokens = toNonNegativeInt(usage.input_tokens);
    const outputTokens = toNonNegativeInt(usage.output_tokens);
    const cacheCreationTokens = toNonNegativeInt(usage.cache_creation_input_tokens);
    const cacheReadTokens = toNonNegativeInt(usage.cache_read_input_tokens);
    const timestamp = toIsoTimestamp(entry.timestamp);

    if (inputTokens === 0 && outputTokens === 0 && cacheCreationTokens === 0 && cacheReadTokens === 0) {
      continue;
    }

    const existing = byModel.get(entry.model);
    if (existing) {
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.cacheCreationTokens += cacheCreationTokens;
      existing.cacheReadTokens += cacheReadTokens;
      if (timestamp > existing.recordedAt) {
        existing.recordedAt = timestamp;
      }
    } else {
      byModel.set(entry.model, {
        model: entry.model,
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
        costUsd: 0,
        projectName: '',
        recordedAt: timestamp,
      });
    }
  }

  for (const record of byModel.values()) {
    record.costUsd = estimateCost(
      record.model, record.inputTokens, record.outputTokens,
      record.cacheCreationTokens, record.cacheReadTokens
    );
  }

  return Array.from(byModel.values());
}
