import { describe, expect, it } from 'vitest'
import { SubscriptionType } from './schema/User'
import { diskStorageLimit } from './subscriptionLimits'

describe('diskStorageLimit', () => {
  it('gives 10 GB per paid instance on Pay Per PocketBase', () => {
    expect(diskStorageLimit(SubscriptionType.Premium, 3)).toMatchObject({ basis: 'per-instance', gb: 30 })
  })

  it('gives legacy plans a flat 25 GB regardless of instance count', () => {
    for (const t of [SubscriptionType.Flounder, SubscriptionType.Founder, SubscriptionType.Legacy]) {
      expect(diskStorageLimit(t, 250)).toMatchObject({ basis: 'legacy', gb: 25 })
    }
  })

  it('gives 1 GB with no paid instances', () => {
    expect(diskStorageLimit(SubscriptionType.Free, 0)).toMatchObject({ basis: 'free', gb: 1 })
    expect(diskStorageLimit(undefined, 0)).toMatchObject({ basis: 'free', gb: 1 })
  })

  it('reports bytes', () => {
    expect(diskStorageLimit(SubscriptionType.Premium, 1).bytes).toBe(10 * 1024 ** 3)
  })
})
