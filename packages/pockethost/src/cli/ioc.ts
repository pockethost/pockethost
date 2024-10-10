import { ioc } from '../common'
import { RegisterEnvSettingsService } from '../constants'
import { WinstonLoggerService } from '../core/winston'
import { GobotService } from '../services/GobotService'

ioc('logger', WinstonLoggerService({}))

RegisterEnvSettingsService()
GobotService({})
