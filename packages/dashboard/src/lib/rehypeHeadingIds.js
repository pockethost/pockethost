// @ts-nocheck
import { visit } from 'unist-util-visit'

const textOf = (node) => (node.type === 'text' ? node.value : (node.children || []).map(textOf).join(''))

/** `## Disk storage` → `disk-storage`, matching GitHub-style anchors. */
export const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

/** Give h2–h4 an `id` so `/docs/page#heading` links land on the heading. Repeated headings get `-1`, `-2`. */
export function rehypeHeadingIds() {
  return (tree) => {
    const seen = new Map()
    visit(tree, 'element', (node) => {
      if (!/^h[2-4]$/.test(node.tagName) || node.properties?.id) return
      const base = slugify(textOf(node))
      if (!base) return
      const n = seen.get(base) || 0
      seen.set(base, n + 1)
      node.properties = { ...node.properties, id: n ? `${base}-${n}` : base }
    })
  }
}
