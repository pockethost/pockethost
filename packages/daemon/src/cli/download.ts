import { PH_BIN_CACHE, PUBLIC_DEBUG, TRACE } from '$constants'
import { PocketbaseReleaseDownloadService } from '$services/PocketbaseReleaseDownloadService'
import { LoggerService } from '@pockethost/common/src/Logger'
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
  const logger = LoggerService().create(`download.ts`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const { check } = PocketbaseReleaseDownloadService({
    cachePath: PH_BIN_CACHE,
  })
  await check()
})()
