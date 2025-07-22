import { Logger } from '@'
import exitHook, { asyncExitHook as _, gracefulExit as __ } from 'exit-hook'

export const asyncExitHook = (cb: () => Promise<any>) => _(cb, { wait: 5000 })

export const gracefulExit = async (signal?: number) => {
  __(signal)
  await new Promise((resolve) => {
    process.on('exit', resolve)
  })
}
export { exitHook }

export const neverendingPromise = (logger: Logger) =>
  new Promise((resolve) => {
    logger.dbg('Neverending promise')
  })
