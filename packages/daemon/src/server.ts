import {
  DAEMON_PB_SEMVER,
  MOTHERSHIP_PORT,
  PH_BIN_CACHE,
  PUBLIC_DEBUG,
  PUBLIC_MOTHERSHIP_NAME,
  TRACE,
} from '$constants'
import {
  centralDbService,
  clientService,
  ftpService,
  instanceService,
  ipWhitelistService,
  pocketbaseService,
  proxyService,
  realtimeLog,
  rpcService,
  sqliteService,
  updaterService,
} from '$services'
import { LoggerService } from '@pockethost/common'
// gen:import

const [major, minor, patch] = process.versions.node.split('.').map(Number)

if ((major || 0) < 18) {
  throw new Error(`Node 18 or higher required.`)
}

LoggerService({ debug: PUBLIC_DEBUG, trace: TRACE, errorTrace: !PUBLIC_DEBUG })

// npm install eventsource --save
// @ts-ignore
global.EventSource = require('eventsource')
;(async () => {
  const logger = LoggerService().create(`server.ts`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

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
          name: PUBLIC_MOTHERSHIP_NAME,
          slug: PUBLIC_MOTHERSHIP_NAME,
          onUnexpectedStop: () => {
            error(`migrate had an unexpected stop. Check it out`)
          },
        },
        { logger },
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
      name: PUBLIC_MOTHERSHIP_NAME,
      slug: PUBLIC_MOTHERSHIP_NAME,
      port: MOTHERSHIP_PORT,
      onUnexpectedStop: () => {
        error(`serve had an unexpected stop. Check it out`)
      },
    },
    { logger },
  )

  /**
   * Launch services
   */
  console.log('launching')
  await clientService({ url, logger })
  await ftpService({ logger })
  await rpcService({ logger })
  await proxyService({
    logger,
    coreInternalUrl: url,
  })
  await ipWhitelistService({ logger })
  await sqliteService({ logger })
  await realtimeLog({ logger })
  await instanceService({
    logger,
    instanceApiCheckIntervalMs: 50,
    instanceApiTimeoutMs: 5000,
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
