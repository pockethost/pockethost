import { existsSync } from 'fs'
import env from 'env-var'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { PHIO_CONFIG_FILE } from './constants'

const phioPackageRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)

const isInsidePhioCliPackage = (dir: string): boolean => {
  const rel = relative(phioPackageRoot, dir)
  return rel === '' || (!rel.startsWith('..') && rel !== '')
}

const resolveStartDir = (startDir: string): string => {
  if (isInsidePhioCliPackage(startDir)) {
    return dirname(phioPackageRoot)
  }
  return startDir
}

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

const hasPhioConfig = (dir: string): boolean => {
  return existsSync(join(dir, PHIO_CONFIG_FILE)) && !isInsidePhioCliPackage(dir)
}

const hasProjectPackageJson = (dir: string): boolean => {
  return existsSync(join(dir, 'package.json')) && !isInsidePhioCliPackage(dir)
}

export const findPhioRoot = (
  startDir = env.get('PHIO_PROJECT_DIR').asString() ??
    process.env.INIT_CWD ??
    process.cwd()
): string => {
  const resolvedStart = resolveStartDir(startDir)

  const phioConfigRoot = walkUp(resolvedStart, hasPhioConfig)
  if (phioConfigRoot) {
    return phioConfigRoot
  }

  const packageJsonRoot = walkUp(resolvedStart, hasProjectPackageJson)
  if (packageJsonRoot) {
    return packageJsonRoot
  }

  return resolvedStart
}

export const ensurePhioRoot = (): string => {
  const root = findPhioRoot()
  process.chdir(root)
  return root
}
