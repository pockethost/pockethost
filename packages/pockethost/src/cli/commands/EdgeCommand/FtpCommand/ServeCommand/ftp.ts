import { LoggerService } from '@'
import { MOTHERSHIP_URL, tryFetch } from '../../../../..'
import { ftpService } from '../FtpService'

export async function ftp() {
  const logger = LoggerService().create(`cli:edge:ftp:serve`)
  const { info } = logger
  info(`Starting`)

  await tryFetch(MOTHERSHIP_URL(`/api/health`), {})

  await ftpService({
    mothershipUrl: MOTHERSHIP_URL(),
    logger,
  })
}
