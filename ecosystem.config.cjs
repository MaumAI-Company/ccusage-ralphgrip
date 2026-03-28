module.exports = {
  apps: [{
    name: 'ccusage-ralphgrip',
    script: 'node_modules/.bin/next',
    args: 'start -p 3003',
    cwd: '/opt/ccusage-ralphgrip/packages/dashboard',
    env: {
      NODE_ENV: 'production',
      PORT: 3003,
    },
    node_args: '--max-old-space-size=3072',
    max_memory_restart: '1500M',
    autorestart: true,
    instances: 1,
    exec_mode: 'fork',
  }],
};
