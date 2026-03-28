import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getPluginVersion } from './config.mjs';

const CACHE_DIR = join(homedir(), '.ccusage-worv-cache');
const CACHE_FILE = join(CACHE_DIR, 'version-check.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function readCache() {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Best-effort
  }
}

/**
 * Check for plugin updates. Uses a 24h file cache.
 * - If no update available, caches for 24h (skip next check).
 * - If update IS available, caches the result but still re-checks next time
 *   (in case user updated in the meantime).
 * Returns { hasUpdate, latestVersion, currentVersion } or null if check was skipped/failed.
 */
export async function checkForUpdate(serverUrl) {
  const currentVersion = getPluginVersion();
  if (currentVersion === 'unknown') return null;

  const cache = readCache();
  if (cache) {
    const age = Date.now() - (cache.checkedAt || 0);
    // If no update was found last time, skip for 24h
    if (!cache.hasUpdate && age < CACHE_TTL_MS) return null;
    // If update was found, re-check (user might have updated)
    if (cache.hasUpdate && age < CACHE_TTL_MS) {
      // Return cached result without re-fetching
      return { hasUpdate: true, latestVersion: cache.latestVersion, currentVersion };
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${serverUrl}/api/version`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const { latestVersion } = await response.json();
    if (!latestVersion || latestVersion === 'unknown') return null;

    const hasUpdate = latestVersion !== currentVersion;
    writeCache({ checkedAt: Date.now(), latestVersion, hasUpdate });

    if (!hasUpdate) return null;
    return { hasUpdate: true, latestVersion, currentVersion };
  } catch {
    // Network error, timeout, etc. — silently skip
    return null;
  }
}
