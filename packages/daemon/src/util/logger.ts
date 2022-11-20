import { createLogger } from '@pockethost/common'
import { DEBUG } from '../constants'

export const logger = createLogger({ debug: DEBUG })
export const { dbg, info, warn, error } = logger
