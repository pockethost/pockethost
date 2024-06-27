import { LoggerService } from 'pockethost'

const logger = LoggerService().create('plugin-{{dashCase name}}')
export const { dbg, info } = logger
