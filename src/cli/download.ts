import { DEBUG, PH_BIN_CACHE } from '$constants'
import { PocketbaseReleaseDownloadService } from '$services/PocketbaseReleaseDownloadService'
import { LogLevelName, LoggerService } from '$shared'
// gen:import

const [major, minor, patch] = process.versions.node.split('.').map(Number)

if ((major || 0) < 18) {
  throw new Error(`Node 18 or higher required.`)
}

LoggerService({
  level: DEBUG ? LogLevelName.Debug : LogLevelName.Info,
  errorTrace: !DEBUG,
})

// npm install eventsource --save
// @ts-ignore
global.EventSource = require('eventsource')
;(async () => {
  const logger = LoggerService().create(`download.ts`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const { check } = PocketbaseReleaseDownloadService({
    cachePath: PH_BIN_CACHE,
  })
  await check()
})()
