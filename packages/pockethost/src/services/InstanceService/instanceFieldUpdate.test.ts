import { InstanceStatus } from '@'
import { describe, expect, it } from 'vitest'
import { shouldSkipInstanceFieldUpdate } from './instanceFieldUpdate'

describe('shouldSkipInstanceFieldUpdate', () => {
  it('allows idle when powered off', () => {
    expect(shouldSkipInstanceFieldUpdate({ status: InstanceStatus.Idle }, false)).toBe(false)
  })

  it('skips starting and running when powered off', () => {
    expect(shouldSkipInstanceFieldUpdate({ status: InstanceStatus.Starting }, false)).toBe(true)
    expect(shouldSkipInstanceFieldUpdate({ status: InstanceStatus.Running }, false)).toBe(true)
  })

  it('allows live status when powered on', () => {
    expect(shouldSkipInstanceFieldUpdate({ status: InstanceStatus.Starting }, true)).toBe(false)
    expect(shouldSkipInstanceFieldUpdate({ status: InstanceStatus.Running }, true)).toBe(false)
  })

  it('ignores non-status field updates', () => {
    expect(shouldSkipInstanceFieldUpdate({ subdomain: 'x' }, false)).toBe(false)
  })
})
