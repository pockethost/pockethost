import { LoggerService } from '../../../../../common'
import { MOTHERSHIP_URL, tryFetch } from '../../../../../core'
import { ftpService } from '../FtpService'

export async function ftp() {
  const logger = LoggerService().create(`EdgeFtpCommand`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await tryFetch(MOTHERSHIP_URL(`/api/health`), {})

  await ftpService({
    mothershipUrl: MOTHERSHIP_URL(),
  })
}
