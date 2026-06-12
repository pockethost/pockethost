export const POCKETBASE_VERSIONS_SETTING = 'pocketbase_versions'

export type PocketbaseVersionEntry = {
  range: string
  patch: string
}

export type PocketbaseVersionsValue = {
  versions: PocketbaseVersionEntry[]
  syncedAt?: string
}

const parsePocketbaseVersionsValue = (raw: unknown): PocketbaseVersionsValue | null => {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PocketbaseVersionsValue
    } catch {
      return null
    }
  }
  return raw as PocketbaseVersionsValue
}

export const readPocketbaseVersions = (): PocketbaseVersionEntry[] => {
  try {
    const record = $app.dao().findFirstRecordByData('settings', 'name', POCKETBASE_VERSIONS_SETTING)
    const value = parsePocketbaseVersionsValue(record.getString('value'))
    if (!value?.versions?.length) return []
    return value.versions
  } catch {
    return []
  }
}

/** Minor wildcard versions (e.g. `0.22.*`) from mothership settings */
export const listVersions = (): string[] => readPocketbaseVersions().map((entry) => entry.range)
