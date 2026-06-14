import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { PHIO_CONFIG_FILE } from './constants'

const walkUp = (startDir: string, predicate: (dir: string) => boolean): string | null => {
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

export const findPhioRoot = (startDir = process.env.INIT_CWD ?? process.cwd()): string => {
  const phioConfigRoot = walkUp(startDir, (dir) => existsSync(join(dir, PHIO_CONFIG_FILE)))
  if (phioConfigRoot) {
    return phioConfigRoot
  }

  const packageJsonRoot = walkUp(startDir, (dir) => existsSync(join(dir, 'package.json')))
  if (packageJsonRoot) {
    return packageJsonRoot
  }

  return startDir
}

export const ensurePhioRoot = (): string => {
  const root = findPhioRoot()
  process.chdir(root)
  return root
}
