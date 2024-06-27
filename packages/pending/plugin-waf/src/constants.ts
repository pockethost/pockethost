import { join } from 'path'
import { PH_HOME, Settings, mkNumber, mkPath } from 'pockethost/core'

const _HOME_DIR =
  process.env.PH_FIREWALL_HOME || join(PH_HOME(), `plugin-firewall`)
const settings = Settings({
  PH_WAF_HOME: mkPath(_HOME_DIR, { create: true }),
  PH_WAF_PORT: mkNumber(8080),
})

export const WAF_PORT = () => settings.PH_WAF_PORT
