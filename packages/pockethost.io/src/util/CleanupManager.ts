import { forEach, reduce } from '@s-libs/micro-dash'

export type CleanupFuncSync = () => void
export const createCleanupManagerSync = () => {
  let i = 0
  const cleanups: any = {}
  const add = (cb: CleanupFuncSync) => {
    const idx = i++
    const cleanup = () => {
      cb()
      delete cleanups[idx]
    }
    cleanups[idx] = cleanup
    return cleanup
  }

  const cleanupAll = () => {
    forEach(cleanups, (c) => c())
  }

  return { add, cleanupAll }
}

export type CleanupFuncAsync = () => Promise<any>
export const createCleanupManagerAsync = () => {
  let i = 0
  const cleanups: any = {}
  const add = (cb: CleanupFuncAsync) => {
    const idx = i++
    const cleanup = async () => {
      await cb()
      delete cleanups[idx]
    }
    cleanups[idx] = cleanup
    return cleanup
  }

  const cleanupAll = () =>
    reduce(cleanups, (c, v) => c.then(v()), Promise.resolve())

  return { add, cleanupAll }
}
