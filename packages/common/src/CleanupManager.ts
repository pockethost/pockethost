import { map } from '@s-libs/micro-dash'

export type CleanupFunc = () => any
export const createCleanupManager = () => {
  let i = 0
  const cleanups: any = {}
  const add = (cb: CleanupFunc) => {
    const idx = i++
    const cleanup = async () => {
      await cb()
      delete cleanups[idx]
    }
    cleanups[idx] = cleanup
    return cleanup
  }

  const shutdown = () => Promise.all(map(cleanups, (v) => v()))

  return { add, shutdown }
}
