import { PocketbaseReleaseDownloadService } from '$services'
import { LoggerService } from '$shared'
import { discordAlert } from '$util'

export const download = async () => {
  const logger = LoggerService().create(`download.ts`)

  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const { check } = PocketbaseReleaseDownloadService({})
  await check().catch(discordAlert)
}
