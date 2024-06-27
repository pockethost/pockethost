import { join } from 'path'
import { PH_HOME, Settings, mkPath } from 'pockethost/core'

const HOME_DIR =
  process.env.PH_INSTANCE_LOGGER_FILE_REALTIME_TAIL_HOME || join(PH_HOME(), `plugin-instance-logger-file-realtime-tail`)

const settings = Settings({
  PH_INSTANCE_LOGGER_FILE_REALTIME_TAIL_HOME: mkPath(HOME_DIR, { create: true }),
})
