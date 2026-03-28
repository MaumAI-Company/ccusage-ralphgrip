import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_PATH = join(homedir(), '.ccusage-worv.json');
export const SENT_PATH = join(homedir(), '.ccusage-worv-sent.json');
export const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
export const CLAUDE_CREDENTIALS_PATH = join(homedir(), '.claude', '.credentials.json');
export const GEMINI_DIR = join(homedir(), '.gemini');
export const GEMINI_SETTINGS_PATH = join(GEMINI_DIR, 'settings.json');
export const GEMINI_TMP_DIR = join(GEMINI_DIR, 'tmp');

const DATA_HOME = process.env.XDG_DATA_HOME && process.env.XDG_DATA_HOME.trim()
  ? process.env.XDG_DATA_HOME
  : join(homedir(), '.local', 'share');
export const OPENCODE_STORAGE_DIR = join(DATA_HOME, 'opencode', 'storage');
export const OPENCODE_MESSAGES_DIR = join(OPENCODE_STORAGE_DIR, 'message');
export const OPENCODE_SESSIONS_DIR = join(OPENCODE_STORAGE_DIR, 'session');
export const CODEX_SESSIONS_DIR = join(homedir(), '.codex', 'sessions');
export const HEARTBEAT_MARKER_PATH = join(homedir(), '.ccusage-worv-heartbeat');
