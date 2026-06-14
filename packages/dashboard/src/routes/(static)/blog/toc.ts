export const toc = [
  {
    title: 'Auto Vacuum for Idle Instances',
    path: '/blog/auto-vacuum',
    description:
      'Nightly SQLite VACUUM on hibernated instances. On by default, toggle per instance, and skip running containers until they sleep.',
  },
  {
    title: 'SFTP File Access',
    path: '/blog/sftp-file-access',
    description:
      'SFTP replaces FTPS for instance files. Ed25519 SSH keys, GitHub-style registration, and docs for Mac, Windows, Linux, and popular clients.',
  },
  {
    title: 'Your logs.db Might Be Gigabytes of Empty Space',
    path: '/blog/pocketbase-sqlite-vacuum',
    description:
      'PocketBase log retention deletes rows but SQLite keeps the disk. Our Mothership logs.db was 6.5 GB for ~1,800 records — vacuum fixed it in seconds.',
  },
  {
    title: 'Instance Status That Survives Restarts',
    path: '/blog/runtime-status-sync',
    description:
      'Dashboard instance status stays honest across Mothership and edge restarts — one mirror sync handshake instead of stale guesses.',
  },
  {
    title: 'A Leaner Runtime on Node 24',
    path: '/blog/node-24-leaner-runtime',
    description:
      'We dropped 100+ lockfile packages by moving to Node 24 natives. Same hosting behavior, lighter stack, and deliberate prep for a future Bun soak.',
  },
  {
    title: 'Running, Sleeping, and Power Off',
    path: '/blog/instance-power-status',
    description:
      'Power off now stops your container for real. The dashboard shows Running vs Sleeping, and destructive actions wait for shutdown.',
  },
  {
    title: 'Dashboard UI: Web Awesome Migration',
    path: '/blog/web-awesome-migration',
    description:
      'The dashboard now runs on Web Awesome — cleaner components, readable docs, and a simpler frontend stack.',
  },
  {
    title: 'Direct PocketBase Version Sync',
    path: '/blog/pocketbase-version-sync',
    description: 'PocketBase versions now sync directly from GitHub — no Gobot middleman, faster updates, no token required.',
  },
  {
    title: 'PocketHost 2.3.0',
    path: '/blog/pockethost-2-3-0-release',
    description:
      'Our biggest release yet! Introducing webhooks, automated custom domains, hard paywall, and major infrastructure improvements.',
  },
  {
    title: 'Webhooks Support is Here',
    path: '/blog/webhooks-launch',
    description: 'Automate your PocketBase workflows with our new webhooks feature - more reliable than cron jobs.',
  },
  {
    title: 'Enhanced Data Synchronization with MothershipMirrorService',
    path: '/blog/mothership-mirror-service',
    description: 'Enhanced infrastructure for better data synchronization and dashboard performance.',
  },
  {
    title: 'Automated Custom Domains with Cloudflare',
    path: '/blog/custom-domains-automation',
    description: 'Fully automated custom domain setup with Cloudflare integration and SSL certificates.',
  },
  {
    title: 'Building a Realtime Game: Kingdom',
    path: '/blog/kingdom',
    description: 'Follow along as we build a realtime multiplayer game using PocketBase.',
  },
  {
    title: 'Hard paywall is live',
    path: '/blog/hard-paywall-is-live',
    description: 'The hard paywall is now active for new users, with existing users grandfathered in.',
  },
  {
    title: 'YouTube Dev Channel is Live',
    path: '/blog/announcing-dev-channel',
    description: 'Our new YouTube channel for PocketBase tutorials and ecosystem content.',
  },
  {
    title: 'Moving to a hard paywall',
    path: '/blog/hard-paywall',
    description: "Why we're moving to a hard paywall model and what it means for the community.",
  },
  {
    title: 'Why no SLA?',
    path: '/blog/why-no-sla',
    description: 'Why PocketHost does not offer a formal SLA and what that means for reliability expectations.',
  },
  {
    title: 'PocketHost is live in 40+ countries',
    path: '/blog/live-in-40-countries',
    description: 'PocketHost hosting is now available in more than 40 countries worldwide.',
  },
  {
    title: 'Announcing Pocker',
    path: '/blog/announcing-pocker',
    description: 'Introducing our custom container solution for global PocketBase hosting.',
  },
  {
    title: "What's Next For PocketBase (Early Morning Dev Round 1)",
    path: '/blog/early-morning-dev-1',
    description: 'Early Morning Dev Round 1 — thoughts on where PocketBase is headed next.',
  },
]
