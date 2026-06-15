import { maxSatisfying } from 'semver'

export const maxSatisfyingVersionFromList = (
  versions: string[],
  range: string,
  options: { includePrerelease?: boolean } = {}
): string | null => {
  const match = maxSatisfying(versions, range, { includePrerelease: false, ...options })
  return match ?? null
}
