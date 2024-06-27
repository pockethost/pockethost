import { join } from 'path'
import { PH_HOME, Settings, mkNumber, mkPath } from 'pockethost/core'

const _HOME_DIR =
  process.env.PH_SIL_HOME || join(PH_HOME(), `plugin-syslog-instance-logger`)
const settings = Settings({
  PH_SIL_HOME: mkPath(_HOME_DIR, { create: true }),
  PH_SIL_PORT: mkNumber(5789),
})

export const SYSLOGD_PORT = () => settings.PH_SIL_PORT
