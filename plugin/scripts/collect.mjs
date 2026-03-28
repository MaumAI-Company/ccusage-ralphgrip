#!/usr/bin/env node

/**
 * ccusage-worv SessionEnd hook handler
 *
 * Reads stdin from Claude Code, then spawns a detached background process
 * to do the actual work (parsing, network I/O, reporting). The hook itself
 * exits in milliseconds so it never hits the SessionEnd timeout cap.
 */

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 200);
  });
}

const raw = await readStdin();
if (!raw.trim()) process.exit(0);

// Write payload to temp file so the background worker can read it
const payloadDir = join(tmpdir(), 'ccusage-worv');
mkdirSync(payloadDir, { recursive: true });
const payloadPath = join(payloadDir, `payload-${Date.now()}-${process.pid}.json`);
writeFileSync(payloadPath, raw);

// Spawn detached worker — survives after this process (and Claude Code) exits
const workerPath = join(fileURLToPath(import.meta.url), '..', 'collect-worker.mjs');
const child = spawn('node', [workerPath, payloadPath], {
  detached: true,
  stdio: 'ignore',
});
child.unref();
