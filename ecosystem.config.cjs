module.exports = {
  apps: [
    {
      name: `firewall`,
      script: 'bun run prod:cli firewall serve',
    },
    {
      name: `edge-daemon`,
      script: 'bun run prod:cli edge daemon serve',
      cron_restart: '0 0 * * *',
    },
    {
      name: `edge-ftp`,
      script: 'bun run prod:cli edge ftp serve',
      cron_restart: '0 0 * * *',
    },
    {
      name: `edge-volume`,
      script: 'bun run prod:cli edge volume mount',
      // cron_restart: '0 0 * * *',
    },
    {
      name: `mothership`,
      script: 'bun run prod:cli mothership serve',
    },
    {
      name: `pocketbase-update`,
      restart_delay: 60 * 60 * 1000, // 1 hour
      script: 'bun run prod:cli pocketbase update',
    },
    {
      name: `mothership-update-versions`,
      restart_delay: 60 * 60 * 1000, // 1 hour
      script: 'bun run prod:cli mothership update-versions',
    },
    {
      name: `health-check`,
      restart_delay: 60 * 1000, // 1 minute
      script: 'bun run prod:cli health check',
    },
    {
      name: `health-compact`,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'bun run prod:cli health compact',
    },
  ],
}
