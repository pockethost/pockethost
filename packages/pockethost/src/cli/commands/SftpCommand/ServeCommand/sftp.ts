import {
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  tryFetch,
} from '@'
import { sftpService } from '../SftpService'

export async function sftp() {
  const logger = LoggerService().create(`cli:sftp:serve`)
  const { info } = logger
  info(`Starting`)

  await tryFetch(MOTHERSHIP_URL(`/api/health`), { logger })

  await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
    logger,
  })

  await sftpService({
    mothershipUrl: MOTHERSHIP_URL(),
    logger,
  })
}
