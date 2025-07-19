import { GobotService, ioc, RegisterEnvSettingsService, WinstonLoggerService } from '@'
import { version } from '../../package.json'

export const initIoc = async () => {
  const logger = await WinstonLoggerService({})
  ioc('logger', logger.context('ph_version', version))
  RegisterEnvSettingsService()
  GobotService({})
}
