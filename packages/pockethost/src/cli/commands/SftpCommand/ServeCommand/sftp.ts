import { LoggerService, MOTHERSHIP_URL, tryFetch } from '@'
import { sftpService } from '../SftpService'

export async function sftp() {
  const logger = LoggerService().create(`cli:sftp:serve`)
  const { info } = logger
  info(`Starting`)

  await tryFetch(MOTHERSHIP_URL(`/api/health`), { logger })

  await sftpService({
    mothershipUrl: MOTHERSHIP_URL(),
    logger,
  })
}
