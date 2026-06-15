import { describe, expect, it } from 'vitest'
import { instanceAllowedByScope } from './scope'

describe('instanceAllowedByScope', () => {
  const userId = 'user1'
  const instanceId = 'inst1'

  it('allows all when scope is undefined', () => {
    expect(instanceAllowedByScope(undefined, instanceId, userId)).toBe(true)
  })

  it('allows all instances when scope.instanceIds is null', () => {
    expect(instanceAllowedByScope({ userId, instanceIds: null }, instanceId, userId)).toBe(true)
  })

  it('denies wrong user', () => {
    expect(instanceAllowedByScope({ userId: 'other', instanceIds: null }, instanceId, userId)).toBe(false)
  })

  it('allows only listed instance ids', () => {
    const scope = { userId, instanceIds: ['inst1', 'inst2'] }
    expect(instanceAllowedByScope(scope, 'inst1', userId)).toBe(true)
    expect(instanceAllowedByScope(scope, 'inst3', userId)).toBe(false)
  })
})
