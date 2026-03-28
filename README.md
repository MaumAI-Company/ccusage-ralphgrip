# ccusage-worv

Claude Code, OpenCode, Codex CLI, Gemini CLI 사용량을 자동 수집해서 중앙 서버로 보내고,
Next.js 대시보드에서 팀 단위로 시각화하는 모노레포입니다.

## 무엇을 하는 프로젝트인가

ccusage-worv는 팀원 각자의 로컬 환경에 설치되는 **수집 플러그인**과,
수집된 데이터를 저장/집계/시각화하는 **웹 대시보드**로 구성됩니다.

지원 흐름:

- **Claude Code** — Hook 기반 자동 수집
- **OpenCode** — plugin 연동 기반 자동 수집
- **Codex CLI** — notify hook 기반 자동 수집
- **Gemini CLI** — SessionEnd hook 기반 자동 수집

핵심 목표:

- 세션별 사용량 자동 수집
- 모델별 토큰/비용 집계
- 팀원별/기간별 비용 분석
- 예산 및 플랜 추적
- Anthropic 5h / 7d utilization 모니터링
- 도구 사용 분석 (tool call/accept/reject)

## 프로젝트 구조

```text
ccusage-worv/
├── plugin/                        # 로컬 설치용 수집 플러그인
│   ├── .claude-plugin/plugin.json # 플러그인 매니페스트
│   ├── hooks/hooks.json           # Claude SessionStart/SessionEnd hook
│   ├── commands/                  # 슬래시 커맨드
│   │   ├── ccw-setup.md           # /ccw-setup
│   │   └── ccw-sync.md            # /ccw-sync
│   └── scripts/
│       ├── init.mjs               # 초기 설정 + 연동 설치 + backfill
│       ├── collect.mjs            # Claude SessionEnd 수집
│       ├── catchup.mjs            # 누락 세션 재전송 / backfill
│       ├── codex-notify.mjs       # Codex notify hook entrypoint
│       ├── opencode-plugin.mjs    # OpenCode plugin entrypoint
│       └── lib/                   # 모듈 분리된 라이브러리
│           ├── paths.mjs          # 경로 상수 (Claude/OpenCode/Codex/Gemini)
│           ├── config.mjs         # 설정 로드/저장, sent-session 네임스페이싱
│           ├── pricing.mjs        # 모델 가격표 (Claude + GPT + Gemini 26종)
│           ├── transcripts.mjs    # JSONL/OpenCode/Gemini/Codex 파서, aggregateByModel
│           ├── report.mjs         # 리포트 빌드 (buildReport, buildReportFromEntries)
│           ├── transport.mjs      # 서버 전송 (sendReport, OAuth Bearer)
│           ├── utilization.mjs    # Anthropic rate limit 조회 (resetsAt 포함)
│           ├── auth.mjs           # OAuth 토큰 관리 (refresh, device flow)
│           ├── tools.mjs          # 도구 사용 분석 (call/accept/reject 카운트)
│           ├── update-check.mjs   # 플러그인 버전 체크 (24h 캐시)
│           ├── codex-config.mjs   # Codex TOML 설정 관리
│           ├── gemini-config.mjs  # Gemini settings.json 훅 관리
│           ├── i18n.mjs           # 다국어 메시지 (en/ko)
│           └── common.mjs         # re-export 래퍼 (하위 호환성)
├── packages/
│   ├── dashboard/                 # Next.js 대시보드 + API 서버
│   │   ├── src/
│   │   │   ├── app/               # 페이지 + API Routes (20개 엔드포인트)
│   │   │   ├── components/        # UI 컴포넌트 (20개)
│   │   │   ├── lib/
│   │   │   │   ├── domain/        # 순수 비즈니스 로직 (Hexagonal)
│   │   │   │   ├── auth/          # OAuth2, 세션, Device Flow
│   │   │   │   ├── schemas/       # Zod 스키마 (API 검증)
│   │   │   │   ├── repository.ts  # Supabase 어댑터
│   │   │   │   └── pricing.ts     # 서버 측 가격표
│   │   │   └── middleware.ts      # 인증 미들웨어
│   │   └── supabase/
│   │       └── migrations/        # DB 마이그레이션 (Supabase CLI)
│   └── installer/                 # npx ccusage-worv 설치기
│       ├── bin/install.mjs        # CLI 엔트리포인트
│       └── package.json           # v0.2.2
├── e2e/                           # Playwright API/UI 테스트
├── deploy/                        # EC2/PM2/Nginx 배포 자료
├── scripts/seed.ts                # 샘플 데이터 주입
├── .github/workflows/
│   ├── ci.yml                     # CI: lint, build, codegen 검증, 테스트
│   └── deploy.yml                 # CD (비활성, SSM으로 배포)
└── docs/plans/                    # 초기 설계/구현 문서
```

