import { describe, expect, it } from 'vitest'
import { fileAccessSuspension } from './suspension'

describe('fileAccessSuspension', () => {
  it('allows access when nothing is suspended', () => {
    expect(fileAccessSuspension({ suspension: '' }, { suspension: '' })).toBeNull()
    expect(fileAccessSuspension(undefined, undefined)).toBeNull()
    expect(fileAccessSuspension(null)).toBeNull()
  })

  it('refuses a suspended account', () => {
    expect(fileAccessSuspension({ suspension: 'Account suspended' })).toBe('Account suspended')
  })

  it('refuses a suspended instance', () => {
    expect(fileAccessSuspension({ suspension: '' }, { suspension: '[legacy-sunset] gone' })).toBe(
      '[legacy-sunset] gone'
    )
  })

  it('reports the account reason first when both are suspended', () => {
    expect(fileAccessSuspension({ suspension: 'account' }, { suspension: 'instance' })).toBe('account')
  })

  it('ignores whitespace-only reasons', () => {
    expect(fileAccessSuspension({ suspension: '   ' }, { suspension: '\n' })).toBeNull()
  })
})
