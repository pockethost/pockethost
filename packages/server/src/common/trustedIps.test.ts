import { describe, expect, it } from 'vitest'
import { SubscriptionType } from './schema/User'
import {
  maxTrustedIpsForSubscription,
  normalizeTrustedIpEntry,
  normalizeTrustedIpList,
  validateTrustedIpListForSubscription,
} from './trustedIps'

describe('trustedIps', () => {
  it('normalizes bare IPv4 to /32', () => {
    expect(normalizeTrustedIpEntry('203.0.113.5')).toBe('203.0.113.5/32')
  })

  it('deduplicates normalized entries', () => {
    expect(normalizeTrustedIpList(['203.0.113.5', '203.0.113.5/32'])).toEqual(['203.0.113.5/32'])
  })

  it('rejects unrestricted CIDR ranges', () => {
    expect(() => normalizeTrustedIpEntry('0.0.0.0/0')).toThrow(/Unrestricted/)
  })

  it('enforces account limits', () => {
    expect(maxTrustedIpsForSubscription(SubscriptionType.Premium)).toBe(5)
    expect(() =>
      validateTrustedIpListForSubscription(
        ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4', '5.5.5.5', '6.6.6.6'],
        SubscriptionType.Premium
      )
    ).toThrow(/at most 5/)
    expect(() => validateTrustedIpListForSubscription(['1.1.1.1'], undefined)).toThrow(/Account required/)
    expect(validateTrustedIpListForSubscription(['1.1.1.1'], SubscriptionType.Free)).toEqual(['1.1.1.1/32'])
  })
})
