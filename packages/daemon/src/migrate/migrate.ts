import { binFor, InstanceStatus } from '@pockethost/common'
import { renameSync } from 'fs'
import { resolve } from 'path'
import {
  DAEMON_PB_BIN_DIR,
  DAEMON_PB_DATA_DIR,
  PUBLIC_PB_SUBDOMAIN,
} from '../constants'
import { backupInstance } from '../util/backupInstance'
import { error } from '../util/dbg'
import { applyDbMigrations } from './applyDbMigrations'
import { pexec } from './pexec'

const PB_BIN = resolve(DAEMON_PB_BIN_DIR, binFor('lollipop'))

;(async () => {
  await backupInstance(
    PUBLIC_PB_SUBDOMAIN,
    `${+new Date()}`,
    async (progress) => {
      console.log(progress)
    }
  )

  console.log(`Upgrading`)
  await pexec(`${PB_BIN} upgrade --dir=pb_data`)

  await applyDbMigrations(async (client) => {
    await client.updateInstances((instance) => {
      const src = resolve(DAEMON_PB_DATA_DIR, instance.subdomain)
      const dst = resolve(DAEMON_PB_DATA_DIR, instance.id)
      try {
        renameSync(src, dst)
      } catch (e) {
        error(`${e}`)
      }
      return {
        status: InstanceStatus.Idle,
        platform: instance.platform || 'ermine',
        version: instance.version || 'latest',
      }
    })
  })
})()
