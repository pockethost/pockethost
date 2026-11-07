export const DEFAULT_INCLUDES = [
  `pb_*`,
  'pb_*/**/*',
  `package.json`,
  `bun.lockb`,
  `bun.lock`,
  `patches`,
  `patches/**/*`,
]

export const DEFAULT_EXCLUDES = [`pb_data`, `pb_data/**/*`]

export const mergeDeployExcludes = (
  excludeDefaults: readonly string[],
  exclude: string[]
) => [...excludeDefaults, ...exclude]

export const shouldSyncFile = (
  file: string,
  include: string[],
  exclude: string[],
  match: (paths: string[], patterns: string[]) => string[]
) => {
  const isIncluded = match([file], include).length > 0
  const isExcluded = match([file], exclude).length > 0
  return isIncluded && !isExcluded
}
