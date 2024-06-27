import { LoggerService } from 'pockethost'

const logger = LoggerService().create('plugin-auto-admin')
export const { dbg, info } = logger
