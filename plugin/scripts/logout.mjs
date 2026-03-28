#!/usr/bin/env node

/**
 * ccusage-ralphgrip logout command
 *
 * Clears OAuth tokens from the config file.
 * Preserves other config fields (serverUrl, memberName, etc.).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CONFIG_PATH } from './lib/paths.mjs';

function main() {
  if (!existsSync(CONFIG_PATH)) {
    console.log('설정 파일이 없습니다. 이미 로그아웃 상태입니다.');
    console.log('No config file found. Already logged out.');
    process.exit(0);
  }

  let config;
  try {
    config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    console.error('설정 파일을 읽을 수 없습니다.');
    console.error('Could not read config file.');
    process.exit(1);
  }

  if (!config.accessToken && !config.refreshToken) {
    console.log('인증 토큰이 없습니다. 이미 로그아웃 상태입니다.');
    console.log('No auth tokens found. Already logged out.');
    process.exit(0);
  }

  delete config.accessToken;
  delete config.refreshToken;
  delete config.tokenExpiresAt;

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log('로그아웃 완료. 인증 토큰이 삭제되었습니다.');
  console.log('Logged out. Auth tokens have been removed.');
}

main();
