import { BackupRecordId, InstanceId } from '@pockethost/common'
import { statSync } from 'fs'
import { resolve } from 'path'
import { chdir } from 'process'
import { DAEMON_PB_DATA_DIR } from '../constants'
import { pexec } from '../migrate/pexec'
import { dbg } from './dbg'
import { ensureDirExists } from './ensureDirExists'

export const backupInstance = async (
  instanceId: InstanceId,
  backupId: BackupRecordId
) => {
  const dataRoot = resolve(DAEMON_PB_DATA_DIR, instanceId)
  const backupRoot = resolve(dataRoot, 'backup')
  const backupFile = resolve(backupRoot, `${backupId}.tgz`)
  dbg(`Backing up ${dataRoot}`)
  chdir(dataRoot)
  ensureDirExists(backupRoot)
  await pexec(`tar -czvf ${backupFile} pb_data`)
  const stats = statSync(backupFile)
  const bytes = stats.size
  return bytes
}
