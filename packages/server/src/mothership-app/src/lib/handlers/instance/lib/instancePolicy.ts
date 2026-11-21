/** Pure rules for instance endpoints (no JSVM globals), shared by the handlers and unit-tested. */

/** Pure: applies a `{ KEY: value | null }` patch to a secrets map (null removes the key). */
export const applySecretsPatch = (
  current: Record<string, string> | null | undefined,
  patch: Record<string, string | null>
): Record<string, string> => {
  const next: Record<string, string> = { ...(current ?? {}) }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete next[key]
    else next[key] = value
  }
  return next
}

export const SECRET_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/

/** Pure: validates secret keys. Returns the first bad key, or null. */
export const invalidSecretKey = (keys: string[]) => keys.find((k) => !SECRET_KEY_PATTERN.test(k)) ?? null

/** Same rule as GET /api/signup?name=… */
export const INSTANCE_NAME_PATTERN = /^[a-z][a-z0-9-]{2,39}$/

/** Pure: why an instance name is invalid, or null. */
export const instanceNameError = (name: string) =>
  INSTANCE_NAME_PATTERN.test(name)
    ? null
    : `Instance name must begin with a letter, be between 3-40 characters, and can only contain a-z, 0-9, and hyphen (-).`
