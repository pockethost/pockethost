/** JSON round-trip for $app.store() — Goja objects must not cross goroutines (see PB #7737). */

const parseAppStoreJson = <T>(raw: unknown): T | null => {
  if (raw == null || raw === '') return null
  if (typeof raw !== 'string') return null
  return JSON.parse(raw) as T
}

export const getAppStoreJson = <T>(key: string): T | null => {
  return parseAppStoreJson<T>($app.store().get(key))
}

export const setAppStoreJson = <T>(key: string, value: T): void => {
  $app.store().set(key, JSON.stringify(value))
}

export const updateAppStoreJson = <T>(key: string, updater: (old: T | null) => T): void => {
  $app.store().setFunc(key, (raw: unknown) => {
    const next = updater(parseAppStoreJson<T>(raw))
    return JSON.stringify(next)
  })
}
