module.exports = {
  apps: [
    {
      name: `proxy`,
      script: 'pnpm prod:proxy',
    },
    {
      name: `edge-daemon`,
      script: 'pnpm prod:edge:daemon',
    },
    {
      name: `edge-ftp`,
      script: 'pnpm prod:edge:ftp',
    },
    {
      name: `edge-syslog`,
      script: 'pnpm prod:edge:syslog',
    },
    {
      name: `mothership`,
      script: 'pnpm prod:mothership',
    },
    {
      name: `downloader`,
      restart_delay: 60 * 60 * 1000, // 1 hour
      script: 'pnpm download-versions',
    },
    {
      name: `edge-health`,
      restart_delay: 60 * 1000, // 1 minute
      script: 'pnpm prod:edge:health',
    },
  ],
}
