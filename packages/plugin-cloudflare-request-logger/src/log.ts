import { LoggerService } from 'pockethost'

const logger = LoggerService().create('plugin-cloudflare-request-logger')
export const { dbg, info } = logger
