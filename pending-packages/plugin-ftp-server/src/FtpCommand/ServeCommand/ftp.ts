import { LoggerService } from 'pockethost/core'
import { ftpService } from '../FtpService'

export async function ftp() {
  const logger = LoggerService().create(`EdgeFtpCommand`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await ftpService({})
}
