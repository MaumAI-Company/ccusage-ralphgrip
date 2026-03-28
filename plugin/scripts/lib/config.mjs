import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_PATH, SENT_PATH } from './paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_JSON_PATH = join(__dirname, '..', '..', '.claude-plugin', 'plugin.json');

let _pluginVersion = null;

export function getPluginVersion() {
  if (_pluginVersion) return _pluginVersion;
  try {
    const pluginJson = JSON.parse(readFileSync(PLUGIN_JSON_PATH, 'utf-8'));
    _pluginVersion = pluginJson.version || 'unknown';
  } catch {
    _pluginVersion = 'unknown';
  }
  return _pluginVersion;
}

/**
 * Allowed characters in member names: Latin letters, Korean (syllables + jamo),
 * digits, spaces, hyphens, periods, apostrophes.
 */
const NAME_ALLOWED_RE = /^[a-zA-Z\u3131-\u3163\uac00-\ud7a3\uD55C0-9 \-.']+$/;

/** Validate memberName and warn to stderr if it contains disallowed characters. */
export function validateMemberName(name) {
  if (typeof name !== 'string' || name.length === 0) return;
  if (!NAME_ALLOWED_RE.test(name)) {
    process.stderr.write(
      `[ccusage-ralphgrip] Warning: memberName "${name}" contains disallowed characters. ` +
      'Only Latin/Korean letters, digits, spaces, hyphens, periods, and apostrophes are allowed.\n',
    );
  }
}

/**
 * Config schema (~/.ccusage-ralphgrip.json):
 *   memberName   - team member display name
 *   serverUrl    - dashboard server URL
 *   apiKey?      - legacy API key (backward compat)
 *   accessToken? - OAuth2 access token (preferred over apiKey)
 *   refreshToken? - OAuth2 refresh token
 *   tokenExpiresAt? - ISO timestamp when accessToken expires
 */
export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  if (config?.memberName) validateMemberName(config.memberName);
  return config;
}

export function loadSentSessions() {
  if (!existsSync(SENT_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SENT_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveSentSessions(sent) {
  writeFileSync(SENT_PATH, JSON.stringify(sent, null, 2));
}

export function getSentSessionKey(source, sessionId) {
  if (source === 'opencode') return `opencode:${sessionId}`;
  if (source === 'codex') return `codex:${sessionId}`;
  if (source === 'gemini') return `gemini:${sessionId}`;
  return sessionId;
}

export function isSessionSent(sentSessions, source, sessionId) {
  if (!sentSessions || typeof sentSessions !== 'object') return false;

  const key = getSentSessionKey(source, sessionId);
  if (sentSessions[key]) return true;

  // backward compatibility for previously saved raw OpenCode session keys
  if (source === 'opencode' && sentSessions[sessionId]) return true;

  return false;
}

export function markSessionSent(sentSessions, source, sessionId, value) {
  sentSessions[getSentSessionKey(source, sessionId)] = value;
}
