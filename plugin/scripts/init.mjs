#!/usr/bin/env node

/**
 * ccusage-worv 초기 설정 스크립트
 *
 * 사용법: node init.mjs [serverUrl]
 *
 * 7단계 수행:
 * 1. ~/.ccusage-worv.json에 설정 저장
 * 2. ~/.claude/settings.json의 enabledPlugins에 플러그인 등록
 * 3. ~/.config/opencode/plugins/ccusage-worv.mjs 설치
 * 4. ~/.gemini/settings.json의 SessionEnd hook 연결
 * 5. ~/.codex/config.toml의 user-level notify hook 연결
 * 6. 과거 전체 미전송 세션 backfill
 * 7. Google OAuth 인증 (선택)
 */

import { copyFileSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_PATH } from './lib/common.mjs';
import { t } from './lib/i18n.mjs';
import { runCatchup } from './catchup.mjs';
import { extractTopLevelNotifyCommand, updateTopLevelNotifyCommand } from './lib/codex-config.mjs';
import { updateGeminiSettings, hasGeminiSessionEndHook } from './lib/gemini-config.mjs';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
const GEMINI_SETTINGS_PATH = join(homedir(), '.gemini', 'settings.json');
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = dirname(SCRIPT_DIR);

const PLUGIN_KEY = 'ccusage-worv@worv';
const DEFAULT_MARKETPLACE_URL = 'https://github.com/MaumAI-Company/ccusage-worv.git';
const OPENCODE_PLUGIN_SOURCE = join(SCRIPT_DIR, 'opencode-plugin.mjs');
const OPENCODE_PLUGIN_PATH = join(homedir(), '.config', 'opencode', 'plugins', 'ccusage-worv.mjs');
const GEMINI_COLLECT_SOURCE = join(SCRIPT_DIR, 'collect.mjs');
const CODEX_NOTIFY_SOURCE = join(SCRIPT_DIR, 'codex-notify.mjs');
const CODEX_CONFIG_PATH = join(homedir(), '.codex', 'config.toml');
const CODEX_NOTIFY_STATE_PATH = join(homedir(), '.codex', 'ccusage-worv-notify.json');

// Parse args: positional args + --marketplace-url flag
let memberName = '';
let serverUrl = 'https://ccusage.worvgrip.com';
let marketplaceUrl = DEFAULT_MARKETPLACE_URL;
const positional = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--marketplace-url' && process.argv[i + 1]) {
    marketplaceUrl = process.argv[++i];
  } else if (!process.argv[i].startsWith('--')) {
    positional.push(process.argv[i]);
  }
}
if (positional[0]) memberName = positional[0];
if (positional[1]) serverUrl = positional[1];

// Load existing config to preserve fields (e.g. tokens) during re-init
let existingConfig = {};
try {
  if (existsSync(CONFIG_PATH)) {
    existingConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  }
} catch {}

const config = {
  ...existingConfig,
  ...(memberName ? { memberName: memberName.trim() } : {}),
  serverUrl: serverUrl.trim(),
};

writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log(t('init.configSaved', { path: CONFIG_PATH }));
if (config.memberName) {
  console.log(t('init.configName', { name: config.memberName }));
}
console.log(t('init.configServer', { url: config.serverUrl }));

function commandsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function buildGeminiHookCommand(scriptPath) {
  return `node ${JSON.stringify(scriptPath)}`;
}

// Clean up old plugin versions (keep only current version)
try {
  const cacheParent = join(homedir(), '.claude', 'plugins', 'cache', 'worv', 'ccusage-worv');
  if (existsSync(cacheParent)) {
    for (const entry of readdirSync(cacheParent, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const entryPath = join(cacheParent, entry.name);
        if (entryPath !== PLUGIN_ROOT) {
          rmSync(entryPath, { recursive: true, force: true });
          console.log(t('init.marketplaceCacheCleaned', { path: entryPath }));
        }
      }
    }
  }
} catch {}

try {
  let settings = {};

  if (existsSync(SETTINGS_PATH)) {
    settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } else {
    mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  }

  if (!settings.enabledPlugins) {
    settings.enabledPlugins = {};
  }

  // Remove stale path-based keys pointing to other ccusage-worv versions
  let changed = false;
  for (const key of Object.keys(settings.enabledPlugins)) {
    if (key !== PLUGIN_KEY && key.includes('ccusage-worv')) {
      delete settings.enabledPlugins[key];
      changed = true;
    }
  }

  if (settings.enabledPlugins[PLUGIN_KEY] === true) {
    console.log(t('init.pluginAlreadyEnabled', { key: PLUGIN_KEY }));
  } else {
    settings.enabledPlugins[PLUGIN_KEY] = true;
    changed = true;
    console.log(t('init.pluginEnabled', { key: PLUGIN_KEY }));
  }

  // Register marketplace so Claude Code can discover and update the plugin
  if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};
  const currentSource = settings.extraKnownMarketplaces.worv?.source?.url;
  if (currentSource !== marketplaceUrl) {
    settings.extraKnownMarketplaces.worv = { source: { source: 'git', url: marketplaceUrl } };
    changed = true;
    console.log(t('init.marketplaceRegistered', { url: marketplaceUrl }));
  }

  if (changed) {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
  }

  // Enable auto-update in known_marketplaces.json so Claude Code pulls new versions on startup
  const knownPath = join(homedir(), '.claude', 'plugins', 'known_marketplaces.json');
  try {
    let known = {};
    if (existsSync(knownPath)) {
      known = JSON.parse(readFileSync(knownPath, 'utf-8'));
    }
    if (!known.worv || !known.worv.autoUpdate) {
      if (!known.worv) {
        known.worv = {
          source: { source: 'git', url: marketplaceUrl },
          installLocation: join(homedir(), '.claude', 'plugins', 'marketplaces', 'worv'),
          lastUpdated: new Date().toISOString(),
        };
      }
      known.worv.autoUpdate = true;
      writeFileSync(knownPath, JSON.stringify(known, null, 2));
      console.log(t('init.autoUpdateEnabled'));
    }
  } catch {}
} catch (error) {
  console.error(t('init.pluginEnableFailed', { error: error.message }));
  console.error(t('init.pluginEnableManual'));
  console.error(`  "enabledPlugins": { "${PLUGIN_KEY}": true }`);
}

