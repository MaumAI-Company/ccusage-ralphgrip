#!/usr/bin/env node

/**
 * ccusage-worv 설치 스크립트
 *
 * 사용법: npx ccusage-worv "이름"
 *
 * 1. plugin/ 디렉토리를 ~/.claude/plugins/cache/ 에 복사
 * 2. installed_plugins.json 등록
 * 3. init.mjs 실행 (설정 저장 + Claude/OpenCode/Codex/Gemini CLI 연동 + backfill)
 */

import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

// Inline locale detection — the full i18n module is in plugin/ which may not exist yet
const _isKo = (process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || '').toLowerCase().startsWith('ko');
function t(key) {
  return (_isKo ? _ko : _en)[key] || key;
}
const _en = {
  'install.title': 'ccusage-worv - Claude/OpenCode/Codex/Gemini CLI usage collection plugin',
  'install.usage': 'Usage:',
  'install.usageCmd': '  npx ccusage-worv "name"',
  'install.example': 'Example:',
  'install.exampleCmd': '  npx ccusage-worv "John"',
  'install.starting': 'ccusage-worv installation starting...',
  'install.filesDone': '✓ Plugin files installed:',
  'install.registryDone': '✓ installed_plugins.json registered',
  'install.initError': '⚠ init error:',
  'install.complete': 'Installation complete! Restart Claude Code / OpenCode / Codex CLI / Gemini CLI.',
};
const _ko = {
  'install.title': 'ccusage-worv - Claude/OpenCode/Codex/Gemini CLI 사용량 수집 플러그인',
  'install.usage': '사용법:',
  'install.usageCmd': '  npx ccusage-worv "이름"',
  'install.example': '예시:',
  'install.exampleCmd': '  npx ccusage-worv "홍길동"',
  'install.starting': 'ccusage-worv 설치 시작...',
  'install.filesDone': '✓ 플러그인 파일 설치:',
  'install.registryDone': '✓ installed_plugins.json 등록 완료',
  'install.initError': '⚠ init 실행 중 오류:',
  'install.complete': '설치 완료! Claude Code / OpenCode / Codex CLI / Gemini CLI를 재시작하세요.',
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
// prepack copies plugin/ into the npm package; fall back to repo root for local dev
const PLUGIN_SOURCE = existsSync(join(PACKAGE_ROOT, 'plugin'))
  ? join(PACKAGE_ROOT, 'plugin')
  : join(PACKAGE_ROOT, '..', '..', 'plugin');

const VERSION = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')).version;
const PLUGIN_DIR = join(homedir(), '.claude', 'plugins', 'ccusage-worv', VERSION);
const INSTALLED_PATH = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
const PLUGIN_KEY = 'ccusage-worv@worv';

const memberName = process.argv[2];

if (!memberName || memberName === '--help' || memberName === '-h') {
  console.log('');
  console.log(t('install.title'));
  console.log('');
  console.log(t('install.usage'));
  console.log(t('install.usageCmd'));
  console.log('');
  console.log(t('install.example'));
  console.log(t('install.exampleCmd'));
  console.log('');
  process.exit(memberName ? 0 : 1);
}

console.log('');
console.log(t('install.starting'));
console.log('');

// --- Step 0: 기존 버전 및 marketplace 캐시 제거 ---

try {
  // Remove old marketplace cache entirely
  const oldCachePath = join(homedir(), '.claude', 'plugins', 'cache', 'worv');
  if (existsSync(oldCachePath)) {
    rmSync(oldCachePath, { recursive: true, force: true });
    console.log(`✓ Removed old marketplace cache: ${oldCachePath}`);
  }
  // Old versions under ~/.claude/plugins/ccusage-worv/<version>/ are NOT deleted
  // here — a running session may still reference the old CLAUDE_PLUGIN_ROOT.
  // Cleanup happens on the next SessionStart via catchup.mjs instead.
} catch {}

// --- Step 1: 플러그인 파일 복사 ---

mkdirSync(dirname(PLUGIN_DIR), { recursive: true });
cpSync(PLUGIN_SOURCE, PLUGIN_DIR, { recursive: true });
console.log(t('install.filesDone'), PLUGIN_DIR);

// --- Step 2: installed_plugins.json 등록 ---

const pluginsDir = join(homedir(), '.claude', 'plugins');
mkdirSync(pluginsDir, { recursive: true });

let installed = { version: 2, plugins: {} };
if (existsSync(INSTALLED_PATH)) {
  try { installed = JSON.parse(readFileSync(INSTALLED_PATH, 'utf-8')); } catch {}
}
if (!installed.plugins) installed.plugins = {};

// Remove all stale ccusage-worv entries (old path keys and marketplace keys)
for (const key of Object.keys(installed.plugins)) {
  if (key.includes('ccusage-worv')) {
    delete installed.plugins[key];
  }
}

installed.plugins[PLUGIN_KEY] = [{
  scope: 'user',
  installPath: PLUGIN_DIR,
  version: VERSION,
  installedAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
}];

writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2));
console.log(t('install.registryDone'));

// --- Step 2b: extraKnownMarketplaces 등록 ---

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
try {
  let settings = {};
  if (existsSync(SETTINGS_PATH)) {
    settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  }
  if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};
  settings.extraKnownMarketplaces.worv = { source: { source: 'path', path: PLUGIN_DIR } };
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
  console.log('✓ Marketplace registered in settings');
} catch {}

// --- Step 3: init 실행 (설정 저장 + 플러그인 활성화 + backfill) ---

console.log('');

try {
  execFileSync('node', [join(PLUGIN_DIR, 'scripts', 'init.mjs'), memberName], {
    stdio: 'inherit',
  });
} catch (err) {
  console.error(t('install.initError'), err.message);
  process.exit(1);
}

console.log('');
console.log('==========================================');
console.log(t('install.complete'));
console.log('==========================================');
