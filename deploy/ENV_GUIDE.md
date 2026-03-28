# EC2 Environment Setup

## packages/dashboard/.env.local

```
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# OAuth2
OAUTH_CLIENT_ID=<client-id>
OAUTH_CLIENT_SECRET=<client-secret>

# Session encryption (generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
SESSION_SECRET=<base64-encoded-32-byte-secret>

# Optional overrides (uncomment if needed)
# AUTH_REDIRECT_URI=https://ccusage.ralphgrip.com/api/auth/callback
# AUTH_ALLOWLIST_ENABLED=true

# WARNING: NEVER set AUTH_TEST_BYPASS=true in production
```

## Initial Server Setup

이 EC2는 worvgrip(worvk) 앱과 공유합니다. Node.js, pnpm, PM2, Nginx는 이미 설치되어 있습니다.

```bash
# 1. Clone repo
cd /opt
sudo git clone https://github.com/MaumAI-Company/ccusage-ralphgrip.git
cd ccusage-ralphgrip
pnpm install

# 2. 환경변수 설정
cp packages/dashboard/.env.local.example packages/dashboard/.env.local
# .env.local 편집하여 Supabase 정보 입력

# 3. 빌드
pnpm --filter dashboard build

# 4. Nginx config (conf.d 방식)
sudo cp deploy/nginx-ccusage.conf /etc/nginx/conf.d/ccusage.conf
sudo nginx -t && sudo systemctl reload nginx

# 5. SSL
sudo certbot --nginx -d ccusage.ralphgrip.com

# 6. PM2 시작
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 서버 Node.js 환경 (참고)

만약 Node.js가 없는 새 서버라면:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm pm2
```
