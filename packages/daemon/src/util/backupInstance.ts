import { InstanceId } from '@pockethost/common'
import { resolve } from 'path'
import { chdir } from 'process'
import { DAEMON_PB_DATA_DIR } from '../constants'
import { pexec } from '../migrate/pexec'
import { dbg } from './dbg'
import { ensureDirExists } from './ensureDirExists'

export const backupInstance = async (instanceId: InstanceId) => {
  const dataRoot = resolve(DAEMON_PB_DATA_DIR, instanceId)
  const backupRoot = resolve(dataRoot, 'backup')
  dbg(`Backing up ${dataRoot}`)
  chdir(dataRoot)
  ensureDirExists(backupRoot)
  await pexec(`tar -czvf ${backupRoot}/${+new Date()}.tgz pb_data`)
}
