import { ConsoleApi } from './ConsoleApi'
import { GoApi } from './GoApi'
import { PBScriptApi } from './PBScriptApi'

declare global {
  let console: ConsoleApi
  function registerJsFuncs(api: PBScriptApi): void
  let __go: GoApi
}