## 데이터 흐름

```text
[팀원 로컬]
Claude Code / OpenCode / Codex CLI / Gemini CLI
        ↓
plugin/scripts/collect.mjs 또는 catchup.mjs
        ↓
세션 로그(JSONL/JSON) 파싱
        ↓
모델별 토큰/비용 집계 + 도구 사용 분석
        ↓
POST /api/usage (OAuth Bearer 인증)
        ↓
[dashboard 서버]
입력 검증 + 서버 측 비용 재계산
        ↓
Supabase(PostgreSQL) 저장
        ↓
/api/stats, /api/report, /api/weekly-ranking 집계
        ↓
웹 대시보드 표시 (Google OAuth 인증)
```

## 주요 기능

### 수집기 (plugin)

- 팀원 이름/서버 URL 설정 저장
- Claude plugin 자동 활성화
- OpenCode plugin 자동 설치
- Codex CLI notify hook 자동 연결
- Gemini CLI SessionEnd hook 자동 연결
- 과거 미전송 세션 backfill (기본 7일)
- 전송 완료 세션 기록으로 중복 전송 방지
- OAuth2 토큰 자동 갱신 (60초 만료 버퍼)
- 도구 사용 통계 (tool call/accept/reject 카운트)
- 서브에이전트 트랜스크립트 포함
- 플러그인 버전 자동 체크 (24시간 캐시)
- 다국어 지원 (en/ko)

### 대시보드 (packages/dashboard)

- **요약 카드** — 총 비용, 총 토큰, 팀원 수, 세션 수, 턴 수
- **주간 사용량 랭킹** — 매주 월요일(KST) 리셋, TOP 10/15 구분선, 지난주 TOP 3 포디엄
- **모델 분포** — 비용 기준 도넛/파이 차트
- **일별 비용 차트** — 팀원별 stacked bar
- **토큰 리더보드** — 총/입력/출력 Top-10
- **토큰 시계열** — 로그 스케일 추이 차트
- **멤버별 세션 차트** — 세션 수 bar chart
- **도구 사용 통계** — 도구별 call/accept/reject 테이블 + 차트
- **예산 관리** — 팀/멤버별 주간/월간 예산 설정 및 추적
- **플랜 관리** — 멤버별 요금제/과금 메모
- **Rate Limit 현황** — Anthropic 5h / 7d 사용률 + 리셋 시각
- **리포트 페이지 (`/report`)** — 회사 계정 기준 월간 분석 (멤버/일별/주별/모델/프로젝트)
- **설치 가이드 페이지 (`/setup`)** — 원클릭 설치 안내
- **Google OAuth 인증** — PKCE 기반 로그인, 이메일 허용목록, Device Flow

## 설치 방법

### 1) 권장: 서버가 열려 있다면 curl 설치

```bash
curl -sL https://ccusage.worvgrip.com/api/install | bash -s -- "홍길동"
```

이 스크립트는 다음을 자동으로 수행합니다.

1. 플러그인 파일 설치
2. `~/.claude/plugins/installed_plugins.json` 등록
3. `init.mjs` 실행
4. Claude / OpenCode / Codex / Gemini CLI 연동 설정
5. 과거 미전송 세션 backfill

