export type RetryOptions = {
  /** First wait after a failure (default 1s); doubles each attempt up to maxDelayMs. */
  initialDelayMs?: number
  /** Longest wait between attempts (default 30s). */
  maxDelayMs?: number
  /** Called after each failure with the attempt number and the wait before the next one. */
  onError?: (error: unknown, attempt: number, nextDelayMs: number) => void
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Runs `fn` until it succeeds, waiting with exponential backoff between failures. Used for the mirror boot sync: an
 * edge that starts while the mothership is down or briefly erroring must keep trying instead of never becoming ready.
 */
export const retryUntilSuccess = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const { initialDelayMs = 1000, maxDelayMs = 30_000, onError, sleep = defaultSleep } = options
  let delay = initialDelayMs
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      onError?.(e, attempt, delay)
      await sleep(delay)
      delay = Math.min(delay * 2, maxDelayMs)
    }
  }
}
