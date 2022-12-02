import { createLogger } from '@pockethost/common'
import { PUBLIC_DEBUG } from '../env'

export const logger = createLogger({ debug: PUBLIC_DEBUG })
export const { dbg, info, warn, error } = logger
