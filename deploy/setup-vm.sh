#!/bin/bash
set -euo pipefail

echo "=== Setting up ccusage-ralphgrip VM ==="

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@10

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Clone repo
sudo mkdir -p /opt/ccusage-ralphgrip
sudo chown $(whoami):$(whoami) /opt/ccusage-ralphgrip
git clone https://github.com/MaumAI-Company/ccusage-ralphgrip.git /opt/ccusage-ralphgrip

# Install dependencies
cd /opt/ccusage-ralphgrip
pnpm install

# Build
pnpm --filter dashboard build

# Setup Nginx
sudo cp deploy/nginx-ccusage-ralphgrip.conf /etc/nginx/sites-available/ccusage-ralphgrip
sudo ln -sf /etc/nginx/sites-available/ccusage-ralphgrip /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Start PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -1 | bash

echo "=== VM setup complete ==="
echo "Next steps:"
echo "1. Create .env.local at /opt/ccusage-ralphgrip/packages/dashboard/.env.local"
echo "2. Run: sudo certbot --nginx -d ccusage.ralphgrip.com"
echo "3. Run: pm2 reload ccusage-ralphgrip"
