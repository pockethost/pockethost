import exitHook, { asyncExitHook as _, gracefulExit as __ } from 'exit-hook'

export const asyncExitHook = (cb: () => Promise<void>) => _(cb, { wait: 5000 })

export const gracefulExit = async (signal?: number) => {
  __(signal)
  await new Promise((resolve) => {
    process.on('exit', resolve)
  })
}
export { exitHook }
