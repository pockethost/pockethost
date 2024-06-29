import { info } from '../../log'
import { ftpService } from '../FtpService'

export async function ftp() {
  info(`Starting`)

  await ftpService({})
}
