import { LoggerService } from 'pockethost/core'

const logger = LoggerService().create('plugin-instance-logger-file-realtime-tail')
export const { dbg, info } = logger
