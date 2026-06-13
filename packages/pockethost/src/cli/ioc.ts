import { ConsoleLogger, DEBUG, ioc, LogLevelName, PocketBaseBinaryService, RegisterEnvSettingsService } from '@'
import { version } from '../../package.json'

export const initIoc = async () => {
  const logger = ConsoleLogger({ level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info })
  ioc('logger', logger.context('ph_version', version))
  RegisterEnvSettingsService()
  PocketBaseBinaryService({ logger })
}
