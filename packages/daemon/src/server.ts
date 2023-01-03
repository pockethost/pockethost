import { DEBUG, PH_BIN_CACHE, PUBLIC_APP_DB } from '$constants'
import {
  backupService,
  clientService,
  ftpService,
  instanceService,
  pocketbase,
  proxyService,
  realtimeLog,
  rpcService,
  sqliteService,
} from '$services'
import { logger } from '@pockethost/common'
import { centralDbService } from './services/CentralDbService'
import { instanceLoggerService } from './services/InstanceLoggerService'

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
    slug: PUBLIC_APP_DB,
  })

  /**
   * Launch services
   */
  await clientService(url)
  ftpService({})
  await rpcService({})
  await proxyService({
    coreInternalUrl: url,
  })
  await instanceLoggerService({})
  await sqliteService({})
  await realtimeLog({})
  await instanceService({})
  await centralDbService({})
  await backupService({})

  info(`Hooking into process exit event`)

  const shutdown = async (signal: NodeJS.Signals) => {
    info(`Got signal ${signal}`)
    info(`Shutting down`)
    ftpService().shutdown()
    ;(await realtimeLog()).shutdown()
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
