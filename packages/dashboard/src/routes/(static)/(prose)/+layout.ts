import type { LayoutLoad } from './$types'

const pages: Record<string, { title: string; description: string }> = {
  '3.0': {
    title: 'PocketHost 3.0',
    description:
      'What is changing in PocketHost 3.0: SFTP, Flounder sunset, Pay Per PocketBase limits, and how to get ready.',
  },
  about: {
    title: 'About PocketHost',
    description: 'Our journey, open source commitment, and community.',
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'PocketHost privacy policy.',
  },
  terms: {
    title: 'Terms of Service',
    description: 'PocketHost terms of service.',
  },
}

export const load: LayoutLoad = async ({ url }) => {
  const slug = url.pathname.split('/').filter(Boolean).pop() ?? ''
  const meta = pages[slug]

  return {
    url: url.href,
    meta: {
      title: meta?.title ?? 'PocketHost',
      pageTitle: meta ? `${meta.title} - PocketHost` : 'PocketHost',
      description: meta?.description ?? '',
    },
  }
}
