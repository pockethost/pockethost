import { LoggerService } from 'pockethost'
import { PLUGIN_NAME } from './constants'

const logger = LoggerService().create(PLUGIN_NAME)
export const { dbg, info } = logger
