#!/usr/bin/env node

/**
 * ccusage-worv heartbeat background worker
 *
 * Spawned by heartbeat.mjs as a detached process.
 * Fetches current utilization from Anthropic API and sends to the
 * /api/utilization endpoint. Touches the marker file on success so
 * subsequent Stop hooks are throttled.
 */

import { writeFileSync } from 'node:fs';
import { loadConfig, getPluginVersion } from './lib/config.mjs';
import { fetchUtilization } from './lib/utilization.mjs';
import { getValidToken } from './lib/auth.mjs';
import { HEARTBEAT_MARKER_PATH } from './lib/paths.mjs';

async function main() {
  const config = loadConfig();
  if (!config?.serverUrl) process.exit(0);

  const utilization = await fetchUtilization();
  if (!utilization || (utilization.fiveHour === null && utilization.sevenDay === null)) {
    process.exit(0);
  }

  const headers = { 'Content-Type': 'application/json' };
  let token;
  try {
    if (typeof config === 'object') {
      token = await getValidToken(config);
    }
  } catch {
    // Auth failure — skip this heartbeat
    process.exit(0);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = {
    ...(config.memberName ? { memberName: config.memberName } : {}),
    utilization,
    pluginVersion: getPluginVersion(),
  };

  const response = await fetch(`${config.serverUrl}/api/utilization`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (response.ok) {
    // Touch marker file — next Stop hooks will be throttled
    writeFileSync(HEARTBEAT_MARKER_PATH, '');
  }
}

main().catch(() => {});
