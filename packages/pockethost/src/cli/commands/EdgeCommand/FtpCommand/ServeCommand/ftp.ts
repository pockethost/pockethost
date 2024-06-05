import { MOTHERSHIP_INTERNAL_URL } from '$constants'
import { ftpService } from '$services'
import { LoggerService } from '$shared'
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
