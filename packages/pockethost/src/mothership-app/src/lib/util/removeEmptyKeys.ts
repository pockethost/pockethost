export const removeEmptyKeys = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value != null)) as T
