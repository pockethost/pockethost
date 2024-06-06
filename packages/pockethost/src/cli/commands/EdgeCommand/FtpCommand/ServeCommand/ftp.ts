import { MOTHERSHIP_INTERNAL_URL } from '$constants'
import { ftpService } from '$services'
import { tryFetch } from '$util'
import { LoggerService } from '@pockethost/common'

export async function ftp() {
  const logger = LoggerService().create(`EdgeFtpCommand`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await tryFetch(`${MOTHERSHIP_INTERNAL_URL(`/api/health`)}`, {})

  await ftpService({
    mothershipUrl: MOTHERSHIP_INTERNAL_URL(),
  })
}
