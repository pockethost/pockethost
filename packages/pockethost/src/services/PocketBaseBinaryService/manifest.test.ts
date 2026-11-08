import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MANIFEST_PATH, readManifest, writeManifest } from './manifest'

describe('manifest read/write', () => {
  it('points at the committed versions.json', () => {
    expect(readManifest(MANIFEST_PATH).versions['0.41.1']?.host).toBe('gani')
  })

  it('round-trips, sorts newest first, and leaves no temp file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pb-manifest-'))
    const path = join(dir, 'versions.json')
    const manifest = readManifest()
    const shuffled = { ...manifest, versions: Object.fromEntries(Object.entries(manifest.versions).reverse()) }
    writeManifest(shuffled, path)

    expect(readManifest(path)).toEqual(manifest)
    expect(readFileSync(path, 'utf8')).toBe(readFileSync(MANIFEST_PATH, 'utf8'))
    expect(readdirSync(dir)).toEqual(['versions.json'])
  })
})
