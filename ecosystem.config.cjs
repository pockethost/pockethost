module.exports = {
  apps: [
    {
      name: `proxy`,
      script: 'pnpm prod:proxy',
    },
    {
      name: `edge`,
      script: 'pnpm prod:edge',
    },
  ],
}
