import { BackupRecordId, InstanceId } from '@pockethost/common'
import { statSync } from 'fs'
import { basename, resolve } from 'path'
import { chdir, cwd } from 'process'
import { Database } from 'sqlite3'
import tmp from 'tmp'
import { DAEMON_PB_DATA_DIR } from '../constants'
import { pexec } from '../migrate/pexec'
import { dbg, error } from './dbg'
import { ensureDirExists } from './ensureDirExists'
import { safeCatch } from './safeAsync'

export type BackupProgress = {
  current: number
  total: number
}

export type ProgressInfo = {
  [src: string]: number
}
export type ProgressCallback = (info: ProgressInfo) => Promise<void>

export const PB_DATA_DIR = `pb_data`

export const execBackup = safeCatch(
  `execBackup`,
  (src: string, dst: string, progress?: ProgressCallback) => {
    const db = new Database(src)
    const backup = db.backup(dst)
    return new Promise<void>((resolve, reject) => {
      const _work = safeCatch(`_work`, async () => {
        if (backup.failed) {
          reject(
            `${src} Backup failed with error ${backup.message || 'Unknown'}`
          )
          return
        }
        if (backup.completed) {
          backup.finish()
          await progress?.({
            [basename(src)]: 1,
          })
          resolve()
          return
        }
        const pct =
          backup.remaining === -1 ? 0 : 1 - backup.remaining / backup.pageCount
        dbg(src, pct, backup.completed, backup.failed)
        await progress?.({
          [basename(src)]: pct,
        })
        if (backup.idle) {
          await new Promise<void>((resolve) => {
            backup.step(5, () => resolve())
          })
        }
        setTimeout(_work, 10)
      })
      _work()
    })
  }
)

export const backupInstance = safeCatch(
  `backupInstance`,
  async (
    instanceId: InstanceId,
    backupId: BackupRecordId,
    progress?: ProgressCallback
  ) => {
    const dataRoot = resolve(DAEMON_PB_DATA_DIR, instanceId)
    const backupTgzRoot = resolve(dataRoot, 'backup')
    const backupTgzFile = resolve(backupTgzRoot, `${backupId}.tgz`)
    const tmpObj = tmp.dirSync({
      unsafeCleanup: true,
    })
    const backupTmpTargetRoot = resolve(tmpObj.name)
    console.log({
      instanceId,
      dataRoot,
      backupTgzRoot,
      backupTgzFile,
      backupTmpTargetRoot,
    })
    const _cwd = cwd()
    try {
      dbg(`Backing up ${dataRoot}`)
      chdir(dataRoot)
      ensureDirExists(backupTgzRoot)
      ensureDirExists(resolve(backupTmpTargetRoot, PB_DATA_DIR))
      await Promise.all([
        execBackup(
          `pb_data/data.db`,
          resolve(backupTmpTargetRoot, PB_DATA_DIR, `data.db`),
          progress
        ),
        execBackup(
          `pb_data/logs.db`,
          resolve(backupTmpTargetRoot, PB_DATA_DIR, `logs.db`),
          progress
        ),
      ])
      chdir(backupTmpTargetRoot)
      await pexec(`tar -czvf ${backupTgzFile} ${PB_DATA_DIR}`)
      const stats = statSync(backupTgzFile)
      const bytes = stats.size
      return bytes
    } catch (e) {
      error(`${e}`)
      throw e
    } finally {
      console.log(`Removing again ${backupTmpTargetRoot}`)
      tmpObj.removeCallback()
      chdir(_cwd)
    }
  }
)
