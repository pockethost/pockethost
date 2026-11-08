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
      // Adds upstream releases missing from versions.json (edits the live checkout; commit later) and posts to
      // DISCORD_ALERT_CHANNEL_URL. pocketbase-update then downloads them and publishes them to the mothership.
      name: `pocketbase-check`,
      restart_delay: 60 * 60 * 1000, // 1 hour
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
      // Archives free instances with no start in 365 days. Owner emails are off (--email to enable).
      name: `edge-archive-stale`,
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
    {
      // Measures each instance folder with du and writes each owner's total to users.volume_storage_used for the
      // account page's Disk storage meter. Display only; nothing is enforced.
      name: `edge-disk-usage`,
      restart_delay: 60 * 60 * 1000 * 24, // 1 day
      script: 'pnpm prod:cli edge disk-usage',
    },
    {
      // Accounts running more instances than their plan includes get a warning email; 24 hours later the least
      // recently used extras are powered off. Hourly, so the power-off lands close to the 24-hour mark. ~5s per run.
      name: `edge-over-limit`,
      restart_delay: 60 * 60 * 1000, // 1 hour
      script: 'pnpm prod:cli edge over-limit --apply',
    },
  ],
}
