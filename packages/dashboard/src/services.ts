import { LoggerService, LogLevelName } from '$shared'
import { PUBLIC_DEBUG } from './env'

// Initiate the logging service
// TODO: Document this
try {
  LoggerService()
} catch {
  LoggerService({
    level: PUBLIC_DEBUG ? LogLevelName.Debug : LogLevelName.Info,
  })
}
