#!/usr/bin/env node

/**
 * ccusage-worv authenticate command
 *
 * Uses the server's device challenge flow:
 * 1. Request a challenge from the server
 * 2. Display URL + code for user to confirm in browser
 * 3. Poll until authorized, expired, or cancelled
 * 4. Store tokens in config
 */

import { loadConfig } from './lib/config.mjs';
import { saveTokens, openBrowser } from './lib/auth.mjs';

const POLL_INTERVAL_MS = 4000;

async function requestChallenge(serverUrl) {
  const response = await fetch(`${serverUrl}/api/auth/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to create device challenge: ${response.status}`);
  }

  return response.json();
}

async function pollForAuthorization(serverUrl, challenge) {
  const response = await fetch(
    `${serverUrl}/api/auth/device/poll?challenge=${encodeURIComponent(challenge)}`,
  );

  if (response.status === 410) {
    return { status: 'expired' };
  }

  if (!response.ok) {
    throw new Error(`Poll failed: ${response.status}`);
  }

  return response.json();
}

async function attemptClaim(serverUrl, accessToken, memberName) {
  try {
    const response = await fetch(`${serverUrl}/api/auth/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ memberName }),
    });

    if (response.ok) {
      console.log(`✓ "${memberName}" 사용량 데이터가 계정에 연결되었습니다.`);
    } else if (response.status === 409) {
      // Already claimed by another user — not an error for the login flow
      console.log(`  "${memberName}" 데이터는 이미 다른 계정에 연결되어 있습니다.`);
    } else {
      const body = await response.json().catch(() => ({}));
      console.log(`  데이터 연결 실패 (${response.status}): ${body.error || 'unknown'}`);
    }
  } catch (err) {
    console.log(`  데이터 연결 중 오류: ${err.message}`);
  }
}

async function main() {
  const config = loadConfig();
  if (!config || !config.serverUrl) {
    console.error('설정이 없습니다. 먼저 초기 설정을 실행하세요:');
    console.error('  node init.mjs [serverUrl]');
    process.exit(1);
  }

  const serverUrl = config.serverUrl;

  console.log('서버에 인증 요청 중...');
  const { challenge, url, expiresIn } = await requestChallenge(serverUrl);

  console.log('');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  아래 URL을 열어 인증하세요:                           │');
  console.log(`│  ${url}`);
  console.log('│                                                         │');
  console.log('│  브라우저가 자동으로 열리지 않으면 위 URL을 복사하세요. │');
  console.log('│  인증 대기 중... (Ctrl+C로 취소)                        │');
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log('');

  // Best-effort browser open
  openBrowser(url);

  const deadline = Date.now() + expiresIn * 1000;
  let cancelled = false;

  const onSigint = () => {
    cancelled = true;
    console.log('\n인증이 취소되었습니다.');
    process.exit(0);
  };
  process.on('SIGINT', onSigint);

  while (!cancelled && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    if (cancelled) break;

    try {
      const result = await pollForAuthorization(serverUrl, challenge);

      if (result.status === 'authorized') {
        saveTokens(result.access_token, result.refresh_token, result.expires_in);

        console.log('✓ 인증 성공!');
        if (result.user) {
          console.log(`  사용자: ${result.user.name} (${result.user.email})`);
        }
        console.log('  토큰이 저장되었습니다.');

        // Auto-claim: if config has a legacy memberName, attempt to claim those records
        if (config.memberName) {
          await attemptClaim(serverUrl, result.access_token, config.memberName);
        }

        process.removeListener('SIGINT', onSigint);
        return;
      }

      if (result.status === 'expired') {
        console.error('인증 코드가 만료되었습니다. 다시 실행해 주세요.');
        process.exit(1);
      }

      // status === 'pending' — continue polling
    } catch (err) {
      console.error(`폴링 오류: ${err.message}`);
      // Continue polling on transient errors
    }
  }

  if (!cancelled) {
    console.error('인증 시간이 초과되었습니다. 다시 실행해 주세요.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`인증 실패: ${err.message}`);
  process.exit(1);
});
