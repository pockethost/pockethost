module.exports = {
  apps: [
    {
      name: `firewall`,
      script: 'pnpm dev:cli firewall serve',
    },
    {
      name: `edge-daemon`,
      script: 'pnpm dev:cli edge daemon serve',
      // cron_restart: '0 0 * * *',
    },
    {
      name: `edge-ftp`,
      script: 'pnpm dev:cli edge ftp serve',
      // cron_restart: '0 0 * * *',
    },
    {
      name: `edge-volume`,
      script: 'pnpm dev:cli edge volume mount',
      // cron_restart: '0 0 * * *',
    },
    {
      name: `mothership`,
      script: 'pnpm dev:cli mothership serve',
    },
    {
      name: `dashboard`,
      script: 'pnpm dev:dashboard',
    },
  ],
}
