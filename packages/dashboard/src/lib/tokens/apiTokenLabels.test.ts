import { describe, expect, it } from 'vitest'
import {
  expiryFromDays,
  sortBySubdomain,
  tokenAccessLabel,
  tokenExpiryLabel,
  tokenLastUsedLabel,
  tokenScopeLabel,
} from './apiTokenLabels'

const now = Date.parse('2026-11-07T00:00:00Z')

describe('api token labels', () => {
  it('computes expiry', () => {
    expect(expiryFromDays(0, now)).toBe('')
    expect(expiryFromDays(30, now)).toBe('2026-12-07T00:00:00.000Z')
  })

  it('labels access and scope', () => {
    expect(tokenAccessLabel({ scopes: ['read', 'write'] })).toBe('Deploy + read')
    expect(tokenAccessLabel({ scopes: ['read'] })).toBe('Read only')
    const byId = { a: { subdomain: 'alpha' }, b: { subdomain: 'beta' } } as any
    expect(tokenScopeLabel({ all_instances: true, instances: [] }, byId)).toBe('All instances')
    expect(tokenScopeLabel({ all_instances: false, instances: ['a', 'b'] }, byId)).toBe('alpha, beta')
    expect(tokenScopeLabel({ all_instances: false, instances: ['zz'] }, byId)).toBe('1 instance')
  })

  it('sorts instance names alphabetically, ignoring case', () => {
    const byId = {
      a: { subdomain: 'pocketpages-daisyui' },
      b: { subdomain: 'Pocketpages-auth' },
      c: { subdomain: 'docs' },
      d: { subdomain: 'pocketpages' },
    } as any
    expect(tokenScopeLabel({ all_instances: false, instances: ['a', 'b', 'c', 'd'] }, byId)).toBe(
      'docs, pocketpages, Pocketpages-auth, pocketpages-daisyui'
    )
    expect(
      sortBySubdomain([
        { subdomain: 'beta' },
        { subdomain: 'Alpha' },
        { subdomain: 'app10' },
        { subdomain: 'app9' },
      ]).map((i) => i.subdomain)
    ).toEqual(['Alpha', 'app9', 'app10', 'beta'])
  })

  it('labels expiry and last use', () => {
    expect(tokenExpiryLabel('', now)).toBe('Never expires')
    expect(tokenExpiryLabel('2026-12-01 00:00:00.000Z', now)).toBe('Expires 2026-12-01')
    expect(tokenExpiryLabel('2026-11-01 00:00:00.000Z', now)).toBe('Expired 2026-11-01')
    expect(tokenLastUsedLabel('')).toBe('Never used')
    expect(tokenLastUsedLabel('2026-11-05 10:00:00.000Z')).toBe('Last used 2026-11-05')
  })
})
