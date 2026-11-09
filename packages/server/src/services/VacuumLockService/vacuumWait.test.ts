import { describe, expect, it, vi } from 'vitest'
import { waitUntilVacuumUnlocked } from './vacuumWait'

describe('waitUntilVacuumUnlocked', () => {
  it('returns immediately when not locked', async () => {
    const sleep = vi.fn(async () => undefined)

    await expect(
      waitUntilVacuumUnlocked({
        isLocked: () => false,
        sleep,
        retryMs: 10,
        graceMs: 100,
      })
    ).resolves.toBe(true)

    expect(sleep).not.toHaveBeenCalled()
  })

  it('waits until the lock clears', async () => {
    let locked = true
    const sleep = vi.fn(async () => {
      locked = false
    })

    await expect(
      waitUntilVacuumUnlocked({
        isLocked: () => locked,
        sleep,
        retryMs: 1,
        graceMs: 100,
      })
    ).resolves.toBe(true)

    expect(sleep).toHaveBeenCalled()
  })

  it('returns false when aborted', async () => {
    await expect(
      waitUntilVacuumUnlocked({
        isLocked: () => true,
        sleep: async () => undefined,
        retryMs: 1,
        graceMs: 100,
        isAborted: () => true,
      })
    ).resolves.toBe(false)
  })

  it('returns false when grace expires while still locked', async () => {
    vi.useFakeTimers()

    const promise = waitUntilVacuumUnlocked({
      isLocked: () => true,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      retryMs: 25,
      graceMs: 50,
    })

    await vi.advanceTimersByTimeAsync(60)

    await expect(promise).resolves.toBe(false)

    vi.useRealTimers()
  })
})
