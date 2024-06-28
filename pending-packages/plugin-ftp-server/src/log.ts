import { LoggerService } from 'pockethost'

const logger = LoggerService().create('plugin-ftp-server')
export const { dbg, info } = logger
