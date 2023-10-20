import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_SEMVER,
  DAEMON_PB_USERNAME,
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
        },
        { logger },
      )
    ).exited
    info(`Migrating done`)
  }
  info(`Serving`)
  const url = await new Promise<string>((resolve) => {
    const mothership = async () => {
      try {
        const { url, exited } = await pbService.spawn({
          command: 'serve',
          isMothership: true,
          version: DAEMON_PB_SEMVER,
          name: PUBLIC_MOTHERSHIP_NAME,
          slug: PUBLIC_MOTHERSHIP_NAME,
          port: MOTHERSHIP_PORT,
        })
        resolve(url)
        await exited
      } catch (e) {
        error(e)
      } finally {
        setTimeout(mothership, 10000)
      }
    }
    mothership()
  })

  /**
   * Launch services
   */
  await clientService({
    url,
    username: DAEMON_PB_USERNAME,
    password: DAEMON_PB_PASSWORD,
  })
  await ftpService({})
  await rpcService({})
  await proxyService({
    coreInternalUrl: url,
  })
  await ipWhitelistService({})
  await sqliteService({})
  await realtimeLog({})
  await instanceService({
    instanceApiCheckIntervalMs: 50,
    instanceApiTimeoutMs: 5000,
  })
  await centralDbService({})
  // gen:service

  info(`Hooking into process exit event`)

  await (await rpcService()).initRpcs()
})()
