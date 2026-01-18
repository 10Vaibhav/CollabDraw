module.exports = {
  apps: [
    {
      name: 'fe-server',
      script: 'npm',
      args: 'start',
      cwd: './apps/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'http-server',
      script: 'npm',
      args: 'start',
      cwd: './apps/http-backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'ws-server',
      script: 'npm',
      args: 'start',
      cwd: './apps/ws-backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};