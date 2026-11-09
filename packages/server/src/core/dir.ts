import { Logger } from '@'
import { existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { mkInstanceDataPath } from '../constants'

type Suspendable = { suspension?: string | null } | null | undefined

/**
 * The mirror creates folders for every instance it sees. Suspended instances (or instances of suspended accounts) can't
 * run or be reached over SFTP, and archived ones have had their data moved off the box, so their folders are not
 * created.
 */
export const shouldEnsureInstanceDirectories = (instance: Suspendable, owner: Suspendable) =>
  !instance?.suspension?.trim() && !owner?.suspension?.trim()

/** True when `dir` contains at least one regular file anywhere below it. */
export const dirHasAnyFile = (dir: string): boolean => {
  if (!existsSync(dir)) return false
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) return true
    if (entry.isDirectory() && dirHasAnyFile(join(dir, entry.name))) return true
  }
  return false
}

export function ensureInstanceDirectoryStructure(instanceId: string, logger: Logger) {
  const { dbg } = logger
  ;['pb_data', 'pb_migrations', 'pb_public', 'logs', 'pb_hooks'].forEach((dir) => {
    const path = mkInstanceDataPath(instanceId, dir)
    if (!existsSync(path)) {
      dbg(`Creating ${path}`)
      mkdirSync(path, { recursive: true })
    }
  })
}
