import { LoggerService, LogLevelName } from '$shared'
import { PUBLIC_DEBUG } from './env'

try {
  LoggerService()
} catch {
  LoggerService({
    level: PUBLIC_DEBUG ? LogLevelName.Debug : LogLevelName.Info,
    errorTrace: false,
  })
}
