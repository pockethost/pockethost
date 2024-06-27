import { join } from 'path'
import {
  PH_HOME,
  Settings,
  mkCsvString,
  mkPath,
  mkString,
} from 'pockethost/core'

const HOME_DIR =
  process.env.PH_WAF_IPCIDR_HOME || join(PH_HOME(), `plugin-waf-ipcidr`)
const settings = Settings({
  PH_WAF_IPCIDR_HOME: mkPath(HOME_DIR, { create: true }),
  PH_WAF_IPCIDR_PRESET: mkString(''),
  PH_WAF_IPCIDR_ALLOWED_CIDRS: mkCsvString([]),
})
export const PRESET = () => settings.PH_WAF_IPCIDR_PRESET
export const ALLOWED_CIDRS = () => settings.PH_WAF_IPCIDR_ALLOWED_CIDRS
