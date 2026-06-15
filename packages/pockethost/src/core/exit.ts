import type { Logger } from '@'

type ExitHandler = () => void
type AsyncExitHandler = () => Promise<unknown>

const syncHandlers: ExitHandler[] = []
const asyncHandlers: { fn: AsyncExitHandler; wait: number }[] = []
let isExiting = false

const runExitHandlers = async () => {
  for (const fn of syncHandlers) {
    try {
      fn()
    } catch (err) {
      console.error(err)
    }
  }

  await Promise.all(
    asyncHandlers.map(({ fn, wait }) =>
      Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`exit hook timed out after ${wait}ms`)), wait)),
      ]).catch(console.error)
    )
  )
}

const triggerExit = (code = 0) => {
  if (isExiting) return
  isExiting = true
  void runExitHandlers().finally(() => process.exit(code))
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'] as const) {
  process.once(signal, () => triggerExit(0))
}

export function exitHook(fn: ExitHandler) {
  syncHandlers.push(fn)
  return () => {
    const i = syncHandlers.indexOf(fn)
    if (i >= 0) syncHandlers.splice(i, 1)
  }
}

export function asyncExitHook(fn: AsyncExitHandler, wait = 5000) {
  const entry = { fn, wait }
  asyncHandlers.push(entry)
  return () => {
    const i = asyncHandlers.indexOf(entry)
    if (i >= 0) asyncHandlers.splice(i, 1)
  }
}

export async function gracefulExit(signal?: number) {
  if (isExiting) {
    await new Promise<void>((resolve) => process.once('exit', () => resolve()))
    return
  }
  isExiting = true
  await runExitHandlers()
  process.exit(signal ?? 0)
  await new Promise<void>((resolve) => process.once('exit', () => resolve()))
}

export const neverendingPromise = (logger: Logger) => {
  logger.dbg('Neverending promise')
  return new Promise<void>(() => {
    setInterval(() => {}, 2 ** 31 - 1)
  })
}
