import { execFile } from 'child_process'
import { basename, dirname } from 'path'
import { promisify } from 'util'
import { backupIceboxObjectPath, backupIceboxTrashRemote, IceboxObject } from './backupIcebox'

/**
 * Backup icebox storage through rclone (production uses IDrive e2). Zips are already compressed, so they're copied
 * as-is to `<remote>/<instanceId>/<zipName>`.
 */

const execFileAsync = promisify(execFile)
const S3_FLAGS = [`--s3-no-check-bucket`]

/** Copies one zip up. rclone checks size and hash after the transfer. */
export const uploadBackupZip = async (localPath: string, remote: string, instanceId: string) => {
  await execFileAsync(`nice`, [
    `-n`,
    `19`,
    `rclone`,
    `copyto`,
    ...S3_FLAGS,
    localPath,
    backupIceboxObjectPath(remote, instanceId, basename(localPath)),
  ])
}

/** Confirms the uploaded object matches the local file (size, plus hash when the backend has one). */
export const verifyBackupZip = async (localPath: string, remote: string, instanceId: string) => {
  const zipName = basename(localPath)
  await execFileAsync(`rclone`, [
    `check`,
    `--one-way`,
    `--include`,
    `/${zipName.replace(/[*?[\]{}\\]/g, `\\$&`)}`,
    dirname(localPath),
    backupIceboxObjectPath(remote, instanceId, ``).replace(/\/+$/, ''),
  ])
}

/** Lists stored zips with their upload time and, when rclone recorded it, the zip's original mtime. */
export const listBackupIcebox = async (remote: string): Promise<IceboxObject[]> => {
  try {
    // --use-server-modtime: ModTime is the upload time, so retention counts from the upload. -M adds the original
    // mtime, which rclone keeps as metadata.
    const { stdout } = await execFileAsync(
      `rclone`,
      [`lsjson`, `-R`, `--files-only`, `--use-server-modtime`, `-M`, remote],
      { maxBuffer: 256 * 1024 * 1024 }
    )
    const rows = JSON.parse(stdout) as Array<{
      Path: string
      Size: number
      ModTime: string
      Metadata?: { mtime?: string }
    }>
    return rows.flatMap((r) => {
      const [instanceId, zipName, ...rest] = r.Path.split(`/`)
      if (!instanceId || !zipName || rest.length) return []
      const orig = r.Metadata?.mtime ? Date.parse(r.Metadata.mtime) : NaN
      return [
        {
          instanceId,
          zipName,
          size: r.Size,
          modTimeMs: Date.parse(r.ModTime),
          origMtimeMs: Number.isFinite(orig) ? orig : null,
        },
      ]
    })
  } catch (e) {
    if (`${e}`.includes(`directory not found`)) return []
    throw e
  }
}

/** Moves a stored zip to the trash remote, keeping its path. */
export const trashBackupIceboxObject = async (remote: string, instanceId: string, zipName: string) => {
  await execFileAsync(`rclone`, [
    `moveto`,
    ...S3_FLAGS,
    backupIceboxObjectPath(remote, instanceId, zipName),
    backupIceboxObjectPath(backupIceboxTrashRemote(remote), instanceId, zipName),
  ])
}

export const deleteBackupIceboxObject = async (remote: string, instanceId: string, zipName: string) => {
  await execFileAsync(`rclone`, [`deletefile`, backupIceboxObjectPath(remote, instanceId, zipName)])
}

/** Short-lived presigned URL for a direct download from object storage. */
export const presignBackupZip = async (remote: string, instanceId: string, zipName: string, expire = `1h`) => {
  const { stdout } = await execFileAsync(`rclone`, [
    `link`,
    `--expire`,
    expire,
    backupIceboxObjectPath(remote, instanceId, zipName),
  ])
  const url = stdout.trim()
  if (!/^https?:\/\//.test(url)) throw new Error(`rclone link returned no URL`)
  return url
}
