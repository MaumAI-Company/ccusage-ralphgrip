#!/usr/bin/env node

/**
 * ccusage-worv heartbeat — Stop hook entry point
 *
 * Fires on every assistant turn end. Checks a marker file mtime to throttle
 * utilization reports to once per 5 minutes. If throttled, exits immediately
 * (<10 ms). Otherwise spawns a detached heartbeat-worker.mjs.
 */

import { statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEARTBEAT_MARKER_PATH } from './lib/paths.mjs';

const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

// Fast-path: check throttle via marker file mtime
try {
  const stat = statSync(HEARTBEAT_MARKER_PATH);
  if (Date.now() - stat.mtimeMs < THROTTLE_MS) {
    process.exit(0);
  }
} catch {
  // File doesn't exist — first run, proceed
}

// Spawn detached worker
const __dirname = dirname(fileURLToPath(import.meta.url));
const worker = spawn(
  process.execPath,
  [join(__dirname, 'heartbeat-worker.mjs')],
  { detached: true, stdio: 'ignore' },
);
worker.unref();
