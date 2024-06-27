import { LoggerService } from 'pockethost/core'

const logger = LoggerService().create('plugin-{{dashCase name}}')
export const { dbg, info } = logger
