import { LoggerService } from '../common'
import { RegisterEnvSettingsService } from '../constants'
import { ioc } from '../core/ioc'
import { WinstonLoggerService } from '../core/winston'
import { GobotService } from '../services/GobotService'

ioc.register('logger', WinstonLoggerService({}))

RegisterEnvSettingsService()
LoggerService({})
GobotService({})
