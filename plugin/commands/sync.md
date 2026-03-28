---
description: Manually sync unsent sessions / 미전송 세션 수동 전송
---

## English

Manually catch up unsent ccusage-worv sessions.

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/catchup.mjs"
```

To backfill all historical data:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/catchup.mjs" --all
```

Report the result to the user.

---

## 한국어

ccusage-worv 미전송 세션을 수동으로 catch-up 합니다.

아래 명령어를 실행하세요:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/catchup.mjs"
```

전체 보관 데이터를 다시 훑어 backfill하려면 아래 명령어를 실행하세요:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/catchup.mjs" --all
```

실행 결과를 사용자에게 알려주세요.
