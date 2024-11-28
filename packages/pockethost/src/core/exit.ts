import exitHook, { asyncExitHook as _, gracefulExit as __ } from 'exit-hook'
import { logger } from '../common'

export const asyncExitHook = (cb: () => Promise<any>) => _(cb, { wait: 5000 })

export const gracefulExit = async (signal?: number) => {
  __(signal)
  await new Promise((resolve) => {
    process.on('exit', resolve)
  })
}
export { exitHook }

export const neverendingPromise = () =>
  new Promise((resolve) => {
    logger().dbg('Neverending promise')
  })
