import { forEach } from '@s-libs/micro-dash'

export type UnixTimestampMs = number
export type TimerCanceler = () => void

export type TimeManagerConfig = {}

export type TimeManager = ReturnType<typeof createTimerManager>

export const createTimerManager = (config: TimeManagerConfig) => {
  let i = 0
  const cleanups: any = {}

  const add = (cb: () => void, ms: UnixTimestampMs) => {
    const idx = i++
    const tid = setTimeout(() => {
      cancel()
      cb()
    }, ms)
    const cancel = () => {
      clearTimeout(tid)
      delete cleanups[idx]
    }
    cleanups[idx] = cancel
    return cancel
  }

  const shutdown = () => {
    // console.log(`Canceling all`, cleanups)
    forEach(cleanups, (c) => c())
    // console.log(`done`, cleanups)
  }

  const repeat = (
    cb: () => Promise<boolean> | boolean,
    ms: UnixTimestampMs
  ) => {
    let _unsub: TimerCanceler | undefined = undefined
    const _again = async () => {
      const shouldRepeat = await cb()
      if (shouldRepeat) _unsub = add(_again, ms)
    }
    _again()
    return () => {
      _unsub?.()
      _unsub = undefined
    }
  }

  return { add, shutdown, repeat }
}
