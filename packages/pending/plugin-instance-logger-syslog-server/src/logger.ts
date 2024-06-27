import { LoggerService } from 'pockethost/core'

const logger = LoggerService().create('SyslogInstanceLoggerPlugin')
export const { dbg, error } = logger
