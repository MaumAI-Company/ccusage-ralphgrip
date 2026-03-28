---
description: Authenticate with Google OAuth / Google 인증
---

## English

Authenticate with the ccusage-ralphgrip server using Google OAuth (device flow).

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/authenticate.mjs"
```

This will:
1. Request a device challenge from the server
2. Open a browser for Google login
3. Display a confirmation code
4. Poll until the user confirms in the browser
5. Store access and refresh tokens in `~/.ccusage-ralphgrip.json`

After authentication, usage reports are automatically linked to the user's email.
Report the result to the user.

---

## 한국어

ccusage-ralphgrip 서버에 Google OAuth로 인증합니다 (device flow).

아래 명령어를 실행하세요:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/authenticate.mjs"
```

실행하면:
1. 서버에 device challenge를 요청합니다
2. 브라우저가 열려 Google 로그인을 진행합니다
3. 확인 코드가 표시됩니다
4. 브라우저에서 사용자가 확인할 때까지 폴링합니다
5. 액세스 토큰과 리프레시 토큰을 `~/.ccusage-ralphgrip.json`에 저장합니다

인증 후 사용량 보고서가 사용자의 이메일에 자동으로 연결됩니다.
실행 결과를 사용자에게 알려주세요.
