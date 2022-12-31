import { logger } from '@pockethost/common'
import { clientService } from './clientService/clientService'
import { DEBUG, PH_BIN_CACHE, PUBLIC_PB_SUBDOMAIN } from './constants'
import { backupService } from './services/BackupService'
import { ftpService } from './services/FtpService/FtpService'
import { instanceService } from './services/InstanceService'
import { pocketbase } from './services/PocketBaseService'
import { proxyService } from './services/ProxyService'
import { rpcService } from './services/RpcService'

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
  await clientService(url)
  ftpService({})
  await rpcService({})
  await instanceService({})
  await proxyService({
    coreInternalUrl: url,
  })
  await backupService({})

  info(`Hooking into process exit event`)

  const shutdown = async (signal: NodeJS.Signals) => {
    info(`Got signal ${signal}`)
    info(`Shutting down`)
    ftpService().shutdown()
    ;(await backupService()).shutdown()
    ;(await proxyService()).shutdown()
    ;(await instanceService()).shutdown()
    ;(await rpcService()).shutdown()
    pbService.shutdown()
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  process.on('SIGHUP', shutdown)
})()
