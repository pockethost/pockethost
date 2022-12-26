import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_USERNAME,
  PH_BIN_CACHE,
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from './constants'
import { createPbClient } from './db/PbClient'
import { createBackupService } from './services/BackupService'
import { createInstanceService } from './services/InstanceService'
import { pocketbase } from './services/PocketBaseService'
import { createProxyService } from './services/ProxyService'
import { createRpcService } from './services/RpcService'
import { dbg, error, info } from './util/logger'
// npm install eventsource --save
global.EventSource = require('eventsource')
;(async () => {
  const pbService = await pocketbase({
    cachePath: PH_BIN_CACHE,
    checkIntervalMs: 1000 * 5 * 60,
  })

  /**
   * Launch central database
   */
  const { url } = await pbService.spawn({
    command: 'serve',
    slug: PUBLIC_PB_SUBDOMAIN,
  })

  /**
   * Launch services
   */
  const client = createPbClient(url)
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
    coreInternalUrl: url,
  })
  const backupService = await createBackupService(client, rpcService)

  process.once('SIGUSR2', async () => {
    info(`SIGUSR2 detected`)
    proxyService.shutdown()
    instanceService.shutdown()
    rpcService.shutdown()
    backupService.shutdown()
    pbService.shutdown()
  })
})()