try {
  mkdirSync(dirname(OPENCODE_PLUGIN_PATH), { recursive: true });
  copyFileSync(OPENCODE_PLUGIN_SOURCE, OPENCODE_PLUGIN_PATH);
  console.log(t('init.opencodeDone', { path: OPENCODE_PLUGIN_PATH }));
} catch (error) {
  console.error(t('init.opencodeFailed', { error: error.message }));
  console.error(t('init.opencodeCopyManual', { source: OPENCODE_PLUGIN_SOURCE }));
  console.error(t('init.opencodeTargetPath', { path: OPENCODE_PLUGIN_PATH }));
}

try {
  const geminiHookCommand = buildGeminiHookCommand(GEMINI_COLLECT_SOURCE);
  let geminiSettings = {};

  if (existsSync(GEMINI_SETTINGS_PATH)) {
    geminiSettings = JSON.parse(readFileSync(GEMINI_SETTINGS_PATH, 'utf-8'));
  } else {
    mkdirSync(dirname(GEMINI_SETTINGS_PATH), { recursive: true });
  }

  const alreadyInstalled = hasGeminiSessionEndHook(geminiSettings, geminiHookCommand);
  const nextGeminiSettings = updateGeminiSettings(geminiSettings, geminiHookCommand);
  const settingsChanged = JSON.stringify(geminiSettings) !== JSON.stringify(nextGeminiSettings);

  if (!settingsChanged && alreadyInstalled) {
    console.log(t('init.geminiAlreadyLinked', { path: GEMINI_SETTINGS_PATH }));
  } else {
    writeFileSync(GEMINI_SETTINGS_PATH, JSON.stringify(nextGeminiSettings, null, 2) + '\n');
    console.log(t('init.geminiLinked', { path: GEMINI_SETTINGS_PATH }));
  }
} catch (error) {
  console.error(t('init.geminiFailed', { error: error.message }));
  console.error(t('init.geminiManual', { path: GEMINI_SETTINGS_PATH }));
  console.error(`  command: ${buildGeminiHookCommand(GEMINI_COLLECT_SOURCE)}`);
}

try {
  const codexNotifyCommand = ['node', CODEX_NOTIFY_SOURCE];
  let codexConfig = '';

  if (existsSync(CODEX_CONFIG_PATH)) {
    codexConfig = readFileSync(CODEX_CONFIG_PATH, 'utf-8');
  } else {
    mkdirSync(dirname(CODEX_CONFIG_PATH), { recursive: true });
  }

  const existingNotify = extractTopLevelNotifyCommand(codexConfig);
  const currentNotifyCommand = Array.isArray(existingNotify.value) ? existingNotify.value : null;

  if (currentNotifyCommand && !commandsEqual(currentNotifyCommand, codexNotifyCommand)) {
    writeFileSync(
      CODEX_NOTIFY_STATE_PATH,
      JSON.stringify({ forwardCommand: currentNotifyCommand }, null, 2) + '\n',
    );
  } else if (!existsSync(CODEX_NOTIFY_STATE_PATH)) {
    writeFileSync(
      CODEX_NOTIFY_STATE_PATH,
      JSON.stringify({ forwardCommand: null }, null, 2) + '\n',
    );
  }

  if (commandsEqual(currentNotifyCommand, codexNotifyCommand)) {
    console.log(t('init.codexAlreadyLinked', { path: CODEX_CONFIG_PATH }));
  } else {
    const updatedConfig = updateTopLevelNotifyCommand(codexConfig, codexNotifyCommand);
    writeFileSync(CODEX_CONFIG_PATH, updatedConfig);
    console.log(t('init.codexLinked', { path: CODEX_CONFIG_PATH }));
  }
} catch (error) {
  console.error(t('init.codexFailed', { error: error.message }));
  console.error(t('init.codexManual', { path: CODEX_CONFIG_PATH }));
  console.error(`  notify = ["node", "${CODEX_NOTIFY_SOURCE}"]`);
}

console.log('');
console.log(t('init.backfillStart'));

try {
  const result = await runCatchup(config, { all: true });
  if (result.total > 0) {
    console.log(t('init.backfillDone', { total: result.total }));
  } else {
    console.log(t('init.backfillEmpty'));
  }
} catch (error) {
  console.error(t('init.backfillFailed', { error: error.message }));
}

// Login flow — run authenticate.mjs interactively (non-blocking: init succeeds even if skipped)
if (!config.accessToken) {
  console.log('');
  console.log(t('init.loginStart'));
  const authResult = spawnSync(process.execPath, [join(SCRIPT_DIR, 'authenticate.mjs')], {
    stdio: 'inherit',
  });
  if (authResult.status !== 0) {
    console.log(t('init.loginSkipped'));
  }
}
