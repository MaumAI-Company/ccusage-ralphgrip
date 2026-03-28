import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { CLAUDE_CREDENTIALS_PATH } from './paths.mjs';

function extractResetTimestamp(window) {
  const value = window?.reset_at ?? window?.resets_at ?? window?.resetAt ?? window?.resetsAt ?? null;
  return typeof value === 'string' ? value : null;
}

export function normalizeUtilizationResponse(data) {
  return {
    fiveHour: typeof data?.five_hour?.utilization === 'number' ? data.five_hour.utilization : null,
    sevenDay: typeof data?.seven_day?.utilization === 'number' ? data.seven_day.utilization : null,
    fiveHourResetsAt: extractResetTimestamp(data?.five_hour),
    sevenDayResetsAt: extractResetTimestamp(data?.seven_day),
  };
}

export function loadClaudeAccessToken() {
  let accessToken = null;

  if (existsSync(CLAUDE_CREDENTIALS_PATH)) {
    try {
      const creds = JSON.parse(readFileSync(CLAUDE_CREDENTIALS_PATH, 'utf-8'));
      accessToken = creds?.claudeAiOauth?.accessToken;
    } catch {
      // ignore malformed credentials
    }
  }

  if (!accessToken && process.platform === 'darwin') {
    try {
      const raw = execSync(
        '/usr/bin/security find-generic-password -s "Claude Code-credentials" -w',
        { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        accessToken = parsed?.claudeAiOauth?.accessToken || parsed?.accessToken;
      }
    } catch {
      // ignore keychain failures
    }
  }

  return accessToken;
}

export async function fetchUtilization() {
  try {
    const accessToken = loadClaudeAccessToken();
    if (!accessToken) {
      console.error('[ccusage-worv] utilization: no OAuth token found (credentials file and keychain both empty)');
      return null;
    }

    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`[ccusage-worv] utilization: API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = normalizeUtilizationResponse(data);

    if (result.fiveHour === null && result.sevenDay === null) {
      console.error('[ccusage-worv] utilization: API returned no usable data (response keys: ' + Object.keys(data || {}).join(', ') + ')');
    }

    return result;
  } catch (err) {
    console.error(`[ccusage-worv] utilization: fetch failed — ${err.message}`);
    return null;
  }
}