### 2) npm 배포본으로 설치

```bash
npx ccusage-worv "홍길동"
```

### 지원 CLI 설치

```bash
# OpenCode
curl -fsSL https://opencode.ai/install | bash

# Codex CLI
npm install -g @openai/codex

# Gemini CLI
npm install -g @google/gemini-cli
```

### 3) 저장소 기준 로컬 개발 설치

```bash
node plugin/scripts/init.mjs "홍길동" "http://localhost:3000"
```

## Claude 슬래시 커맨드

플러그인 설치 후 Claude Code에서 다음 명령을 사용할 수 있습니다.

- `/ccw-setup` — 초기 설정, 연동 설치, 전체 backfill
- `/ccw-sync` — 미전송 세션 수동 동기화

## 설정 파일

초기 설정 후 아래 파일이 생성됩니다.

### `~/.ccusage-worv.json`

```json
{
  "memberName": "홍길동",
  "serverUrl": "https://ccusage.worvgrip.com",
  "accessToken": "...",
  "refreshToken": "...",
  "tokenExpiresAt": 1711234567890
}
```

### `~/.ccusage-worv-sent.json`

전송 완료 세션을 소스별로 추적합니다.

```json
{
  "claude:abc123": true,
  "opencode:def456": true,
  "gemini:session-789": true,
  "codex:thread-012": true
}
```

## 아키텍처 — Hexagonal (Ports & Adapters)

대시보드 백엔드는 Hexagonal Architecture를 따릅니다.

```text
Domain (순수 비즈니스 로직, I/O 없음)
  src/lib/domain/
    ├── ports.ts              # Repository 인터페이스 (데이터 접근 계약)
    ├── reporting.ts          # 리포트 집계, 멤버/일별/주별/모델 분석
    ├── usage-service.ts      # 사용량 리포트 수신 서비스
    ├── usage-processing.ts   # 비용 재계산, 토큰 검증
    ├── ranking.ts            # 주간 랭킹, 주간 비교
    └── time.ts               # 타임존/주간/월간 계산 (UTC 월요일 기준)

Adapter (I/O)
  src/lib/repository.ts       # Supabase 어댑터 (port 인터페이스 구현)
  src/lib/auth/               # OAuth2, 세션(AES-256-GCM), Device Flow
  src/lib/adapters/           # 환경설정 로더
  src/lib/schemas/            # Zod 스키마 → OpenAPI codegen

Presentation (얇은 HTTP 레이어)
  src/app/api/                # 요청 파싱 → 도메인 호출 → 응답
  src/components/             # React UI 컴포넌트
  src/middleware.ts           # 인증 미들웨어
```

**규칙:**
- Domain 함수는 순수 함수 — I/O 라이브러리 import 금지
- 비즈니스 로직은 domain에, API route와 repository는 어댑터만
- 테스트는 domain 경계에서 mock repository로 작성 (vitest)

## 서버 실행

```bash
git clone https://github.com/MaumAI-Company/ccusage-worv.git
cd ccusage-worv
pnpm install
pnpm dev
```

기본 대시보드 주소: `http://localhost:3000`

## 환경변수

`packages/dashboard/.env.local`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth2 (Google)
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret

# 세션 암호화
SESSION_SECRET=base64-encoded-32-byte-secret

