import { LoggerService } from '@pockethost/common'
import { PUBLIC_DEBUG } from './env'

try {
  LoggerService()
} catch {
  LoggerService({ debug: PUBLIC_DEBUG, trace: false, errorTrace: false })
}
