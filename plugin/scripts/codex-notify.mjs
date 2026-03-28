#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCodexCatchup } from './catchup.mjs';

const execFileAsync = promisify(execFile);
const STATE_PATH = join(homedir(), '.codex', 'ccusage-ralphgrip-notify.json');
const SELF_PATH = fileURLToPath(import.meta.url);
const CHILD_ENV_FLAG = 'CCW_CODEX_NOTIFY_CHILD';
const SYNC_MAX_ATTEMPTS = 20;
const SYNC_RETRY_DELAY_MS = 1000;

function getRawPayload() {
  const raw = process.argv[process.argv.length - 1];
  if (!raw || raw.startsWith('-')) return null;
  return raw;
}

function readForwardNotifyCommand() {
  if (!existsSync(STATE_PATH)) return null;

  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
    return Array.isArray(parsed.forwardCommand) ? parsed.forwardCommand : null;
  } catch {
    return null;
  }
}

async function forwardNotify(rawPayload) {
  const forwardCommand = readForwardNotifyCommand();
  if (!forwardCommand || forwardCommand.length === 0) return;

  const [command, ...args] = forwardCommand;
  if (!command) return;

  try {
    await execFileAsync(command, [...args, rawPayload], {
      windowsHide: true,
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      env: process.env,
    });
  } catch {
    // Ignore notify forwarding failures so Codex turns keep flowing.
  }
}

async function syncCodexSession(rawPayload) {
  let parsed;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    return;
  }

  const sessionId = parsed['thread-id'] || parsed.thread_id || parsed.threadId || null;
  if (!sessionId) return;

  for (let attempt = 0; attempt < SYNC_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await runCodexCatchup(undefined, { threadId: sessionId });
      if (result.total > 0) return;
    } catch {
      // Keep retrying within the short session-flush window.
    }

    if (attempt < SYNC_MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, SYNC_RETRY_DELAY_MS));
    }
  }
}

async function main() {
  const rawPayload = getRawPayload();
  if (!rawPayload) return;

  if (process.env[CHILD_ENV_FLAG] !== '1') {
    const child = spawn(process.execPath, [SELF_PATH, rawPayload], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        [CHILD_ENV_FLAG]: '1',
      },
    });
    child.unref();
    return;
  }

  await Promise.allSettled([
    forwardNotify(rawPayload),
    syncCodexSession(rawPayload),
  ]);
}

await main();
