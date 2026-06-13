import {
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  PocketBase,
} from '@'
import type { SemVer } from 'semver'

export const POCKETBASE_VERSIONS_SETTING = 'pocketbase_versions'

export type PocketbaseVersionEntry = {
  range: string
  patch: string
}

export type PocketbaseVersionsValue = {
  versions: PocketbaseVersionEntry[]
  syncedAt?: string
}

export const mkVersionCatalog = (versions: SemVer[]): PocketbaseVersionEntry[] =>
  versions.map((version) => ({
    range: `${version.major}.${version.minor}.*`,
    patch: version.format(),
  }))

export const mkVersionCatalogFromPatches = (patches: string[]): PocketbaseVersionEntry[] => {
  const entries: PocketbaseVersionEntry[] = []
  const seen = new Set<string>()

  for (const patch of patches) {
    const [major, minor] = patch.split('.')
    if (!major || !minor) continue

    const range = `${major}.${minor}.*`
    if (seen.has(range)) continue

    seen.add(range)
    entries.push({ range, patch })
  }

  return entries
}

export const syncMothershipVersions = async (versions: PocketbaseVersionEntry[]) => {
  const { info, warn } = LoggerService().create('syncMothershipVersions')
  const mothershipUrl = MOTHERSHIP_URL()

  try {
    const client = new PocketBase(mothershipUrl)
    await client.admins.authWithPassword(MOTHERSHIP_ADMIN_USERNAME(), MOTHERSHIP_ADMIN_PASSWORD())

    const value: PocketbaseVersionsValue = {
      versions,
      syncedAt: new Date().toISOString(),
    }

    const settings = client.collection('settings')
    const payload = { name: POCKETBASE_VERSIONS_SETTING, value }

    try {
      const existing = await settings.getFirstListItem(`name="${POCKETBASE_VERSIONS_SETTING}"`)
      await settings.update(existing.id, payload)
    } catch {
      await settings.create(payload)
    }

    info(`Synced ${versions.length} pocketbase versions to mothership`)
    return true
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    warn(
      `Skipped mothership version sync (${mothershipUrl} unreachable). Run \`serve\` or \`mothership serve\` to sync. ${message}`
    )
    return false
  }
}
