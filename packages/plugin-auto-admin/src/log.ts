import { LoggerService } from 'pockethost/core'

const logger = LoggerService().create('plugin-auto-admin')
export const { dbg, info } = logger
