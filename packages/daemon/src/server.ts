import { binFor } from '@pockethost/common'
import getPort from 'get-port'
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
import { createProxyService } from './services/ProxyService'
import { createRpcService } from './services/RpcService'
import { mkInternalUrl } from './util/internal'
import { dbg, error, info } from './util/logger'
import { spawnInstance } from './util/spawnInstance'
// npm install eventsource --save
global.EventSource = require('eventsource')
;(async () => {
  const port = await getPort({ port: DAEMON_PB_PORT_BASE })
  const coreInternalUrl = mkInternalUrl(port)

  /**
   * Launch central database
   */
  const mainProcess = await spawnInstance({
    subdomain: PUBLIC_PB_SUBDOMAIN,
    slug: PUBLIC_PB_SUBDOMAIN,
    port,
    bin: binFor('lollipop'),
  })

  /**
   * Launch services
   */
  const client = createPbClient(coreInternalUrl)
  try {
    await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
    dbg(`Logged in`)
  } catch (e) {
    error(
      `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_PB_PROTOCOL}://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}/_/`
    )
    error(`***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`)
  }

  const rpcService = await createRpcService({ client })
  const instanceService = await createInstanceService({ client, rpcService })
  const proxyService = await createProxyService({
    instanceManager: instanceService,
    coreInternalUrl,
  })
  const backupService = await createBackupService(client, rpcService)

  process.once('SIGUSR2', async () => {
    info(`SIGUSR2 detected`)
    proxyService.shutdown()
    instanceService.shutdown()
    rpcService.shutdown()
    backupService.shutdown()
  })
})()
