import { MOTHERSHIP_INTERNAL_URL } from '$constants'
import { LoggerService } from '$public'
import { ftpService } from '$services'
import { tryFetch } from '$util'

export async function ftp() {
  const logger = LoggerService().create(`EdgeFtpCommand`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await tryFetch(`${MOTHERSHIP_INTERNAL_URL(`/api/health`)}`, {})

  await ftpService({
    mothershipUrl: MOTHERSHIP_INTERNAL_URL(),
  })
}
