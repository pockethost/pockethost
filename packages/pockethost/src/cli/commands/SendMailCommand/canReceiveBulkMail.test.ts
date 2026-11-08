import { describe, expect, it } from 'vitest'
import { canReceiveBulkMail } from './canReceiveBulkMail'

describe('canReceiveBulkMail', () => {
  it('accepts rows from views that omit verified (subscribed_users, verified_users)', () => {
    expect(canReceiveBulkMail({})).toBe(true)
    expect(canReceiveBulkMail({ unsubscribe: 0 })).toBe(true)
  })
  it('rejects rows the query marks unverified or unsubscribed', () => {
    expect(canReceiveBulkMail({ verified: 0, unsubscribe: 0 })).toBe(false)
    expect(canReceiveBulkMail({ verified: false })).toBe(false)
    expect(canReceiveBulkMail({ verified: 1, unsubscribe: 1 })).toBe(false)
    expect(canReceiveBulkMail({ unsubscribe: true })).toBe(false)
  })
  it('accepts verified, subscribed rows from the users table', () => {
    expect(canReceiveBulkMail({ verified: 1, unsubscribe: 0 })).toBe(true)
    expect(canReceiveBulkMail({ verified: true, unsubscribe: false })).toBe(true)
  })
})
