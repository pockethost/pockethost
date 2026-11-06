import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { docsNavFlat } from './docs-nav'

const docsDir = __dirname
const pageSlugs = readdirSync(docsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(docsDir, d.name, '+page.md')))
  .map((d) => d.name)
const navSlugs = docsNavFlat.map((d) => d.slug)

describe('docs nav', () => {
  it('lists every docs page', () => {
    expect(pageSlugs.filter((s) => !navSlugs.includes(s))).toEqual([])
  })

  it('only links to pages that exist', () => {
    expect(navSlugs.filter((s) => !pageSlugs.includes(s))).toEqual([])
  })

  it('has no duplicate slugs', () => {
    expect(new Set(navSlugs).size).toBe(navSlugs.length)
  })
})