# 선택 사항
# AUTH_ALLOWLIST_ENABLED=true      # 이메일 허용목록 (기본 false)
# AUTH_TEST_BYPASS=true            # 테스트 전용 (프로덕션 금지)
# ALLOW_UNAUTHED_USAGE=true        # 레거시 플러그인 미인증 전송 허용
```

예제 파일: `packages/dashboard/.env.local.example`

## API

### `POST /api/usage`

수집기가 전송하는 사용량 데이터를 저장합니다.

- Bearer 토큰 인증 (또는 `ALLOW_UNAUTHED_USAGE` 허용 시 미인증)
- 입력 검증 (Zod)
- synthetic 모델 필터링
- 서버 측 비용 재계산 (클라이언트 `costUsd` 무시)
- utilization snapshot 함께 저장
- 도구 사용 통계 저장

요청 예시:

```json
{
  "memberName": "홍길동",
  "sessionId": "session-123",
  "records": [
    {
      "model": "claude-sonnet-4-6",
      "inputTokens": 1000,
      "outputTokens": 500,
      "cacheCreationTokens": 200,
      "cacheReadTokens": 100,
      "costUsd": 0.05,
      "projectName": "my-project",
      "recordedAt": "2026-02-25T10:00:00Z"
    }
  ],
  "reportedAt": "2026-02-25T10:30:00Z",
  "pluginVersion": "0.2.2",
  "utilization": {
    "fiveHour": 45.2,
    "sevenDay": 12.8,
    "fiveHourResetsAt": "2026-02-25T15:00:00Z",
    "sevenDayResetsAt": "2026-03-03T00:00:00Z"
  },
  "toolUsage": [
    { "toolName": "file_editor", "callCount": 12, "acceptCount": 10, "rejectCount": 2 }
  ],
  "turnCount": 45
}
```

### `GET /api/stats?days=30`

대시보드 메인 화면 집계 데이터를 반환합니다 (15초 TTL 캐시).

포함 항목: `daily`, `members`, `models`, `teamMembers`, `weeklyBudgets`, `monthlyBudgets`,
`velocity`, `budgetConfigs`, `sessionCount`, `rolling5h`, `rolling7d`, `utilization`,
`memberPlans`, `weeklyRanking`, `previousWeekTop`, `toolUsageSummary`, `dailyToolUsage`,
`totalTurns`, `memberSessionCount`, `utilizationHistory`

### 기타 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/budgets` | GET/POST | 예산 설정 |
| `/api/plans` | GET/POST | 멤버 플랜 설정 |
| `/api/report` | GET | 월간 리포트 데이터 |
| `/api/weekly-ranking` | GET | 주간 랭킹 |
| `/api/version` | GET | 대시보드 버전 |
| `/api/install` | GET | 설치용 bash 스크립트 |

### 인증 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/auth/login` | GET | Google OAuth2 PKCE 로그인 |
| `/api/auth/callback` | GET | OAuth2 콜백 |
| `/api/auth/session` | GET | 현재 세션 정보 |
| `/api/auth/logout` | GET | 로그아웃 |
| `/api/auth/device` | POST | Device Flow 챌린지 생성 |
| `/api/auth/device/authorize` | POST | Device Flow 승인 |
| `/api/auth/device/poll` | POST | Device Flow 폴링 |
| `/api/auth/claim` | POST | 이메일-멤버 연결 |
| `/api/auth/token/refresh` | POST | 토큰 갱신 |
| `/api/auth/token/revoke` | POST | 토큰 폐기 |

## 비용 계산

가격표는 `plugin/scripts/lib/pricing.mjs`와 `packages/dashboard/src/lib/pricing.ts`에 정의되어 있습니다.

### 지원 모델 (26종+)

**Anthropic Claude:**
`claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-haiku-4-5`

**OpenAI GPT:**
`gpt-5.4`, `gpt-5.4-pro`, `gpt-5.3-codex`, `gpt-5.2`, `gpt-5.2-codex`,
`gpt-5.1-codex-max`, `gpt-5.1-codex`, `gpt-5.1-codex-mini`,
`gpt-5-mini`, `gpt-5-nano`, `gpt-5-pro`, `gpt-4o`

**Google Gemini:**
`gemini-3.1-pro-preview`, `gemini-3-pro-preview`, `gemini-3-flash-preview`,
`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`

Provider prefix(`openai/`, `anthropic.`, `models/`, `google/`)와
OpenCode Antigravity alias도 자동 매핑됩니다.

## 데이터 저장소

