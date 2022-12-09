export * from './routes'
export * from './transaction'
export * from './types'

import { PBScriptApi } from './types/PBScriptApi'

const api: PBScriptApi = {
  ping: () => 'Hello from PBScript!',
}

registerJsFuncs(api)
