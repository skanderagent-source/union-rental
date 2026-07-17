module.exports = {
  apps: [
    {
      name: 'union-rental-api',
      cwd: '/var/www/union-rental/apps/backend',
      script: 'dist/server.js',
      node_args: '--max-http-header-size=16384',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
