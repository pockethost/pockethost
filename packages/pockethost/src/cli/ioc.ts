import { version } from '../../package.json'
import { ioc } from '../common'
import { RegisterEnvSettingsService } from '../constants'
import { WinstonLoggerService } from '../core/winston'
import { GobotService } from '../services/GobotService'

export const initIoc = async () => {
  const logger = await WinstonLoggerService({})
  ioc('logger', logger.context('ph_version', version))
  RegisterEnvSettingsService()
  GobotService({})
}
