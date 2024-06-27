import { LoggerService } from 'pockethost'

const logger = LoggerService().create('plugin-maildev')
export const { dbg, info } = logger
