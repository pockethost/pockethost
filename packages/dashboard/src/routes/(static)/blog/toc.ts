export type BlogTocEntry = {
  title: string
  path: string
  description: string
  date?: string
  author?: string
}

export const toc: BlogTocEntry[] = [
  {
    title: 'Pre-v0.39 Platform Refresh: Tests, CI, and Dependency Upgrades',
    path: '/blog/pre-39-platform-deps-refresh',
    description:
      'Before Mothership v0.39 cutover: Vitest suite, CI gates, phased deps refresh, PocketBase SDK 0.27, dual admin auth for 0.22 Mothership.',
    date: 'Jun 14, 2026',
    author: 'capn',
  },
  {
    title: 'Pre-Staging the Mothership v0.39 Cutover',
    path: '/blog/mothership-v039-prestage',
    description:
      'Two-phase upgrade: dual admin auth and dependency bumps on main first, zero lockfile changes on the v39 branch, SQL views dropped early. Cutover day flips Mothership only.',
    date: 'Jun 14, 2026',
    author: 'capn',
  },
  {
    title: 'phio 0.4: Deploy Over SFTP',
    path: '/blog/phio-sftp-deploy',
    description:
      'phio dev and deploy now sync on SFTP port 2222 with an auto-provisioned deploy key. Project linking moves to .phioconfig.',
    date: 'Jun 14, 2026',
    author: 'capn',
  },
  {
    title: 'Account Access Keys: Scoped SFTP Access',
    path: '/blog/account-access-keys',
    description:
      'Register Ed25519 keys under Account → Keys. Grant SFTP access to all instances or a specific subset. The first step toward shared account access with limited permissions.',
    date: 'Jun 14, 2026',
    author: 'capn',
  },
  {
    title: 'Last Call for Flounder Lifetime Access',
    path: '/blog/flounder-lifetime-sunset',
    description:
      'Flounder lifetime sales end July 1, 2026. Existing accounts get 30 days after sunset to buy. Email going out to all users.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'FTPS Is Going Away: Move to SFTP',
    path: '/blog/ftps-sunset',
    description:
      'Port 21 FTPS is on a sunset path. SFTP on 2222 with SSH keys is the future. phio deploy and dev already use SFTP.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'Reclaiming 300 GB of Orphan Instance Data',
    path: '/blog/edge-orphan-cleanup',
    description:
      'Edge cleanup removed instance folders with no Mothership record. First production sweep freed ~300 GB, nearly half the used space on that node.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'How We Vacuum Thousands of Instances Without Racing Spawns',
    path: '/blog/vacuum-at-scale',
    description:
      'Edge-owned vacuum locks, spawn gates, and incremental --hours-back sweeps keep nightly SQLite compaction safe at fleet scale.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'Vacuum Now: On-Demand SQLite Compaction',
    path: '/blog/vacuum-now',
    description:
      'Auto Vacuum runs on idle instances overnight. Vacuum Now lets you compact warm instances from the dashboard when you need space back immediately.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'Smarter Rate Limits for API vs File Traffic',
    path: '/blog/weighted-rate-limiting',
    description:
      'Firewall rate limits now weight /api/files routes 10× cheaper than REST API calls. More headroom for uploads and downloads without loosening API abuse protection.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'Auto Vacuum for Idle Instances',
    path: '/blog/auto-vacuum',
    description:
      'Nightly SQLite VACUUM on hibernated instances. On by default, toggle per instance, and skip running containers until they sleep.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'SFTP File Access',
    path: '/blog/sftp-file-access',
    description:
      'SFTP replaces FTPS for instance files. Ed25519 SSH keys, GitHub-style registration, and docs for Mac, Windows, Linux, and popular clients.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'Your logs.db Might Be Gigabytes of Empty Space',
    path: '/blog/pocketbase-sqlite-vacuum',
    description:
      'PocketBase log retention deletes rows but SQLite keeps the disk. Our Mothership logs.db was 6.5 GB for ~1,800 records. Vacuum fixed it in seconds.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'Instance Status That Survives Restarts',
    path: '/blog/runtime-status-sync',
    description:
      'Dashboard instance status stays honest across Mothership and edge restarts. One mirror sync handshake instead of stale guesses.',
    date: 'Jun 13, 2026',
    author: 'capn',
  },
  {
    title: 'A Leaner Runtime on Node 24',
    path: '/blog/node-24-leaner-runtime',
    description:
      'We dropped 100+ lockfile packages by moving to Node 24 natives. Same hosting behavior, lighter stack, and deliberate prep for a future Bun soak.',
    date: 'Jun 12, 2026',
    author: 'capn',
  },
  {
    title: 'Running, Sleeping, and Power Off',
    path: '/blog/instance-power-status',
    description:
      'Power off now stops your container for real. The dashboard shows Running vs Sleeping, and destructive actions wait for shutdown.',
    date: 'Jun 12, 2026',
    author: 'capn',
  },
  {
    title: 'Dashboard UI: Web Awesome Migration',
    path: '/blog/web-awesome-migration',
    description:
      'The dashboard now runs on Web Awesome: cleaner components, readable docs, and a simpler frontend stack.',
    date: 'Jun 12, 2026',
    author: 'capn',
  },
  {
    title: 'Direct PocketBase Version Sync',
    path: '/blog/pocketbase-version-sync',
    description:
      'PocketBase versions now sync directly from GitHub. No Gobot middleman, faster updates, no token required.',
    date: 'Jun 12, 2026',
    author: 'capn',
  },
  {
    title: 'PocketHost 2.3.0',
    path: '/blog/pockethost-2-3-0-release',
    description:
      'Our biggest release yet! Introducing webhooks, automated custom domains, hard paywall, and major infrastructure improvements.',
    date: 'Jul 22, 2025',
    author: 'capn',
  },
  {
    title: 'Webhooks Support is Here',
    path: '/blog/webhooks-launch',
    description: 'Automate your PocketBase workflows with our new webhooks feature - more reliable than cron jobs.',
    date: 'Jul 22, 2025',
    author: 'capn',
  },
  {
    title: 'Enhanced Data Synchronization with MothershipMirrorService',
    path: '/blog/mothership-mirror-service',
    description: 'Enhanced infrastructure for better data synchronization and dashboard performance.',
    date: 'Jul 21, 2025',
    author: 'capn',
  },
  {
    title: 'Automated Custom Domains with Cloudflare',
    path: '/blog/custom-domains-automation',
    description: 'Fully automated custom domain setup with Cloudflare integration and SSL certificates.',
    date: 'Jul 19, 2025',
    author: 'capn',
  },
  {
    title: 'Building a Realtime Game: Kingdom',
    path: '/blog/kingdom',
    description: 'Follow along as we build a realtime multiplayer game using PocketBase.',
    date: 'Jan 8, 2025',
    author: 'capn',
  },
  {
    title: 'Hard paywall is live',
    path: '/blog/hard-paywall-is-live',
    description: 'The hard paywall is now active for new users, with existing users grandfathered in.',
    date: 'Jan 10, 2025',
    author: 'capn',
  },
  {
    title: 'YouTube Dev Channel is Live',
    path: '/blog/announcing-dev-channel',
    description: 'Our new YouTube channel for PocketBase tutorials and ecosystem content.',
    date: 'Jan 8, 2025',
    author: 'capn',
  },
  {
    title: 'Moving to a hard paywall',
    path: '/blog/hard-paywall',
    description: "Why we're moving to a hard paywall model and what it means for the community.",
    date: 'Jan 6, 2025',
    author: 'capn',
  },
  {
    title: 'Why no SLA?',
    path: '/blog/why-no-sla',
    description: 'Why PocketHost does not offer a formal SLA and what that means for reliability expectations.',
    date: 'Jan 1, 2025',
    author: 'capn',
  },
  {
    title: 'PocketHost is live in 40+ countries',
    path: '/blog/live-in-40-countries',
    description: 'PocketHost hosting is now available in more than 40 countries worldwide.',
    date: 'Dec 25, 2024',
    author: 'capn',
  },
  {
    title: 'Announcing Pocker',
    path: '/blog/announcing-pocker',
    description: 'Introducing our custom container solution for global PocketBase hosting.',
    date: 'Dec 20, 2024',
    author: 'capn',
  },
  {
    title: "What's Next For PocketBase (Early Morning Dev Round 1)",
    path: '/blog/early-morning-dev-1',
    description: 'Early Morning Dev Round 1. Thoughts on where PocketBase is headed next.',
  },
]
