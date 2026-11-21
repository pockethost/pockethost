import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { docsNavFlat } from './docs-nav'

const docsDir = __dirname
const pageSlugs = readdirSync(docsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(docsDir, d.name, '+page.md')))
  .map((d) => d.name)
const navSlugs = docsNavFlat.map((d) => d.slug)
// pages kept out of the nav on purpose: ftp (SFTP) is linked only from the dashboard's SFTP screens until SFTP retires
// on Feb 6, 2027; delete the page and this entry then
const unlisted = ['ftp']

describe('docs nav', () => {
  it('lists every docs page', () => {
    expect(pageSlugs.filter((s) => !navSlugs.includes(s) && !unlisted.includes(s))).toEqual([])
  })

  it('only links to pages that exist', () => {
    expect(navSlugs.filter((s) => !pageSlugs.includes(s))).toEqual([])
  })

  it('has no duplicate slugs', () => {
    expect(new Set(navSlugs).size).toBe(navSlugs.length)
  })
})
