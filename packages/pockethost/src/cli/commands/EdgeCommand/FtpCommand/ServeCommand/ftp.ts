import { Logger } from '@'
import { MOTHERSHIP_URL, tryFetch } from '../../../../..'
import { ftpService } from '../FtpService'

export type FtpOptions = {
  logger: Logger
}

export async function ftp({ logger }: FtpOptions) {
  const { info } = logger.create(`ftp`)
  info(`Starting`)

  await tryFetch(MOTHERSHIP_URL(`/api/health`), { logger })

  await ftpService({
    mothershipUrl: MOTHERSHIP_URL(),
    logger,
  })
}
