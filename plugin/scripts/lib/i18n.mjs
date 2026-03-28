/**
 * Lightweight i18n module for ccusage-ralphgrip plugin.
 *
 * Detects locale from environment variables and provides
 * translated strings in Korean (ko) and English (en, default).
 */

const messages = {
  en: {
    // collect.mjs
    'collect.noConfig': 'ccusage-ralphgrip: No config found. Run /ccw-setup first.',
    'collect.sendFailed': 'ccusage-ralphgrip: Send failed:',

    // catchup.mjs
    'catchup.usage': 'Usage: node catchup.mjs [--session <sessionId>] [--codex-session <threadId>]',
    'catchup.optSession': '  --session <sessionId> Sync one specific OpenCode session immediately.',
    'catchup.optCodex': '  --codex-session <id> Sync one specific Codex session immediately.',
    'catchup.failed': 'ccusage-ralphgrip: catch-up failed ({sessionId}):',
    'catchup.synced': 'ccusage-ralphgrip: {total} unsent session(s) synced',

    // init.mjs
    'init.usage': 'Usage: node init.mjs [name] [serverUrl]',
    'init.configSaved': '✓ Config saved: {path}',
    'init.configName': '  Name: {name}',
    'init.configServer': '  Server: {url}',
    'init.pluginAlreadyEnabled': '✓ Plugin already enabled: {key}',
    'init.pluginEnabled': '✓ Plugin enabled: {key}',
    'init.pluginEnableFailed': '⚠ Failed to enable plugin: {error}',
    'init.pluginEnableManual': '  Manually add to ~/.claude/settings.json:',
    'init.opencodeDone': '✓ OpenCode plugin installed: {path}',
    'init.opencodeFailed': '⚠ OpenCode plugin install failed: {error}',
    'init.opencodeCopyManual': '  Manually copy: {source}',
    'init.opencodeTargetPath': '  Target path: {path}',
    'init.geminiAlreadyLinked': '✓ Gemini CLI SessionEnd hook already linked: {path}',
    'init.geminiLinked': '✓ Gemini CLI SessionEnd hook linked: {path}',
    'init.geminiFailed': '⚠ Gemini CLI SessionEnd hook auto-link failed: {error}',
    'init.geminiManual': '  Manually add SessionEnd hook to {path}:',
    'init.codexAlreadyLinked': '✓ Codex notify hook already linked: {path}',
    'init.codexLinked': '✓ Codex notify hook linked: {path}',
    'init.codexFailed': '⚠ Codex notify hook auto-link failed: {error}',
    'init.codexManual': '  Manually set top-level notify in {path} to:',
    'init.marketplaceRegistered': '✓ Marketplace registered: {url}',
    'init.marketplaceCacheCleaned': '✓ Removed old marketplace plugin cache: {path}',
    'init.autoUpdateEnabled': '✓ Marketplace auto-update enabled',
    'init.authRequired': '⚠ No member name and no auth token. Please authenticate to use email identity:',
    'init.authOptional': 'To enable server authentication, run:',
    'init.authOptionalNote': '(Authentication is optional — reports will include your member name)',
    'init.loginStart': 'Starting authentication...',
    'init.loginSkipped': '⚠ Authentication skipped. You can authenticate later with: /ccusage-ralphgrip:login',
    'init.usage': 'Usage: node init.mjs [serverUrl]',

    // installer (install.mjs)
    'install.title': 'ccusage-ralphgrip - Claude/OpenCode/Codex/Gemini CLI usage collection plugin',
    'install.usage': 'Usage:',
    'install.usageCmd': '  npx ccusage-ralphgrip "name"',
    'install.example': 'Example:',
    'install.exampleCmd': '  npx ccusage-ralphgrip "John"',
    'install.starting': 'ccusage-ralphgrip installation starting...',
    'install.filesDone': '✓ Plugin files installed: {dir}',
    'install.registryDone': '✓ installed_plugins.json registered',
    'install.initError': '⚠ init error:',
    'install.complete': 'Installation complete! Restart Claude Code / OpenCode / Codex CLI / Gemini CLI.',

    // curl install script (route.ts)
    'curl.title': 'ccusage-ralphgrip install script',
    'curl.separator': '=========================',
    'curl.usage': 'Usage:',
    'curl.usageCmd': '  curl -sL https://ccusage.ralphgrip.com/api/install | bash -s -- "name"',
    'curl.example': 'Example:',
    'curl.exampleCmd': '  curl -sL https://ccusage.ralphgrip.com/api/install | bash -s -- "John"',
    'curl.starting': 'ccusage-ralphgrip installation starting...',
    'curl.filesDone': '✓ Plugin files installed: $PLUGIN_DIR',
    'curl.registryDone': '✓ installed_plugins.json updated',
    'curl.complete': 'Installation complete! Restart Claude Code.',
  },

  ko: {
    // collect.mjs
    'collect.noConfig': 'ccusage-ralphgrip: 설정이 없습니다. /ccw-setup을 먼저 실행하세요.',
    'collect.sendFailed': 'ccusage-ralphgrip: 전송 실패:',

    // catchup.mjs
    'catchup.usage': '사용법: node catchup.mjs [--session <sessionId>] [--codex-session <threadId>]',
    'catchup.optSession': '  --session <sessionId> 특정 OpenCode 세션 즉시 동기화',
    'catchup.optCodex': '  --codex-session <id> 특정 Codex 세션 즉시 동기화',
    'catchup.failed': 'ccusage-ralphgrip: catch-up 실패 ({sessionId}):',
    'catchup.synced': 'ccusage-ralphgrip: 미전송 {total}개 세션 동기화 완료',

    // init.mjs
    'init.usage': '사용법: node init.mjs [이름] [서버URL]',
    'init.configSaved': '✓ 설정 저장 완료: {path}',
    'init.configName': '  이름: {name}',
    'init.configServer': '  서버: {url}',
    'init.pluginAlreadyEnabled': '✓ 플러그인 이미 활성화됨: {key}',
    'init.pluginEnabled': '✓ 플러그인 활성화 완료: {key}',
    'init.pluginEnableFailed': '⚠ 플러그인 자동 활성화 실패: {error}',
    'init.pluginEnableManual': '  수동으로 ~/.claude/settings.json에 다음을 추가하세요:',
    'init.opencodeDone': '✓ OpenCode 플러그인 설치 완료: {path}',
    'init.opencodeFailed': '⚠ OpenCode 플러그인 설치 실패: {error}',
    'init.opencodeCopyManual': '  수동으로 다음 파일을 복사하세요: {source}',
    'init.opencodeTargetPath': '  대상 경로: {path}',
    'init.geminiAlreadyLinked': '✓ Gemini CLI SessionEnd hook 이미 연결됨: {path}',
    'init.geminiLinked': '✓ Gemini CLI SessionEnd hook 연결 완료: {path}',
    'init.geminiFailed': '⚠ Gemini CLI SessionEnd hook 자동 연결 실패: {error}',
    'init.geminiManual': '  수동으로 {path}에 SessionEnd hook을 추가하세요:',
    'init.codexAlreadyLinked': '✓ Codex notify hook 이미 연결됨: {path}',
    'init.codexLinked': '✓ Codex notify hook 연결 완료: {path}',
    'init.codexFailed': '⚠ Codex notify hook 자동 연결 실패: {error}',
    'init.codexManual': '  수동으로 {path}의 top-level notify를 다음으로 설정하세요:',
    'init.marketplaceRegistered': '✓ 마켓플레이스 등록 완료: {url}',
    'init.marketplaceCacheCleaned': '✓ 기존 marketplace 플러그인 캐시 제거: {path}',
    'init.autoUpdateEnabled': '✓ 마켓플레이스 자동 업데이트 활성화',
    'init.authRequired': '⚠ 이름과 인증 토큰이 없습니다. 이메일 기반 인증을 진행하세요:',
    'init.authOptional': '서버 인증을 진행하려면 다음 명령을 실행하세요:',
    'init.authOptionalNote': '(인증 없이도 기존 방식으로 동작합니다)',
    'init.loginStart': '인증을 시작합니다...',
    'init.loginSkipped': '⚠ 인증을 건너뛰었습니다. 나중에 /ccusage-ralphgrip:login 으로 인증할 수 있습니다.',
    'init.usage': '사용법: node init.mjs [서버URL]',

    // installer (install.mjs)
    'install.title': 'ccusage-ralphgrip - Claude/OpenCode/Codex/Gemini CLI 사용량 수집 플러그인',
    'install.usage': '사용법:',
    'install.usageCmd': '  npx ccusage-ralphgrip "이름"',
    'install.example': '예시:',
    'install.exampleCmd': '  npx ccusage-ralphgrip "홍길동"',
    'install.starting': 'ccusage-ralphgrip 설치 시작...',
    'install.filesDone': '✓ 플러그인 파일 설치: {dir}',
    'install.registryDone': '✓ installed_plugins.json 등록 완료',
    'install.initError': '⚠ init 실행 중 오류:',
    'install.complete': '설치 완료! Claude Code / OpenCode / Codex CLI / Gemini CLI를 재시작하세요.',

    // curl install script (route.ts)
    'curl.title': 'ccusage-ralphgrip 설치 스크립트',
    'curl.separator': '=========================',
    'curl.usage': '사용법:',
    'curl.usageCmd': '  curl -sL https://ccusage.ralphgrip.com/api/install | bash -s -- "이름"',
    'curl.example': '예시:',
    'curl.exampleCmd': '  curl -sL https://ccusage.ralphgrip.com/api/install | bash -s -- "홍길동"',
    'curl.starting': 'ccusage-ralphgrip 설치 시작...',
    'curl.filesDone': '✓ 플러그인 파일 설치 완료: $PLUGIN_DIR',
    'curl.registryDone': '✓ installed_plugins.json 업데이트 완료',
    'curl.complete': '설치 완료! Claude Code를 재시작하세요.',
  },
};

function detectLocale() {
  const raw = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || '';
  return raw.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let _locale = null;

export function getLocale() {
  if (!_locale) _locale = detectLocale();
  return _locale;
}

export function setLocale(locale) {
  _locale = locale === 'ko' ? 'ko' : 'en';
}

export function t(key, params) {
  const locale = getLocale();
  const str = messages[locale]?.[key] ?? messages.en[key] ?? key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}
