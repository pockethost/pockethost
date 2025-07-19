import { reduce } from '@s-libs/micro-dash'

export const removeEmptyKeys = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized = reduce(
    obj,
    (acc, value, key) => {
      if (value !== null && value !== undefined) {
        acc[key] = value
      }
      return acc
    },
    {} as T
  )
  return sanitized
}
