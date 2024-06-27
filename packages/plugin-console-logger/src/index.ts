import stringify from 'json-stringify-safe'
import {
  LogLevelName,
  PocketHostPlugin,
  isLevelGte,
  isLevelLte,
  onLogAction,
} from 'pockethost'

export const LogLevelConsoleMap = {
  [LogLevelName.Trace]: console.trace,
  [LogLevelName.Raw]: console.log,
  [LogLevelName.Debug]: console.debug,
  [LogLevelName.Info]: console.info,
  [LogLevelName.Warn]: console.warn,
  [LogLevelName.Error]: console.error,
  [LogLevelName.Abort]: console.error,
} as const

const plugin: PocketHostPlugin = async ({}) => {
  onLogAction(async ({ currentLevel, levelIn, args }) => {
    if (!isLevelGte(levelIn, currentLevel)) return
    const finalArgs = []
    if (args.length > 0) {
      finalArgs.push(args.shift())
    }
    while (args.length > 0) {
      let arg = args.shift()
      if (arg instanceof Error) {
        finalArgs.push(...[arg.name, arg.message.toString()])
        if (isLevelLte(levelIn, LogLevelName.Debug) && arg.stack) {
          finalArgs.push(...arg.stack.split(/\n/))
        }
        continue
      }
      if (typeof arg === 'string') {
        finalArgs.push(arg)
        continue
      }
      if (typeof arg === 'object') {
        finalArgs.push(stringify(arg, null, 2))
        continue
      }
      if (typeof arg === 'function') {
        finalArgs.push(`<<function ${stringify(arg.toString())}>>`)
        continue
      }
      finalArgs.push(arg)
    }
    LogLevelConsoleMap[levelIn](...finalArgs)
  })
}

export default plugin
