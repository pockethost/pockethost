import {
  DEBUG,
  DefaultSettingsService,
  MOTHERSHIP_INTERNAL_URL,
  SETTINGS,
} from '$constants'
import { ftpService } from '$services'
import { LogLevelName, LoggerService } from '$shared'
import { tryFetch } from '$util'
import EventSource from 'eventsource'
// gen:import

const [major, minor, patch] = process.versions.node.split('.').map(Number)

if ((major || 0) < 18) {
  throw new Error(`Node 18 or higher required.`)
}

DefaultSettingsService(SETTINGS)

LoggerService({
  level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
})

// npm install eventsource --save
// @ts-ignore
global.EventSource = EventSource
;(async () => {
  const logger = LoggerService().create(`edge-ftp.ts`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  tryFetch(`${MOTHERSHIP_INTERNAL_URL(`/api/health`)}`, {})

  await ftpService({
    mothershipUrl: MOTHERSHIP_INTERNAL_URL(),
  })
})()
