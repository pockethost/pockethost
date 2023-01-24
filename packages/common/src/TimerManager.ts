import { forEach } from '@s-libs/micro-dash'
import { logger } from './Logger'

export type UnixTimestampMs = number
export type TimerCanceler = () => void

export type TimeManagerConfig = {}

export type TimeManager = ReturnType<typeof createTimerManager>

export const createTimerManager = (config: TimeManagerConfig) => {
  const { dbg, error } = logger().create(`timerManager`)
  let i = 0
  const cleanups: any = {}
  let isShutDown = false

  const add = (cb: () => void, ms: UnixTimestampMs) => {
    if (isShutDown) throw new Error(`Already shut down`)
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
    isShutDown = true

    dbg(`Canceling  ${cleanups.length} timers`)
    forEach(cleanups, (c) => c())
    dbg(`done`, cleanups)
  }

  const repeat = (
    cb: () => Promise<boolean> | boolean,
    ms: UnixTimestampMs
  ) => {
    let _unsub: TimerCanceler | undefined = undefined
    const _again = async () => {
      const shouldRepeat = await cb()
      if (shouldRepeat && !isShutDown) _unsub = add(_again, ms)
    }
    _again().catch(error)
    return () => {
      _unsub?.()
      _unsub = undefined
    }
  }

  return { add, shutdown, repeat }
}
