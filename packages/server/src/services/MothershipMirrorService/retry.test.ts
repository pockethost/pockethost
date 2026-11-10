import { describe, expect, it } from 'vitest'
import { retryUntilSuccess } from './retry'

describe('retryUntilSuccess', () => {
  it('keeps trying with exponential backoff, capped, until fn succeeds', async () => {
    const waits: number[] = []
    const failures: number[] = []
    let calls = 0
    const result = await retryUntilSuccess(
      async () => {
        calls++
        if (calls < 6) throw new Error(`mirror 400 #${calls}`)
        return 'synced'
      },
      {
        initialDelayMs: 1000,
        maxDelayMs: 8000,
        sleep: async (ms) => {
          waits.push(ms)
        },
        onError: (_e, attempt) => failures.push(attempt),
      }
    )
    expect(result).toBe('synced')
    expect(calls).toBe(6)
    expect(failures).toEqual([1, 2, 3, 4, 5])
    expect(waits).toEqual([1000, 2000, 4000, 8000, 8000])
  })

  it('returns at once when fn succeeds the first time', async () => {
    const waits: number[] = []
    const result = await retryUntilSuccess(async () => 42, { sleep: async (ms) => void waits.push(ms) })
    expect(result).toBe(42)
    expect(waits).toEqual([])
  })
})
