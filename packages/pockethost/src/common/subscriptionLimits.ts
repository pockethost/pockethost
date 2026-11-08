import { SubscriptionType } from './schema/User'

/**
 * Disk storage: one pooled number per account covering everything kept on PocketHost's servers (databases, logs,
 * pb_public, pb_hooks, backups, local uploads). Published policy: /docs/limits#disk-storage.
 */
export const DISK_STORAGE_GB_PER_PAID_INSTANCE = 10
/** Flounder, Founder, and other legacy plans: flat, doesn't grow with their (250+) instance allowance. */
export const DISK_STORAGE_GB_LEGACY = 25
/** Accounts with no paid instances. */
export const DISK_STORAGE_GB_FREE = 1

const BYTES_PER_MB = 1024 * 1024
const BYTES_PER_GB = 1024 * 1024 * 1024

const LEGACY_PLANS: ReadonlySet<string> = new Set([
  SubscriptionType.Legacy,
  SubscriptionType.Founder,
  SubscriptionType.Flounder,
])

export type DiskStorageBasis = 'legacy' | 'per-instance' | 'free'

export type DiskStorageLimit = {
  basis: DiskStorageBasis
  gb: number
  bytes: number
}

/**
 * @param subscriptionType The user's plan (`users.subscription`)
 * @param paidInstances Instances the user pays for. Only paid instances add storage.
 */
export const diskStorageLimit = (
  subscriptionType: SubscriptionType | string | undefined,
  paidInstances: number
): DiskStorageLimit => {
  const mk = (basis: DiskStorageBasis, gb: number): DiskStorageLimit => ({ basis, gb, bytes: gb * BYTES_PER_GB })
  if (subscriptionType && LEGACY_PLANS.has(subscriptionType)) return mk('legacy', DISK_STORAGE_GB_LEGACY)
  if (paidInstances > 0) return mk('per-instance', paidInstances * DISK_STORAGE_GB_PER_PAID_INSTANCE)
  return mk('free', DISK_STORAGE_GB_FREE)
}

export const storageUsagePercent = (usedBytes: number, limitBytes: number): number => {
  if (limitBytes <= 0) return 0
  return Math.min(100, Math.round((usedBytes / limitBytes) * 100))
}

export const formatStorageBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < BYTES_PER_MB) {
    const kb = bytes / 1024
    return `${Number.isInteger(kb) ? kb : kb.toFixed(1)} KB`
  }
  if (bytes < BYTES_PER_GB) {
    const mb = bytes / BYTES_PER_MB
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
  }
  const gb = bytes / BYTES_PER_GB
  return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`
}
