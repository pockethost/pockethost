import { deploy as deployCustom } from './deploy'
import { IFtpDeployArguments } from './types'
import { getDefaultSettings, Logger, Timings } from './utilities'

export const includeDefaults = ['**/*']

export const excludeDefaults = ['**/.git*', '**/.git*/**', '**/node_modules/**']

/** Syncs a local folder with a remote PocketHost instance over SFTP. */
export async function deploy(args: IFtpDeployArguments): Promise<void> {
  const argsWithDefaults = getDefaultSettings(args)
  const logger = new Logger(argsWithDefaults['log-level'])
  const timings = new Timings()

  await deployCustom(argsWithDefaults, logger, timings)
}
