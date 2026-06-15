import { getAuthor } from '$lib/blog/authors'
import type { LayoutLoad } from './$types'
import { toc } from './toc'

const blogIndexDescription = 'Stay updated with the latest PocketHost features, tutorials, and community news.'

export const load: LayoutLoad = async ({ url }) => {
  const pathname = url.pathname.replace(/\/$/, '') || '/'
  const isIndex = pathname === '/blog'
  const entry = toc.find((item) => item.path === pathname)

  const title = isIndex ? 'Blog' : (entry?.title ?? 'PocketHost Blog')
  const description = isIndex ? blogIndexDescription : (entry?.description ?? blogIndexDescription)
  const pageTitle = isIndex ? 'Blog - PocketHost' : `${title} - PocketHost`
  const ogType = isIndex ? 'website' : 'article'
  const author = entry ? getAuthor(entry.author) : undefined
  const date = entry?.date

  return {
    url: url.href,
    meta: {
      title,
      pageTitle,
      description,
      ogType,
    },
    author,
    date,
  }
}
