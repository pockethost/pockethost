import {
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  PocketBase,
} from '@'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Shared helpers for edge maintenance jobs (archive, disk-usage). */

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

/** Run `fn` over `items` with at most `limit` in flight; results keep input order. */
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker))
  return results
}

/** Parse the first line of `du -sk` output into bytes, or null if it has no number. */
export const parseDuKilobytes = (stdout: string): number | null => {
  const kb = parseInt(stdout.split(`\t`)[0] ?? ``, 10)
  return Number.isFinite(kb) ? kb * 1024 : null
}

/**
 * Disk usage of `dir` in bytes, measured with `du -sk` at the lowest CPU and I/O priority. Symlinks are not followed.
 * du exits non-zero when a file vanishes or can't be read mid-walk but still prints a total; that total is used.
 */
export const dirSizeBytes = async (dir: string): Promise<number> => {
  let stdout: string
  try {
    ;({ stdout } = await execFileAsync(`nice`, [`-n`, `19`, `ionice`, `-c`, `2`, `-n`, `7`, `du`, `-sk`, dir]))
  } catch (e) {
    stdout = (e as { stdout?: string }).stdout ?? ``
    const bytes = parseDuKilobytes(stdout)
    if (bytes === null) throw e
    return bytes
  }
  const bytes = parseDuKilobytes(stdout)
  if (bytes === null) throw new Error(`could not parse du output for ${dir}: ${JSON.stringify(stdout)}`)
  return bytes
}

/** Admin PocketBase client for the mothership. */
export const connectMothership = async () => {
  const { client } = await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
    logger: LoggerService(),
  })
  return client.client as PocketBase
}
