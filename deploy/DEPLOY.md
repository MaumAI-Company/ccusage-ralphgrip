# ccusage-worv 배포 가이드

## 서버 정보

| 항목 | 값 |
|---|---|
| 서비스 | AWS EC2 (ap-northeast-2) |
| 인스턴스 ID | `i-05e8a64308ee5eb3f` |
| 접속 방식 | AWS SSM (SSH 포트 미개방) |
| 앱 경로 | `/opt/ccusage-worv` |
| 도메인 | `ccusage.worvgrip.com` |
| 포트 | 3002 (PM2 → Next.js) |
| PM2 프로세스명 | `ccusage-dashboard` |
| 같은 EC2 | worvgrip(worvk) 앱과 동일 서버 (worvk: 3000, MCP: 3001) |

## 배포 방법

### 방법 1: 원격 명령 (SSM) — 권장

로컬에서 AWS CLI로 배포 스크립트를 실행합니다.

```bash
aws ssm send-command \
  --instance-ids "i-05e8a64308ee5eb3f" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/ccusage-worv && bash deploy/deploy.sh"]' \
  --region ap-northeast-2
```

결과 확인:

```bash
aws ssm get-command-invocation \
  --command-id "<위에서 반환된 CommandId>" \
  --instance-id "i-05e8a64308ee5eb3f" \
  --region ap-northeast-2
```

### 방법 2: SSM 세션 접속 후 수동 실행

```bash
aws ssm start-session \
  --target "i-05e8a64308ee5eb3f" \
  --region ap-northeast-2

# 접속 후
export HOME=/root
cd /opt/ccusage-worv
bash deploy/deploy.sh
```

> **참고:** SSM 세션에서는 `HOME` 환경변수가 설정되지 않아 PM2가 경고를 출력합니다.
> `deploy.sh`가 자동으로 `HOME=/root`를 설정하지만, 수동 실행 시에는 직접 `export HOME=/root`를 해주세요.

## deploy.sh 동작

1. `git pull origin main` — 최신 코드 가져오기
2. `pnpm install --frozen-lockfile` — 의존성 설치
3. `pnpm --filter dashboard build` — Next.js 빌드
4. `pm2 reload ccusage-dashboard` — 무중단 재시작 (없으면 `pm2 start ecosystem.config.cjs`)
5. `pm2 save` — PM2 프로세스 목록 저장
6. 헬스체크 — `curl http://127.0.0.1:3002/` 확인

## 서비스 상태 확인

```bash
aws ssm send-command \
  --instance-ids "i-05e8a64308ee5eb3f" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["export HOME=/root; pm2 list && curl -so /dev/null -w HTTP:%{http_code} http://127.0.0.1:3002/ && echo OK"]' \
  --region ap-northeast-2
```

## 트러블슈팅

### PM2 errored 상태일 때

```bash
# SSM 세션에서
export HOME=/root

# 1. 로그 확인
pm2 logs ccusage-dashboard --lines 50

# 2. 완전 삭제 후 재시작
pm2 delete ccusage-dashboard
cd /opt/ccusage-worv && pm2 start ecosystem.config.cjs && pm2 save
```

### 알려진 이슈

- **SSM에서 HOME 미설정**: SSM `send-command`는 `HOME` 환경변수를 설정하지 않아 PM2가 `/etc/.pm2`를 사용합니다. `deploy.sh`에서 `export HOME=/root`로 해결합니다.
- **PM2 script 경로**: `ecosystem.config.cjs`에서 `node_modules/next/dist/bin/next`를 `interpreter: 'node'`로 실행합니다. `.bin/next`(shell script)를 사용하면 SyntaxError가 발생합니다.

## 인프라 구성

### Nginx

- 설정 파일: `/etc/nginx/conf.d/ccusage.conf` (서버는 `conf.d` 방식 사용, `sites-available` 아님)
- SSL: Let's Encrypt, Certbot이 자동으로 443/SSL 블록을 추가함
- 레포 내 참고용: `deploy/nginx-ccusage.conf` (초기 설정용 기본 템플릿)

### 포트 배치

| 서비스 | 포트 |
|---|---|
| worvk (Next.js) | 3000 |
| worvgrip MCP Server | 3001 |
| ccusage-dashboard (Next.js) | 3002 |

### 환경변수

EC2의 `/opt/ccusage-worv/packages/dashboard/.env.local`:

```
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

상세 설정은 `deploy/ENV_GUIDE.md` 참조.
