import exitHook, { asyncExitHook as _ } from 'exit-hook'

const asyncExitHook = (cb: () => Promise<void>) => _(cb, { wait: 1000 })

export { asyncExitHook, exitHook }
