import { binFor } from '@pockethost/common'
import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_PORT_BASE,
  DAEMON_PB_USERNAME,
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from './constants'
import { createPbClient } from './db/PbClient'
import { createBackupService } from './services/BackupService'
import { createInstanceService } from './services/InstanceService'
import { createJobService } from './services/JobService'
import { createProxyService } from './services/ProxyService'
import { mkInternalUrl } from './util/internal'
import { spawnInstance } from './util/spawnInstance'
// npm install eventsource --save
global.EventSource = require('eventsource')
;(async () => {
  const coreInternalUrl = mkInternalUrl(DAEMON_PB_PORT_BASE)

  /**
   * Launch central database
   */
  const mainProcess = await spawnInstance({
    subdomain: PUBLIC_PB_SUBDOMAIN,
    slug: PUBLIC_PB_SUBDOMAIN,
    port: DAEMON_PB_PORT_BASE,
    bin: binFor('lollipop'),
  })

  /**
   * Launch services
   */
  const client = createPbClient(coreInternalUrl)
  const instanceService = await createInstanceService(client)
  try {
    await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
    console.log(`Logged in`)
  } catch (e) {
    console.error(
      `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_PB_PROTOCOL}://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}/_/`
    )
    console.error(
      `***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`
    )
  }

  const proxyService = await createProxyService(instanceService)
  const jobService = await createJobService(client)
  const backupService = await createBackupService(client, jobService)

  process.once('SIGUSR2', async () => {
    console.log(`SIGUSR2 detected`)
    proxyService.shutdown()
    instanceService.shutdown()
    jobService.shutdown()
    backupService.shutdown()
  })
})()
