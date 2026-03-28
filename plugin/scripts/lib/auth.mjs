import { readFileSync, writeFileSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import { CONFIG_PATH } from './paths.mjs';
import { loadConfig } from './config.mjs';

/**
 * Save OAuth tokens to the config file.
 * Merges with existing config to preserve other fields.
 */
export function saveTokens(accessToken, refreshToken, expiresIn) {
  const config = loadConfig() || {};
  config.accessToken = accessToken;
  config.refreshToken = refreshToken;
  config.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Refresh the access token using the refresh token.
 * Returns { accessToken, expiresIn } or throws on failure.
 */
export async function refreshAccessToken(serverUrl, refreshToken) {
  const response = await fetch(`${serverUrl}/api/auth/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (response.status === 401) {
    throw new Error('Refresh token expired. Please run the authenticate command again.');
  }

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Get a valid access token, refreshing if needed.
 * Returns the access token string, or null if no tokens are configured.
 * Falls back to apiKey for backward compatibility.
 */
export async function getValidToken(config) {
  if (!config) return null;

  // If we have OAuth tokens, use them
  if (config.accessToken && config.refreshToken) {
    // Check if token is still valid (with 60s buffer)
    if (config.tokenExpiresAt) {
      const expiresAt = new Date(config.tokenExpiresAt).getTime();
      if (Date.now() < expiresAt - 60_000) {
        return config.accessToken;
      }
    }

    // Token expired or no expiry info — try refresh
    try {
      const result = await refreshAccessToken(config.serverUrl, config.refreshToken);
      saveTokens(result.accessToken, config.refreshToken, result.expiresIn);
      return result.accessToken;
    } catch (err) {
      if (err.message.includes('expired')) {
        throw err; // re-throw auth errors
      }
      // For network errors, try the existing token anyway
      return config.accessToken;
    }
  }

  // Legacy: use apiKey if no OAuth tokens
  return config.apiKey || null;
}

/**
 * Open a URL in the system default browser.
 * Best-effort — silently fails if no browser is available.
 */
export function openBrowser(url) {
  const platform = process.platform;
  try {
    // Use execFileSync to avoid shell injection — URL is passed as argument, not shell-interpolated
    if (platform === 'darwin') {
      execFileSync('open', [url], { stdio: 'ignore' });
    } else if (platform === 'win32') {
      execFileSync('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
    } else {
      execFileSync('xdg-open', [url], { stdio: 'ignore' });
    }
  } catch {
    // Browser open is best-effort
  }
}
