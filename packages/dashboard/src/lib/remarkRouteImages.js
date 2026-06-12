import { visit } from 'unist-util-visit'
import path from 'node:path'

function routeUrlBase(filePath) {
  const routesMarker = `${path.sep}routes${path.sep}`
  const routesIdx = filePath.indexOf(routesMarker)
  if (routesIdx === -1) return null

  const routeDir = path.dirname(filePath.slice(routesIdx + routesMarker.length))
  return (
    '/' +
    routeDir
      .split(path.sep)
      .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
      .join('/')
  )
}

/** Rewrite co-located markdown images to /generated/... for static deploy. */
export function remarkRouteImages() {
  return (tree, file) => {
    const filePath = file.path || file.history?.[0]
    const urlBase = filePath ? routeUrlBase(filePath) : null
    if (!urlBase) return

    visit(tree, 'image', (node) => {
      const url = node.url
      if (!url || url.startsWith('http') || url.startsWith('/')) return
      node.url = `/generated${urlBase}/${url.replace(/^\.\//, '')}`
    })
  }
}

/** Rehype pass for img[src] after markdown → HTML (used by mdsvex +page.md pipeline). */
export function rehypeRouteImages() {
  return (tree, file) => {
    const filePath = file.path || file.history?.[0]
    const urlBase = filePath ? routeUrlBase(filePath) : null
    if (!urlBase) return

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return
      const src = node.properties?.src
      if (typeof src !== 'string' || src.startsWith('http') || src.startsWith('/')) return
      node.properties.src = `/generated${urlBase}/${src.replace(/^\.\//, '')}`
    })
  }
}
