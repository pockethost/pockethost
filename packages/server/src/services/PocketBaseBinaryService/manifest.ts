import { createHash } from 'node:crypto'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rcompare, valid } from 'semver'

/** Reading and writing versions.json, and building entries from a host's published files. */

export const MANIFEST_PATH = fileURLToPath(new URL('./versions.json', import.meta.url))

const PLATFORMS = ['linux_amd64', 'linux_arm64'] as const
const HOST_ORDER = ['gani', 'github'] as const

type HostId = (typeof HOST_ORDER)[number]
type Platform = (typeof PLATFORMS)[number]
export type ManifestEntry = { host: HostId; sha256: Partial<Record<Platform, string>> }
export type Manifest = { hosts: Record<HostId, string>; versions: Record<string, ManifestEntry> }

export const readManifest = (path = MANIFEST_PATH): Manifest => JSON.parse(readFileSync(path, 'utf8'))

/** Sorted newest first. Written to a temp file and renamed so a concurrent reader never sees half a file. */
export const writeManifest = (manifest: Manifest, path = MANIFEST_PATH) => {
  const versions = Object.fromEntries(Object.entries(manifest.versions).sort(([a], [b]) => rcompare(a, b)))
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify({ ...manifest, versions }, null, 2) + '\n')
  renameSync(tmp, path)
}

const mkUrl = (manifest: Manifest, host: HostId, version: string, file: string) =>
  manifest.hosts[host].replaceAll('{version}', version).replaceAll('{file}', file)

const exists = async (url: string) => (await fetch(url, { method: 'HEAD', redirect: 'follow' })).ok

const sha256OfUrl = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`)
  return createHash('sha256')
    .update(Buffer.from(await res.arrayBuffer()))
    .digest('hex')
}

/**
 * Finds the first host serving `version` (ganigeorgiev.com, then archived GitHub) and records the sha256 of its Linux
 * zips from that host's checksums.txt. With `allowHashFallback`, releases without checksums.txt are hashed from the
 * downloads instead; otherwise they're rejected.
 */
export const resolveEntry = async (manifest: Manifest, version: string, { allowHashFallback = false } = {}) => {
  const probe = `pocketbase_${version}_linux_amd64.zip`
  for (const host of HOST_ORDER) {
    if (!(await exists(mkUrl(manifest, host, version, probe)))) continue

    const sums = new Map<string, string>()
    const res = await fetch(mkUrl(manifest, host, version, 'checksums.txt'))
    if (res.ok) {
      for (const line of (await res.text()).split('\n')) {
        const [hash, file] = line.trim().split(/\s+/)
        if (hash && file) sums.set(file, hash.toLowerCase())
      }
    } else if (!allowHashFallback) {
      throw new Error(`PocketBase ${version} on ${host} has no checksums.txt`)
    }

    const sha256: ManifestEntry['sha256'] = {}
    for (const platform of PLATFORMS) {
      const file = `pocketbase_${version}_${platform}.zip`
      const url = mkUrl(manifest, host, version, file)
      if (sums.has(file)) sha256[platform] = sums.get(file)
      else if (allowHashFallback && (await exists(url))) sha256[platform] = await sha256OfUrl(url)
    }
    if (!sha256.linux_amd64) throw new Error(`PocketBase ${version} on ${host} has no linux_amd64 checksum`)
    return { host, sha256, hadChecksums: res.ok }
  }
  throw new Error(`No host serves PocketBase ${version} yet`)
}

/**
 * Adds (or refreshes) releases in versions.json, saving after each one. Returns what was added and what failed, so a
 * release whose binaries aren't published yet is retried on the next run.
 */
export const addVersions = async (versions: string[], { path = MANIFEST_PATH, allowHashFallback = false } = {}) => {
  const added: { version: string; host: HostId; platforms: string[]; hadChecksums: boolean }[] = []
  const failed: { version: string; reason: string }[] = []

  for (const raw of versions) {
    const version = valid(raw.replace(/^v/i, ''))
    if (!version) {
      failed.push({ version: raw, reason: 'not a version' })
      continue
    }
    try {
      const manifest = readManifest(path)
      const entry = await resolveEntry(manifest, version, { allowHashFallback })
      manifest.versions[version] = { host: entry.host, sha256: entry.sha256 }
      writeManifest(manifest, path)
      added.push({ version, host: entry.host, platforms: Object.keys(entry.sha256), hadChecksums: entry.hadChecksums })
    } catch (e) {
      failed.push({ version, reason: e instanceof Error ? e.message : String(e) })
    }
  }

  return { added, failed }
}
