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
      name: `mothership`,
      script: 'pnpm prod:mothership',
    },
    {
      name: `downloader`,
      restart_delay: 60 * 60 * 1000, // 1 hour
      script: 'pnpm download-versions',
    },
  ],
}
