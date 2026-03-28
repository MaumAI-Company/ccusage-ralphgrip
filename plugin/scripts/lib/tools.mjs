import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Parse tool usage from JSONL content string.
 * @param {string} content - raw JSONL content
 * @returns {{ toolName: string, callCount: number, acceptCount: number, rejectCount: number }[]}
 */
export function parseToolUsageFromContent(content) {
  const toolUseMap = new Map(); // id -> toolName
  const stats = new Map(); // toolName -> { callCount, acceptCount, rejectCount }

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);

      // Extract tool_use from assistant messages
      if (parsed.type === 'assistant' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'tool_use' && block.name && block.id) {
            toolUseMap.set(block.id, block.name);
          }
        }
      }

      // Extract tool_result from user messages
      if (parsed.type === 'user' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'tool_result' && block.tool_use_id) {
            const toolName = toolUseMap.get(block.tool_use_id);
            if (!toolName) continue;

            const isError = block.is_error === true;
            const isInterrupted = parsed.toolUseResult?.interrupted === true;
            const isReject = isError || isInterrupted;

            if (!stats.has(toolName)) {
              stats.set(toolName, { callCount: 0, acceptCount: 0, rejectCount: 0 });
            }
            const s = stats.get(toolName);
            s.callCount++;
            if (isReject) {
              s.rejectCount++;
            } else {
              s.acceptCount++;
            }
          }
        }
      }
    } catch { /* skip unparseable lines */ }
  }

  return Array.from(stats.entries()).map(([toolName, s]) => ({
    toolName,
    callCount: s.callCount,
    acceptCount: s.acceptCount,
    rejectCount: s.rejectCount,
  }));
}

/**
 * Parse tool usage from a JSONL file path, including subagent files.
 * Follows the same subagent discovery pattern as parseClaudeJsonlFile in transcripts.mjs.
 * @param {string} filePath - path to the main JSONL file
 * @returns {{ toolName: string, callCount: number, acceptCount: number, rejectCount: number }[]}
 */
export function parseToolUsage(filePath) {
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

  // Aggregate tool usage across all files
  const merged = new Map(); // toolName -> { callCount, acceptCount, rejectCount }

  for (const p of paths) {
    try {
      const content = readFileSync(p, 'utf-8');
      const results = parseToolUsageFromContent(content);
      for (const { toolName, callCount, acceptCount, rejectCount } of results) {
        if (!merged.has(toolName)) {
          merged.set(toolName, { callCount: 0, acceptCount: 0, rejectCount: 0 });
        }
        const m = merged.get(toolName);
        m.callCount += callCount;
        m.acceptCount += acceptCount;
        m.rejectCount += rejectCount;
      }
    } catch {
      // ignore unreadable files
    }
  }

  return Array.from(merged.entries()).map(([toolName, s]) => ({
    toolName,
    callCount: s.callCount,
    acceptCount: s.acceptCount,
    rejectCount: s.rejectCount,
  }));
}

/**
 * Count turns (assistant messages) from JSONL content string.
 * @param {string} content - raw JSONL content
 * @returns {number}
 */
export function countTurnsFromContent(content) {
  let count = 0;
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'assistant') {
        count++;
      }
    } catch { /* skip unparseable lines */ }
  }
  return count;
}

/**
 * Count turns from file path including subagent files.
 * @param {string} filePath - path to the main JSONL file
 * @returns {number}
 */
export function countTurns(filePath) {
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

  let total = 0;
  for (const p of paths) {
    try {
      const content = readFileSync(p, 'utf-8');
      total += countTurnsFromContent(content);
    } catch {
      // ignore unreadable files
    }
  }
  return total;
}
