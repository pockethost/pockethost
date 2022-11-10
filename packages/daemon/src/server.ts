import { binFor } from '@pockethost/common'
import { DAEMON_PB_PORT_BASE, PUBLIC_PB_SUBDOMAIN } from './constants'
import { createPbClient } from './db/PbClient'
import { createBackupService } from './services/BackupService'
import { createInstanceService } from './services/InstanceService'
import { createJobService } from './services/JobService'
import { createProxyService } from './services/ProxyService'
import { mkInternalUrl } from './util/internal'
import { tryFetch } from './util/tryFetch'
import { _spawn } from './util/_spawn'
// npm install eventsource --save
global.EventSource = require('eventsource')
;(async () => {
  const coreInternalUrl = mkInternalUrl(DAEMON_PB_PORT_BASE)

  /**
   * Launch central database
   */
  const mainProcess = await _spawn({
    subdomain: PUBLIC_PB_SUBDOMAIN,
    slug: PUBLIC_PB_SUBDOMAIN,
    port: DAEMON_PB_PORT_BASE,
    bin: binFor('lollipop'),
  })
  await tryFetch(coreInternalUrl)

  /**
   * Launch services
   */
  const client = createPbClient(coreInternalUrl)
  const instanceService = await createInstanceService(client)
  const jobService = await createJobService(client)
  const backupService = await createBackupService(client)

  const api = await createProxyService(instanceService)
  process.once('SIGUSR2', async () => {
    console.log(`SIGUSR2 detected`)
    api.shutdown()
  })
})()
