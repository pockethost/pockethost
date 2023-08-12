import {
  DAEMON_MAX_PORTS,
  DAEMON_PB_PORT_BASE,
  DAEMON_PB_SEMVER,
  DEBUG,
  PH_BIN_CACHE,
  PUBLIC_APP_DB,
  TRACE,
} from '$constants'
import {
  clientService,
  ftpService,
  instanceService,
  pocketbaseService,
  proxyService,
  realtimeLog,
  rpcService,
  sqliteService,
} from '$services'
import { logger as loggerService } from '@pockethost/common'
import { exec } from 'child_process'
import { centralDbService } from './services/CentralDbService'
import { instanceLoggerService } from './services/InstanceLoggerService'
import { updaterService } from './services/UpdaterService/UpdaterService'
// gen:import

loggerService({ debug: DEBUG, trace: TRACE, errorTrace: !DEBUG })

// npm install eventsource --save
// @ts-ignore
global.EventSource = require('eventsource')
;(async () => {
  const logger = loggerService().create(`server.ts`)
  const { dbg, error, info, warn } = logger
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

  const udService = await updaterService({
    logger,
    cachePath: PH_BIN_CACHE,
    checkIntervalMs: 1000 * 5 * 60,
  })

  const pbService = await pocketbaseService({
    logger,
  })

  /**
   * Launch central database
   */
  {
    info(`Migrating mothership`)
    await (
      await pbService.spawn(
        {
          command: 'migrate',
          isMothership: true,
          version: DAEMON_PB_SEMVER,
          slug: PUBLIC_APP_DB,
          onUnexpectedStop: () => {
            error(`migrate had an unexpected stop. Check it out`)
          },
        },
        { logger }
      )
    ).exited
    info(`Migrating done`)
  }
  info(`Serving`)
  const { url } = await pbService.spawn(
    {
      command: 'serve',
      isMothership: true,
      version: DAEMON_PB_SEMVER,
      slug: PUBLIC_APP_DB,
      port: DAEMON_PB_PORT_BASE,
      onUnexpectedStop: () => {
        error(`migrate had an unexpected stop. Check it out`)
      },
    },
    { logger }
  )

  /**
   * Launch services
   */
  await clientService({ url, logger })
  ftpService({ logger })
  await rpcService({ logger })
  await proxyService({
    logger,
    coreInternalUrl: url,
  })
  await instanceLoggerService({ logger })
  await sqliteService({ logger })
  await realtimeLog({ logger })
  await instanceService({
    logger,
    instanceApiCheckIntervalMs: 50,
    instanceApiTimeoutMs: 5000,
    maxPorts: DAEMON_MAX_PORTS,
  })
  await centralDbService({ logger })
  // gen:service

  info(`Hooking into process exit event`)

  const shutdown = async (signal: NodeJS.Signals) => {
    info(`Got signal ${signal}`)
    info(`Shutting down`)
    ftpService().shutdown()
    ;(await realtimeLog()).shutdown()
    ;(await proxyService()).shutdown()
    ;(await instanceService()).shutdown()
    ;(await rpcService()).shutdown()
    pbService.shutdown()
  }

  await (await rpcService()).initRpcs()
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  process.on('SIGHUP', shutdown)
})()
