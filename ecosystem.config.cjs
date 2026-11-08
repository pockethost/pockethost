module.exports = {
  apps: [
    {
      name: `firewall`,
      script: 'pnpm prod:cli firewall serve',
    },
    {
      name: `edge-daemon`,
      script: 'pnpm prod:cli edge daemon serve',
    },
    {
      name: `edge-sftp`,
      script: 'pnpm prod:cli sftp serve',
      cron_restart: '0 0 * * *',
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
      // Alerts DISCORD_ALERT_CHANNEL_URL when upstream has releases missing from versions.json.
      name: `pocketbase-check`,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'pnpm prod:cli pocketbase check',
    },
    {
      name: `health-check`,
      restart_delay: 60 * 1000, // 1 minute
      script: 'pnpm prod:cli health check',
    },
    {
      name: `edge-vacuum`,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'pnpm prod:cli edge vacuum --hours-back=24',
    },
    {
      name: `edge-purge-orphans`,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'pnpm prod:cli edge purge-orphans',
    },
    {
      // Off until the manual rollout runs are done: `pm2 start edge-archive-stale` to enable.
      name: `edge-archive-stale`,
      autostart: false,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'pnpm prod:cli edge archive stale --apply --max-instances 200 --max-gb 100',
    },
    {
      // Keeps each instance's newest PocketBase backup zip on disk and moves older ones to IDrive behind a .zip.txt
      // link. Max 50 GB per daily run.
      name: `edge-archive-backups`,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'pnpm prod:cli edge archive backups --apply --max-gb 50',
    },
  ],
}
