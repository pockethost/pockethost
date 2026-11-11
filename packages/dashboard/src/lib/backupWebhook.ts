/** The built-in backup route PocketHost adds to every instance (instance-app/pb_hooks/_ph_backup.pb.js). */
export const BACKUP_WEBHOOK_ENDPOINT = '/api/ph/backup'

export type BackupIntervalId = 'every-6-hours' | 'every-12-hours' | 'daily' | 'weekly'

export const BACKUP_INTERVALS: { id: BackupIntervalId; label: string }[] = [
  { id: 'every-6-hours', label: 'Every 6 hours' },
  { id: 'every-12-hours', label: 'Every 12 hours' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
]

export const DEFAULT_BACKUP_INTERVAL: BackupIntervalId = 'daily'

export const isBackupWebhook = (endpoint: string) => endpoint.trim() === BACKUP_WEBHOOK_ENDPOINT

/** Stable per-instance minute, hour and weekday, so instances don't all back up at the same moment. */
export const backupSlot = (instanceId: string) => {
  let h = 2166136261
  for (let i = 0; i < instanceId.length; i++) {
    h ^= instanceId.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return { minute: h % 60, hour: Math.floor(h / 60) % 24, weekday: Math.floor(h / 1440) % 7 }
}

const hoursEvery = (start: number, step: number) => {
  const hours: number[] = []
  for (let x = start % step; x < 24; x += step) hours.push(x)
  return hours.join(',')
}

export const backupCron = (instanceId: string, interval: BackupIntervalId) => {
  const { minute, hour, weekday } = backupSlot(instanceId)
  switch (interval) {
    case 'every-6-hours':
      return `${minute} ${hoursEvery(hour, 6)} * * *`
    case 'every-12-hours':
      return `${minute} ${hoursEvery(hour, 12)} * * *`
    case 'daily':
      return `${minute} ${hour} * * *`
    case 'weekly':
      return `${minute} ${hour} * * ${weekday}`
  }
}

/** The interval a saved cron matches for this instance, or undefined for a schedule set by hand. */
export const backupIntervalForCron = (instanceId: string, cron: string): BackupIntervalId | undefined =>
  BACKUP_INTERVALS.find(({ id }) => backupCron(instanceId, id) === cron.trim())?.id

/** The Webhooks page edits everything except the backup webhook, so carry the saved one through its saves. */
export const withSavedBackupWebhook = <T extends { endpoint: string }>(edited: T[], saved?: T[] | null): T[] => [
  ...edited.filter((w) => !isBackupWebhook(w.endpoint)),
  ...(saved ?? []).filter((w) => isBackupWebhook(w.endpoint)),
]
