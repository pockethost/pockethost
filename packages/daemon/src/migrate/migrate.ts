import { binFor, InstanceStatus } from '@pockethost/common'
import { chdir } from 'process'
import {
  DAEMON_PB_BIN_DIR,
  DAEMON_PB_DATA_DIR,
  DAEMON_PB_PASSWORD,
  DAEMON_PB_PORT_BASE,
  DAEMON_PB_USERNAME,
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from '../constants'
import { createPbClient } from '../db/PbClient'
import { mkInternalUrl } from '../util/internal'
import { tryFetch } from '../util/tryFetch'
import { _spawn } from '../util/_spawn'
import { pexec } from './pexec'
import { schema } from './schema'

const PB_BIN = `${DAEMON_PB_BIN_DIR}/${binFor('lollipop')}`
const DATA_ROOT = `${DAEMON_PB_DATA_DIR}/${PUBLIC_PB_SUBDOMAIN}`

;(async () => {
  console.log(`Backing up`)
  chdir(DATA_ROOT)
  await pexec(`tar -czvf ${+new Date()}.tgz pb_data`)

  console.log(`Upgrading`)
  await pexec(`${PB_BIN} upgrade --dir=pb_data`)

  // Add `platform` and `bin` required columns (migrate db json)
  try {
    const mainProcess = await _spawn({
      subdomain: PUBLIC_PB_SUBDOMAIN,
      port: DAEMON_PB_PORT_BASE,
      bin: binFor('lollipop'),
    })
    try {
      const coreInternalUrl = mkInternalUrl(DAEMON_PB_PORT_BASE)
      const client = createPbClient(coreInternalUrl)
      await tryFetch(coreInternalUrl)
      await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
      await client.applySchema(schema)
      await client.updateInstances((instance) => {
        return {
          status: instance.status || InstanceStatus.Idle,
          platform: instance.platform || 'ermine',
          version: instance.version || 'latest',
        }
      })
    } catch (e) {
      console.error(
        `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_PB_PROTOCOL}://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}/_/`
      )
      console.error(
        `***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`
      )
    } finally {
      console.log(`Exiting process`)
      mainProcess.kill()
    }
  } catch (e) {
    console.error(`${e}`)
  }
})()
