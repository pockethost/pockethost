// Sidebar and prev/next order for /docs. Every */+page.md must appear here (see docs-nav.test.ts).

export type DocNavItem = { slug: string; title: string; indent?: boolean }
export type DocNavSection = { title: string; items: DocNavItem[] }

export const docsNav: DocNavSection[] = [
  {
    title: 'Start here',
    items: [
      { slug: 'introduction', title: 'Introduction' },
      { slug: 'getting-started', title: 'Getting Started' },
      { slug: 'how-it-works', title: 'How PocketHost Works' },
    ],
  },
  {
    title: 'Your instance',
    items: [
      { slug: 'create', title: 'Create' },
      { slug: 'accessing', title: 'Connect' },
      { slug: 'power', title: 'Power' },
      { slug: 'rename-instance', title: 'Rename' },
      { slug: 'versions', title: 'Changing Versions' },
      { slug: 'custom-domain', title: 'Custom Domain' },
      { slug: 'delete', title: 'Delete' },
    ],
  },
  {
    title: 'Deploying & files',
    items: [
      { slug: 'ftp', title: 'SFTP File Access' },
      { slug: 'cli', title: 'PocketHost CLI' },
      { slug: 'deploy-from-ci', title: 'Deploy from CI' },
      { slug: 'static-assets', title: 'Static Assets' },
      { slug: 'backup-restore', title: 'Backups & Data Protection' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { slug: 'secrets', title: 'Secrets' },
      { slug: 'encryption', title: 'Settings Encryption' },
      { slug: 'cors', title: 'CORS Origins' },
      { slug: 'admin-sync', title: 'Admin Sync' },
      { slug: 'whats-added', title: 'What PocketHost Adds' },
      { slug: 'dev-mode', title: 'Dev Mode' },
    ],
  },
  {
    title: 'Building your app',
    items: [
      { slug: 'js', title: 'Extending via JS' },
      { slug: 'webhooks', title: 'Webhooks & Scheduled Jobs' },
      { slug: 'admin-extensions', title: 'Admin UI Extensions' },
      { slug: 'server-side-pocketbase-antipattern', title: 'Server-Side PocketBase Anti-Pattern' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { slug: 'smtp', title: 'Outgoing Email' },
      { slug: 'gs-gmail', title: 'Google Suite Setup', indent: true },
      { slug: 'ses', title: 'Amazon SES Setup', indent: true },
      { slug: 's3', title: 'S3 Storage' },
    ],
  },
  {
    title: 'Operations & limits',
    items: [
      { slug: 'limits', title: 'Limits' },
      { slug: 'trusted-ips', title: 'Trusted IPs' },
      { slug: 'logs', title: 'Logging' },
      { slug: 'auto-vacuum', title: 'Auto Vacuum' },
      { slug: 'troubleshooting', title: 'Troubleshooting' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { slug: 'pricing-ethos', title: 'Pricing Ethos' },
      { slug: 'faq', title: 'FAQ' },
      { slug: 'custom-binaries', title: 'Custom Binaries' },
    ],
  },
]

export const docsNavFlat: DocNavItem[] = docsNav.flatMap((s) => s.items)

export const getPrevNext = (slug: string) => {
  const i = docsNavFlat.findIndex((d) => d.slug === slug)
  if (i < 0) return { prev: undefined, next: undefined }
  return { prev: docsNavFlat[i - 1], next: docsNavFlat[i + 1] }
}
