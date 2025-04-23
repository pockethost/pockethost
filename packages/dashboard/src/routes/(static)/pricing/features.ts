import { DISCORD_URL } from '$src/env'
import regions from './regions.png?enhanced'

export const features = [
  {
    title: 'Risk-free Trial',
    description: `Test-drive PocketHost for up to 7 days. Credit card required.`,
  },

  {
    title: 'Global Infrastructure',
    description:
      'PocketHost operates across 40+ regional edge locations. Users connect through our distributed network of edge servers, while our enterprise-grade internal VPN ensures optimal routing to your data. Experience consistent 10-30ms edge latency for superior application performance.',
    img: regions,
  },
  {
    title: 'Developer-Friendly Pricing',
    description: `Get started for just $5 per instance. After 5 instances, it's free.`,
  },
  {
    title: 'Unmetered',
    description:
      'Enjoy unmetered bandwidth, storage, and computational resources under our <a href="/docs/pricing-ethos" class="link">fair use policy</a>.',
  },

  {
    title: 'FTP access',
    description: 'Easily access your data from any FTP client.',
  },
  {
    title: 'PocketBase Versions',
    description: `We support the latest patch of every minor release of PocketBase.`,
  },
  {
    title: 'Secure',
    description:
      'Infrastructure secured with RSA-2048 encryption and industry-standard security protocols.',
  },

  {
    title: 'Community',
    description: `Access to <a href="${DISCORD_URL}" class="link">Discord</a> with over 1,500 developers and technical resources.`,
  },
  {
    title: 'Priority Support',
    description: `Access to private support channels on <a href="${DISCORD_URL}" class="link">Discord</a>.`,
  },
  {
    title: 'Custom Domains',
    description:
      'Seamless custom domain integration for your PocketHost instances.',
  },
  {
    title: 'Lifetime Option',
    description:
      'Limited-time opportunity for lifetime Pro tier access (up to 250 instances) with a single payment.',
  },
  {
    title: 'Early Access',
    description: `Get your hands on our experimental <a href="/blog/announcing-pocker" class="link">Pocker</a> tech before anyone else. Help us push the boundaries of what's possible.`,
  },
  {
    title: 'Reliable',
    description:
      'Industry-leading 99.95% uptime guarantee ensures consistent application availability.',
  },
  {
    title: 'Managed',
    description:
      'Comprehensive infrastructure management including scaling, backups, and maintenance operations.',
  },
  {
    title: 'Affordable',
    description:
      'Why waste time managing servers? Put your resources into building the next big thing. Your wallet (and your future app) will thank you.',
  },
  {
    title: 'Open Source',
    description:
      'Your subscription directly supports the development of open-source PocketBase and PocketHost projects.',
  },
]
