import type { LayoutLoad } from './$types'
import { toc } from './toc'

const blogIndexDescription =
  'Stay updated with the latest PocketHost features, tutorials, and community news.'

export const load: LayoutLoad = async ({ url }) => {
  const pathname = url.pathname.replace(/\/$/, '') || '/'
  const isIndex = pathname === '/blog'
  const entry = toc.find((item) => item.path === pathname)

  const title = isIndex ? 'Blog' : (entry?.title ?? 'PocketHost Blog')
  const description = isIndex ? blogIndexDescription : (entry?.description ?? blogIndexDescription)
  const pageTitle = isIndex ? 'Blog - PocketHost' : `${title} - PocketHost`
  const ogType = isIndex ? 'website' : 'article'

  return {
    url: url.href,
    meta: {
      title,
      pageTitle,
      description,
      ogType,
    },
  }
}
