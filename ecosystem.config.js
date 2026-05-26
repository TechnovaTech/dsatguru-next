module.exports = {
  apps: [
    {
      name: 'dsatguru-next',
      script: 'npm',
      args: 'start',
      cwd: '/root/dsatguru-next',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
}
