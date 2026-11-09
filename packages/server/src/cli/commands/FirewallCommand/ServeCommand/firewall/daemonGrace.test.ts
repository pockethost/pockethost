import { describe, expect, it } from 'vitest'
import { isDaemonUnreachableError } from './daemonGrace'

describe('isDaemonUnreachableError', () => {
  it('matches connection refused', () => {
    expect(isDaemonUnreachableError(new Error('connect ECONNREFUSED 127.0.0.1:3000'))).toBe(true)
  })

  it('matches reset and hang up', () => {
    expect(isDaemonUnreachableError(new Error('read ECONNRESET'))).toBe(true)
    expect(isDaemonUnreachableError(new Error('socket hang up'))).toBe(true)
  })

  it('rejects unrelated errors', () => {
    expect(isDaemonUnreachableError(new Error('instance powered off'))).toBe(false)
  })
})
