/** Pooled storage per paid PocketBase slot (`subscription_quantity`). */
export const DB_STORAGE_MB_PER_INSTANCE = 250
export const FILE_STORAGE_GB_PER_INSTANCE = 10

const BYTES_PER_MB = 1024 * 1024
const BYTES_PER_GB = 1024 * 1024 * 1024

export const DB_STORAGE_BYTES_PER_INSTANCE = DB_STORAGE_MB_PER_INSTANCE * BYTES_PER_MB
export const FILE_STORAGE_BYTES_PER_INSTANCE = FILE_STORAGE_GB_PER_INSTANCE * BYTES_PER_GB

export type SubscriptionStorageLimits = {
  dbStorageMb: number
  fileStorageGb: number
  volumeBytes: number
  objectBytes: number
}

export const subscriptionStorageLimits = (instanceCount: number): SubscriptionStorageLimits => ({
  dbStorageMb: instanceCount * DB_STORAGE_MB_PER_INSTANCE,
  fileStorageGb: instanceCount * FILE_STORAGE_GB_PER_INSTANCE,
  volumeBytes: instanceCount * DB_STORAGE_BYTES_PER_INSTANCE,
  objectBytes: instanceCount * FILE_STORAGE_BYTES_PER_INSTANCE,
})

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

export const formatDbStorageLimit = (mb: number): string => {
  if (mb >= 1024) {
    const gb = mb / 1024
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`
  }
  return `${mb} MB`
}

export const formatFileStorageLimit = (gb: number): string => `${gb} GB`
