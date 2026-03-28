import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type PluginFile = {
  relativePath: string;
  contentBase64: string;
};

const MARKETPLACE_KEY = 'ccusage-ralphgrip@ralphgrip';
const REPO_ROOT_CANDIDATES = [
  join(process.cwd(), 'plugin'),
  join(process.cwd(), '..', '..', 'plugin'),
];

export async function GET() {
  const script = generateInstallScript();
  return new NextResponse(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

function generateInstallScript(): string {
  const pluginRoot = resolvePluginRoot();
  const pluginJson = JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf-8')) as {
    version?: string;
  };
  const pluginVersion = pluginJson.version || '0.1.0';
  const pluginDir = `$HOME/.claude/plugins/ccusage-ralphgrip/${pluginVersion}`;
  const pluginFiles = collectPluginFiles(pluginRoot);

  return [
    '#!/bin/bash',
    '# Wrap in block so bash reads entire script before executing (curl|bash safety)',
    '{',
    'set -e',
    '',
    '# Locale detection',
    'IS_KO=false',
    'case "${LANG:-}${LC_ALL:-}${LANGUAGE:-}" in ko*) IS_KO=true ;; esac',
    '',
    'msg() { if $IS_KO; then echo "$2"; else echo "$1"; fi; }',
    '',
    '# Parse flags',
    'USE_SSH=false',
    'NAME=""',
    'for arg in "$@"; do',
    '  case "$arg" in',
    '    --ssh) USE_SSH=true ;;',
    '    --https) USE_SSH=false ;;',
    '    *) if [ -z "$NAME" ]; then NAME="$arg"; fi ;;',
    '  esac',
    'done',
    '',
    '# Marketplace URL (HTTPS default, --ssh for SSH)',
    'if $USE_SSH; then',
    '  MARKETPLACE_URL="git@github.com:MaumAI-Company/ccusage-ralphgrip.git"',
    'else',
    '  MARKETPLACE_URL="https://github.com/MaumAI-Company/ccusage-ralphgrip.git"',
    'fi',
    '',
    '# If no name given, try to read from existing config (update mode)',
    'if [ -z "$NAME" ]; then',
    '  CONFIG_FILE="$HOME/.ccusage-ralphgrip.json"',
    '  if [ -f "$CONFIG_FILE" ]; then',
    `    NAME=$(node -e "try{const c=JSON.parse(require('fs').readFileSync(process.argv[1],'utf-8'));if(c.memberName)console.log(c.memberName)}catch{}" "$CONFIG_FILE")`,
    '  fi',
    'fi',
    'NO_NAME=false',
    'if [ -z "$NAME" ]; then',
    '  NO_NAME=true',
    '  msg "No member name provided — will use email identity after authentication." "이름이 지정되지 않았습니다 — 인증 후 이메일로 식별합니다."',
    'fi',
    '',
    `PLUGIN_DIR="${pluginDir}"`,
    '',
    'echo ""',
    'msg "ccusage-ralphgrip installation starting..." "ccusage-ralphgrip 설치 시작..."',
    'echo ""',
    '',
    '# --- Remove old marketplace cache and old versions ---',
    'OLD_CACHE="$HOME/.claude/plugins/cache/ralphgrip"',
    'if [ -d "$OLD_CACHE" ]; then',
    '  rm -rf "$OLD_CACHE" && msg "✓ Removed old marketplace cache" "✓ 기존 marketplace 캐시 제거"',
    'fi',
    `CURRENT_VERSION="${pluginVersion}"`,
    'NEW_PARENT="$HOME/.claude/plugins/ccusage-ralphgrip"',
    'if [ -d "$NEW_PARENT" ]; then',
    '  for d in "$NEW_PARENT"/*/; do',
    '    DIR_NAME="$(basename "$d")"',
    '    if [ "$DIR_NAME" != "$CURRENT_VERSION" ]; then',
    '      rm -rf "$d" && msg "✓ Removed old version: $d" "✓ 이전 버전 제거: $d"',
    '    fi',
    '  done',
    'fi',
    '',
    '',
    'write_plugin_file() {',
    '  local relative_path="$1"',
    '  local content_base64="$2"',
    '  local target="$PLUGIN_DIR/$relative_path"',
    '  mkdir -p "$(dirname "$target")"',
    `  node -e "const fs=require('fs');fs.writeFileSync(process.argv[1],Buffer.from(process.argv[2],'base64'))" "$target" "$content_base64"`,
    '}',
    '',
    ...pluginFiles.map((file) => `write_plugin_file ${shellQuote(file.relativePath)} ${shellQuote(file.contentBase64)}`),
    '',
    'msg "✓ Plugin files installed: $PLUGIN_DIR" "✓ 플러그인 파일 설치 완료: $PLUGIN_DIR"',
    '',
    '# --- installed_plugins.json 업데이트 ---',
    'mkdir -p "$HOME/.claude/plugins"',
    'INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"',
    `PLUGIN_KEY='${MARKETPLACE_KEY}'`,
    'node -e "',
    "const fs = require('fs');",
    'const path = process.argv[1];',
    'const installPath = process.argv[2];',
    'const version = process.argv[3];',
    'const pluginKey = process.argv[4];',
    "let data = { version: 2, plugins: {} };",
    "try { data = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch {}",
    'if (!data.plugins) data.plugins = {};',
    "for (const k of Object.keys(data.plugins)) { if (k.includes('ccusage-ralphgrip')) delete data.plugins[k]; }",
    'data.plugins[pluginKey] = [{',
    "  scope: 'user',",
    '  installPath,',
    '  version,',
    '  installedAt: new Date().toISOString(),',
    '  lastUpdated: new Date().toISOString(),',
    '}];',
    "fs.writeFileSync(path, JSON.stringify(data, null, 2));",
    `" "$INSTALLED_FILE" "$PLUGIN_DIR" ${shellQuote(pluginVersion)} "$PLUGIN_KEY"`,
    'msg "✓ installed_plugins.json updated" "✓ installed_plugins.json 업데이트 완료"',
    '',
    '# --- extraKnownMarketplaces 등록 ---',
    'SETTINGS_FILE="$HOME/.claude/settings.json"',
    'node -e "',
    "const fs = require('fs');",
    'const settingsPath = process.argv[1];',
    'const pluginDir = process.argv[2];',
    "let settings = {};",
    "try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch {}",
    'if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};',
    "settings.extraKnownMarketplaces.ralphgrip = { source: { source: 'path', path: pluginDir } };",
    "fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\\n');",
    '" "$SETTINGS_FILE" "$PLUGIN_DIR"',
    'msg "✓ Marketplace registered in settings" "✓ 마켓플레이스 설정 등록 완료"',
    '',
    '# --- init 실행 (설정 저장 + 플러그인 활성화 + backfill + login) ---',
    'echo ""',
    'if $NO_NAME; then',
    '  node "$PLUGIN_DIR/scripts/init.mjs" --marketplace-url "$MARKETPLACE_URL"',
    'else',
    '  node "$PLUGIN_DIR/scripts/init.mjs" "$NAME" --marketplace-url "$MARKETPLACE_URL"',
    'fi',
    '',
    'echo ""',
    'echo "=========================================="',
    'msg "Installation complete! Restart Claude Code / OpenCode / Codex CLI / Gemini CLI." "설치 완료! Claude Code / OpenCode / Codex CLI / Gemini CLI를 재시작하세요."',
    'echo "=========================================="',
    '',
    'exit',
    '}',
    '',
  ].join('\n');
}

function resolvePluginRoot(): string {
  for (const candidate of REPO_ROOT_CANDIDATES) {
    if (existsSync(join(candidate, '.claude-plugin', 'plugin.json'))) {
      return candidate;
    }
  }

  throw new Error('Unable to locate plugin source directory');
}

function collectPluginFiles(pluginRoot: string): PluginFile[] {
  return walkPluginFiles(pluginRoot)
    .filter((relativePath) => !relativePath.endsWith('.test.mjs') && !relativePath.endsWith('marketplace.json'))
    .map((relativePath) => ({
      relativePath,
      contentBase64: readFileSync(join(pluginRoot, relativePath)).toString('base64'),
    }));
}

function walkPluginFiles(currentDir: string, pluginRoot = currentDir): string[] {
  return readdirSync(currentDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        return walkPluginFiles(fullPath, pluginRoot);
      }
      return [relative(pluginRoot, fullPath)];
    });
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
