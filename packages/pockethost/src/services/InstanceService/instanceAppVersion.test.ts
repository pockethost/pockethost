import { describe, expect, it } from 'vitest'
import { instanceAppVersionFromPbVersion } from './instanceAppVersion'

describe('instanceAppVersionFromPbVersion', () => {
  it('maps 0.22.x to v22', () => {
    expect(instanceAppVersionFromPbVersion('0.22.*')).toBe('v22')
    expect(instanceAppVersionFromPbVersion('0.22.8')).toBe('v22')
  })

  it('maps 0.23.x to v23', () => {
    expect(instanceAppVersionFromPbVersion('0.23.0')).toBe('v23')
    expect(instanceAppVersionFromPbVersion('0.23.*')).toBe('v23')
  })

  it('throws on invalid version', () => {
    expect(() => instanceAppVersionFromPbVersion('0')).toThrow('Invalid version: 0')
  })
})
