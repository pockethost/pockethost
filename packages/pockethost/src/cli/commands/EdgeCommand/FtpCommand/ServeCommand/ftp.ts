import { LoggerService, MOTHERSHIP_INTERNAL_URL, tryFetch } from '$public'
import { ftpService } from '../FtpService'

export async function ftp() {
  const logger = LoggerService().create(`EdgeFtpCommand`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await tryFetch(`${MOTHERSHIP_INTERNAL_URL(`/api/health`)}`, {})

  await ftpService({
    mothershipUrl: MOTHERSHIP_INTERNAL_URL(),
  })
}
