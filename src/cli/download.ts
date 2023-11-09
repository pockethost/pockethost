import {
  DEBUG,
  DefaultSettingsService,
  PH_BIN_CACHE,
  SETTINGS,
} from '$constants'
import { PocketbaseReleaseDownloadService } from '$services'
import { LogLevelName, LoggerService } from '$shared'

const check = async () => {
  DefaultSettingsService(SETTINGS)
  LoggerService({
    level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
  })

  const logger = LoggerService().create(`download.ts`)

  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const { check } = PocketbaseReleaseDownloadService({
    cachePath: PH_BIN_CACHE(),
  })
  await check()
}

check()
