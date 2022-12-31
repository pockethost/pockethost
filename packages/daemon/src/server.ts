import { logger } from '@pockethost/common'
import { DEBUG, PH_BIN_CACHE, PUBLIC_PB_SUBDOMAIN } from './constants'
import { clientService } from './db/PbClient'
import { createBackupService } from './services/BackupService'
import { ftpService } from './services/FtpService/FtpService'
import { createInstanceService } from './services/InstanceService'
import { pocketbase } from './services/PocketBaseService'
import { createProxyService } from './services/ProxyService'
import { createRpcService } from './services/RpcService'

logger({ debug: DEBUG })

// npm install eventsource --save
global.EventSource = require('eventsource')
;(async () => {
  const { dbg, error, info } = logger().create(`server.ts`)
  info(`Starting`)

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
  const client = await clientService(url)

  ftpService({})
  const rpcService = await createRpcService({ client })
  const instanceService = await createInstanceService({ client, rpcService })
  const proxyService = await createProxyService({
    instanceManager: instanceService,
    coreInternalUrl: url,
  })
  const backupService = await createBackupService(rpcService)

  info(`Hooking into process exit event`)

  const shutdown = (signal: NodeJS.Signals) => {
    info(`Got signal ${signal}`)
    info(`Shutting down`)
    ftpService().shutdown()
    proxyService.shutdown()
    instanceService.shutdown()
    rpcService.shutdown()
    backupService.shutdown()
    pbService.shutdown()
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  process.on('SIGHUP', shutdown)
})()
