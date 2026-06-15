import { ILogger } from './utilities'
import { IFtpDeployArgumentsWithDefaults } from './types'

function logOriginalError(logger: ILogger, error: unknown) {
  logger.all()
  logger.all(`----------------------------------------------------------------`)
  logger.all(`----------------------  full error below  ----------------------`)
  logger.all(`----------------------------------------------------------------`)
  logger.all()
  logger.all(error)
}

export function prettyError(
  logger: ILogger,
  args: IFtpDeployArgumentsWithDefaults,
  error: unknown
): void {
  logger.all()
  logger.all(`----------------------------------------------------------------`)
  logger.all(`--------------  🔥🔥🔥 an error occurred  🔥🔥🔥  --------------`)
  logger.all(`----------------------------------------------------------------`)

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const errorCode = (error as { code: unknown }).code
    if (errorCode === 'ENOTFOUND') {
      logger.all(
        `The server "${args.server}" doesn't seem to exist. Do you have a typo?`
      )
    }
  } else if (typeof error === 'object' && error !== null && 'name' in error) {
    const errorName = String((error as { name: unknown }).name)
    if (errorName.includes('ERR_TLS_CERT_ALTNAME_INVALID')) {
      logger.all(
        `The certificate for "${args.server}" is likely shared. The host did not place your server on the list of valid domains for this cert.`
      )
    }
  }

  const message =
    `${(error as { message?: string })?.message ?? error}`.toLowerCase()
  if (
    message.includes('authentication') ||
    message.includes('all configured')
  ) {
    logger.all(
      `Could not authenticate over SFTP with username "${args.username}".`
    )
    logger.all(`Ensure the Phio deploy key is registered under Account → Keys.`)
  }

  logOriginalError(logger, error)
}
