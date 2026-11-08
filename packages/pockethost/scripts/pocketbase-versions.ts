/**
 * Maintains src/services/PocketBaseBinaryService/versions.json, the list of PocketBase releases PocketHost serves.
 *
 * Pnpm pb:versions add 0.41.2 [0.22.59 ...] add (or refresh) releases pnpm pb:versions check list upstream releases
 * missing from the manifest (exit 1 if any)
 *
 * For each release it finds the host that serves it (ganigeorgiev.com first, then the archived GitHub repo), reads that
 * host's checksums.txt, and records sha256 for the Linux builds we run. If a release has no checksums.txt, it downloads
 * the zips and hashes them.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compare, parse, prerelease, rcompare, valid } from 'semver'

const MANIFEST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/services/PocketBaseBinaryService/versions.json'
)
const UPSTREAM_GIT_REFS = 'https://ganigeorgiev.com/git/pocketbase/pocketbase/info/refs?service=git-upload-pack'
const PLATFORMS = ['linux_amd64', 'linux_arm64'] as const
const HOST_ORDER = ['gani', 'github'] as const

type HostId = (typeof HOST_ORDER)[number]
type Manifest = {
  hosts: Record<HostId, string>
  versions: Record<string, { host: HostId; sha256: Partial<Record<(typeof PLATFORMS)[number], string>> }>
}

const readManifest = (): Manifest => JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))

const writeManifest = (manifest: Manifest) => {
  const versions = Object.fromEntries(Object.entries(manifest.versions).sort(([a], [b]) => rcompare(a, b)))
  writeFileSync(MANIFEST_PATH, JSON.stringify({ ...manifest, versions }, null, 2) + '\n')
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

const resolveEntry = async (manifest: Manifest, version: string) => {
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
    }

    const sha256: Manifest['versions'][string]['sha256'] = {}
    for (const platform of PLATFORMS) {
      const file = `pocketbase_${version}_${platform}.zip`
      const url = mkUrl(manifest, host, version, file)
      if (sums.has(file)) sha256[platform] = sums.get(file)
      else if (await exists(url)) sha256[platform] = await sha256OfUrl(url)
    }
    return { host, sha256, hadChecksums: res.ok }
  }
  throw new Error(`No host serves PocketBase ${version}`)
}

const add = async (versions: string[]) => {
  const manifest = readManifest()
  for (const raw of versions) {
    const version = valid(raw.replace(/^v/i, ''))
    if (!version) throw new Error(`Not a version: ${raw}`)
    const entry = await resolveEntry(manifest, version)
    manifest.versions[version] = { host: entry.host, sha256: entry.sha256 }
    const platforms = Object.keys(entry.sha256).join(', ')
    console.log(
      `${version}: ${entry.host} [${platforms}]${entry.hadChecksums ? '' : ' (no checksums.txt, hashed downloads)'}`
    )
    writeManifest(manifest)
  }
}

const upstreamVersions = async () => {
  const res = await fetch(UPSTREAM_GIT_REFS)
  if (!res.ok) throw new Error(`GET ${UPSTREAM_GIT_REFS} failed (${res.status})`)
  const tags = new Set<string>()
  for (const [, tag] of (await res.text()).matchAll(/refs\/tags\/v([^\s^]+)/g)) {
    const version = parse(tag)
    if (version && !prerelease(version)) tags.add(version.format())
  }
  return [...tags].sort(compare)
}

/** Upstream releases newer than everything the manifest has for the same minor. */
const check = async () => {
  const known = Object.keys(readManifest().versions)
  const newestKnownByMinor = new Map<string, string>()
  for (const version of known) {
    const key = version.split('.').slice(0, 2).join('.')
    const current = newestKnownByMinor.get(key)
    if (!current || compare(version, current) > 0) newestKnownByMinor.set(key, version)
  }
  const newestKnown = known.sort(rcompare)[0]

  const missing = (await upstreamVersions()).filter((version) => {
    const current = newestKnownByMinor.get(version.split('.').slice(0, 2).join('.'))
    return current ? compare(version, current) > 0 : !newestKnown || compare(version, newestKnown) > 0
  })

  if (!missing.length) {
    console.log('Manifest is up to date with upstream tags.')
    return
  }
  console.log(`Missing upstream releases: ${missing.join(' ')}`)
  console.log(`Add them with: pnpm pb:versions add ${missing.join(' ')}`)
  process.exitCode = 1
}

const [command, ...args] = process.argv.slice(2)
if (command === 'add' && args.length) await add(args)
else if (command === 'check') await check()
else {
  console.error('Usage: pb:versions add <version...> | check')
  process.exitCode = 2
}
