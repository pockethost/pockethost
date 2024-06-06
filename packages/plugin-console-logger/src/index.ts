import {
  LogLevelName,
  PocketHostAction,
  PocketHostPlugin,
  isLevelGte,
  isLevelLte,
  stringify,
} from '@pockethost/common'

export const LogLevelConsoleMap = {
  [LogLevelName.Trace]: console.trace,
  [LogLevelName.Raw]: console.log,
  [LogLevelName.Debug]: console.debug,
  [LogLevelName.Info]: console.info,
  [LogLevelName.Warn]: console.warn,
  [LogLevelName.Error]: console.error,
  [LogLevelName.Abort]: console.error,
} as const

const plugin: PocketHostPlugin = async ({ registerAction }) => {
  registerAction(PocketHostAction.Log, (currentLevel, levelIn, args) => {
    if (!isLevelGte(levelIn, currentLevel)) return
    const finalArgs = [args.shift()]
    while (args.length > 0) {
      let arg = args.shift()
      const t = typeof arg
      if (arg instanceof Error) {
        finalArgs.push(...[arg.name, arg.message.toString()])
        if (isLevelLte(levelIn, LogLevelName.Debug) && arg.stack) {
          finalArgs.push(...arg.stack.split(/\n/))
        }
        continue
      }
      if (t === 'string' && !!arg.match(/\n/)) {
        finalArgs.push(...arg.split(/\n/))
        continue
      }
      if (t === 'object') {
        finalArgs.push(...stringify(arg, undefined, 2).split(/\n/))
        continue
      }
      if (t === 'function') {
        finalArgs.push(`<<function ${stringify(arg.toString())}>>`)
        continue
      }
      finalArgs.push(arg)
    }
    LogLevelConsoleMap[levelIn](...finalArgs)
  })
}

export default plugin
