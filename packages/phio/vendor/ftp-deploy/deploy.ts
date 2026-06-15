import { deploySftp } from './sftpDeploy'
import { IFtpDeployArgumentsWithDefaults } from './types'
import { ILogger, ITimings } from './utilities'

export async function deploy(
  args: IFtpDeployArgumentsWithDefaults,
  logger: ILogger,
  timings: ITimings
): Promise<void> {
  return deploySftp(args, logger, timings)
}
