import { existsSync } from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import {
  envVar,
  LEGACY_PROJECT_CONFIG_FILE,
  PROJECT_CONFIG_FILE,
} from './constants'

const walkUp = (
  startDir: string,
  predicate: (dir: string) => boolean
): string | null => {
  let dir = startDir
  while (true) {
    if (predicate(dir)) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

/**
 * Root of the CLI package itself: the nearest folder above this module with a
 * package.json. Works from `src/lib/` (dev, tsx) and `dist/` (bundled).
 */
const cliPackageRoot =
  walkUp(dirname(fileURLToPath(import.meta.url)), (dir) =>
    existsSync(join(dir, 'package.json'))
  ) ?? dirname(fileURLToPath(import.meta.url))

const isInsideCliPackage = (dir: string): boolean => {
  const rel = relative(cliPackageRoot, dir)
  return rel === '' || !rel.startsWith('..')
}

/** `pnpm dev` from inside the CLI package should act on the folder above it. */
const resolveStartDir = (startDir: string): string => {
  if (isInsideCliPackage(startDir)) {
    return dirname(cliPackageRoot)
  }
  return startDir
}

const hasProjectConfig = (dir: string): boolean => {
  return (
    (existsSync(join(dir, PROJECT_CONFIG_FILE)) ||
      existsSync(join(dir, LEGACY_PROJECT_CONFIG_FILE))) &&
    !isInsideCliPackage(dir)
  )
}

const hasProjectPackageJson = (dir: string): boolean => {
  return existsSync(join(dir, 'package.json')) && !isInsideCliPackage(dir)
}

export const findProjectRoot = (
  startDir = envVar('PROJECT_DIR') ?? process.env.INIT_CWD ?? process.cwd()
): string => {
  const resolvedStart = resolveStartDir(startDir)

  const configRoot = walkUp(resolvedStart, hasProjectConfig)
  if (configRoot) {
    return configRoot
  }

  const packageJsonRoot = walkUp(resolvedStart, hasProjectPackageJson)
  if (packageJsonRoot) {
    return packageJsonRoot
  }

  return resolvedStart
}

export const ensureProjectRoot = (): string => {
  const root = findProjectRoot()
  process.chdir(root)
  return root
}
