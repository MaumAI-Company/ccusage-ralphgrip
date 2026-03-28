---
description: Log out and clear auth tokens / 로그아웃
---

## English

Log out from the ccusage-ralphgrip server by clearing stored OAuth tokens.

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/logout.mjs"
```

This removes the access token, refresh token, and token expiry from `~/.ccusage-ralphgrip.json`.
Other config fields (server URL, etc.) are preserved.

Report the result to the user.

---

## 한국어

ccusage-ralphgrip 서버에서 로그아웃합니다 (저장된 OAuth 토큰을 삭제).

아래 명령어를 실행하세요:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/logout.mjs"
```

`~/.ccusage-ralphgrip.json`에서 액세스 토큰, 리프레시 토큰, 토큰 만료 시간을 삭제합니다.
서버 URL 등 다른 설정은 유지됩니다.

실행 결과를 사용자에게 알려주세요.
