module.exports = {
  apps: [
    {
      name: 'union-rental-api',
      cwd: '/var/www/union-rental/apps/backend',
      script: 'dist/server.js',
      env: { NODE_ENV: 'production' },
    },
  ],
};
