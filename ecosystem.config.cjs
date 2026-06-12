module.exports = {
  apps: [
    {
      name: `firewall`,
      script: 'pnpm prod:cli firewall serve',
    },
    {
      name: `edge-daemon`,
      script: 'pnpm prod:cli edge daemon serve',
      cron_restart: '0 0 * * *',
    },
    {
      name: `edge-ftp`,
      script: 'pnpm prod:cli edge ftp serve',
      cron_restart: '0 0 * * *',
    },
    {
      name: `edge-volume`,
      script: 'pnpm prod:cli edge volume mount',
      // cron_restart: '0 0 * * *',
    },
    {
      name: `mothership`,
      script: 'pnpm prod:cli mothership serve',
    },
    {
      name: `pocketbase-update`,
      restart_delay: 60 * 60 * 1000, // 1 hour
      script: 'pnpm prod:cli pocketbase update',
    },
    {
      name: `health-check`,
      restart_delay: 60 * 1000, // 1 minute
      script: 'pnpm prod:cli health check',
    },
    {
      name: `health-compact`,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'pnpm prod:cli health compact',
    },
  ],
}
