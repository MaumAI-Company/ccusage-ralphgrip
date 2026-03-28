module.exports = {
  apps: [{
    name: 'ccusage-dashboard',
    cwd: './packages/dashboard',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3002',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
