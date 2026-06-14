import { Logger } from '@'
import exitHook, { asyncExitHook as _, gracefulExit as __ } from 'exit-hook'

export const asyncExitHook = (cb: () => Promise<any>, wait = 5000) => _(cb, { wait })

export const gracefulExit = async (signal?: number) => {
  __(signal)
  await new Promise((resolve) => {
    process.on('exit', resolve)
  })
}
export { exitHook }

export const neverendingPromise = (logger: Logger) => {
  logger.dbg('Neverending promise')
  // A pending Promise alone does not keep the event loop alive.
  return new Promise<void>(() => {
    setInterval(() => {}, 2 ** 31 - 1)
  })
}
