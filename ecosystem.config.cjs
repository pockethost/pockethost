module.exports = {
  apps: [
    {
      name: `firewall`,
      script: 'pnpm dev:cli firewall serve',
    },
    {
      name: `edge-daemon`,
      script: 'pnpm dev:cli edge daemon serve',
    },
    {
      name: `edge-ftp`,
      script: 'pnpm dev:cli edge ftp serve',
    },
    {
      name: `edge-syslog`,
      script: 'pnpm dev:cli edge syslog serve',
    },
    {
      name: `mothership`,
      script: 'pnpm dev:cli mothership serve',
    },
    {
      name: `downloader`,
      restart_delay: 60 * 60 * 1000, // 1 hour
      script: 'pnpm dev:cli download',
    },
    {
      name: `health`,
      restart_delay: 60 * 1000, // 1 minute
      script: 'pnpm dev:cli health',
    },
  ],
}
