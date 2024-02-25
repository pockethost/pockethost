import { DEBUG, DefaultSettingsService, SETTINGS } from '$constants'
import { PocketbaseReleaseDownloadService } from '$services'
import { LogLevelName, LoggerService } from '$shared'
import { discordAlert } from '$src/util/discordAlert'

const check = async () => {
  DefaultSettingsService(SETTINGS)
  LoggerService({
    level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
  })

  const logger = LoggerService().create(`download.ts`)

  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const { check } = PocketbaseReleaseDownloadService({})
  await check()
}

check().catch(discordAlert)
