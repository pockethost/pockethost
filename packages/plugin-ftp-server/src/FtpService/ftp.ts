import { ftpService } from '.'
import { info } from '../log'

export async function ftp() {
  info(`Starting`)

  ftpService({})
}