Supabase 주요 테이블:

| 테이블 | 설명 |
|--------|------|
| `team_members` | 팀원 목록 (이메일 연결, 계정 타입) |
| `usage_records` | 세션별 사용량 (모델, 토큰, 비용, 프로젝트, 턴 수) |
| `budget_configs` | 팀/멤버별 주간·월간 예산 |
| `utilization_snapshots` | Anthropic 5h/7d 사용률 스냅샷 |
| `member_plans` | 멤버 요금제 정보 (max5/max20 등) |
| `tool_usage_records` | 도구 사용 통계 (call/accept/reject) |
| `device_challenges` | Device Flow 인증 상태 |
| `refresh_tokens` | OAuth 리프레시 토큰 (해시 저장) |
| `allowed_emails` | 이메일 허용목록 |

마이그레이션은 `packages/dashboard/supabase/migrations/`에서 Supabase CLI로 관리합니다.

## 개발 명령어

```bash
pnpm install                  # 의존성 설치
pnpm dev                      # 대시보드 개발 서버 (localhost:3000)
pnpm build                    # 프로덕션 빌드
pnpm test                     # 전체 테스트
pnpm test:e2e                 # Playwright E2E 테스트
pnpm seed                     # 샘플 데이터 주입
```

### 코드젠 (API 타입)

```bash
pnpm --filter dashboard generate          # OpenAPI spec + TypeScript types 생성
pnpm --filter dashboard generate:openapi  # Zod → openapi.json
pnpm --filter dashboard generate:types    # openapi.json → src/lib/api-types.ts
```

> Zod 스키마를 수정한 후 반드시 `pnpm generate`를 실행하여 타입을 갱신할 것.

### 플러그인 테스트

```bash
node --test plugin/scripts/lib/*.test.mjs
```

### DB 마이그레이션

```bash
pnpm --filter dashboard db:validate       # 마이그레이션 무결성 검증
npx supabase db push                      # 마이그레이션 적용
```

## CI / CD

### CI (GitHub Actions)

`ci.yml`이 push/PR 시 자동 실행:

1. DB 마이그레이션 검증
2. 코드젠 일관성 체크 (`pnpm generate` 후 diff)
3. TypeScript 타입 체크
4. ESLint
5. 대시보드 빌드
6. 대시보드 유닛 테스트 (vitest)
7. 플러그인 유닛 테스트 (node --test)

### 배포

현재 운영: AWS EC2 + PM2 + Nginx (`ccusage.worvgrip.com`)

GitHub Actions CD는 Secrets 미설정으로 비활성 상태이며, SSM으로 배포합니다.

```bash
aws ssm send-command \
  --instance-ids "i-05e8a64308ee5eb3f" \
  --document-name "AWS-RunShellScript" \
  --parameters '{"commands":["cd /opt/ccusage-worv && git pull origin main && pnpm install --frozen-lockfile && pnpm --filter dashboard build && HOME=/root pm2 reload ccusage-dashboard --update-env"]}' \
  --region ap-northeast-2
```

배포 상세: `deploy/ENV_GUIDE.md`

## 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Node.js 22, pnpm |
| 프론트엔드 | Next.js 16, React 19, Tailwind CSS, Recharts |
| 백엔드 | Next.js API Routes, Zod 검증, OpenAPI codegen |
| 데이터베이스 | Supabase (PostgreSQL), RLS |
| 인증 | Google OAuth2 PKCE, AES-256-GCM 세션, JWT, Device Flow |
| 테스트 | Vitest (유닛), Playwright (E2E), Node.js test runner (플러그인) |
| 인프라 | AWS EC2, PM2, Nginx, Let's Encrypt |
| CI/CD | GitHub Actions |

## 참고

- `docs/plans/`는 초기 설계 문서입니다.
- 현재 구현은 초기 문서보다 확장되어 **Claude 전용이 아니라 OpenCode/Codex/Gemini 연동까지 포함**합니다.

## 라이선스

MIT
