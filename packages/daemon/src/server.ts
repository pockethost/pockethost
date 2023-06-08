import {
  DAEMON_PB_SEMVER,
  DEBUG,
  PH_BIN_CACHE,
  PUBLIC_APP_DB,
  TRACE,
} from '$constants'
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
import { exec } from 'child_process'
import { centralDbService } from './services/CentralDbService'
import { instanceLoggerService } from './services/InstanceLoggerService'

logger({ debug: DEBUG, trace: TRACE, errorTrace: !DEBUG })

// npm install eventsource --save
global.EventSource = require('eventsource')
;(async () => {
  const { dbg, error, info, warn } = logger().create(`server.ts`)
  info(`Starting`)

  /**
   * Temporary fix until we can figure out why child processes are not
   * being killed when the node process exits.
   */
  await new Promise<void>((resolve) => {
    exec(`pkill -f 'pocketbase serve'`, (error, stdout, stderr) => {
      if (error && error.signal !== 'SIGTERM') {
        warn(`pkill failed with ${error}: ${stderr}`)
      }
      resolve()
    })
  })

  const pbService = await pocketbase({
    cachePath: PH_BIN_CACHE,
    checkIntervalMs: 1000 * 5 * 60,
  })

  /**
   * Launch central database
   */
  {
    info(`Migrating mothership`)
    await (
      await pbService.spawn({
        command: 'migrate',
        isMothership: true,
        version: DAEMON_PB_SEMVER,
        slug: PUBLIC_APP_DB,
      })
    ).exited
    info(`Migrating done`)
  }
  info(`Serving`)
  const { url } = await pbService.spawn({
    command: 'serve',
    isMothership: true,
    version: DAEMON_PB_SEMVER,
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
