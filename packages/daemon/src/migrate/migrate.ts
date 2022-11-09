import { binFor, InstanceStatus } from '@pockethost/common'
import { renameSync } from 'fs'
import { resolve } from 'path'
import { chdir } from 'process'
import {
  DAEMON_PB_BIN_DIR,
  DAEMON_PB_DATA_DIR,
  PUBLIC_PB_SUBDOMAIN,
} from '../constants'
import { error } from '../util/dbg'
import { applyDbMigrations } from './applyDbMigrations'
import { pexec } from './pexec'

const PB_BIN = `${DAEMON_PB_BIN_DIR}/${binFor('lollipop')}`
const DATA_ROOT = `${DAEMON_PB_DATA_DIR}/${PUBLIC_PB_SUBDOMAIN}`

;(async () => {
  console.log(`Backing up`)
  chdir(DATA_ROOT)
  await pexec(`tar -czvf ${+new Date()}.tgz pb_data`)

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
        status: instance.status || InstanceStatus.Idle,
        platform: instance.platform || 'ermine',
        version: instance.version || 'latest',
      }
    })
  })
})()
