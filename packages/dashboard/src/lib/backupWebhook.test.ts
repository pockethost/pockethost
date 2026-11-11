import { describe, expect, it } from 'vitest'
import { BACKUP_INTERVALS, backupCron, backupIntervalForCron, backupSlot, isBackupWebhook } from './backupWebhook'
import { validateCronExpression } from './cronExpression'

describe('backupWebhook', () => {
  it('gives each instance a stable slot within range', () => {
    const a = backupSlot('abc123def456ghi')
    expect(backupSlot('abc123def456ghi')).toEqual(a)
    for (const id of ['a', 'b', 'xyz', 'k9m2p7q1r5s8t3u']) {
      const { minute, hour, weekday } = backupSlot(id)
      expect(minute).toBeGreaterThanOrEqual(0)
      expect(minute).toBeLessThan(60)
      expect(hour).toBeGreaterThanOrEqual(0)
      expect(hour).toBeLessThan(24)
      expect(weekday).toBeGreaterThanOrEqual(0)
      expect(weekday).toBeLessThan(7)
    }
  })

  it('spreads instances across different times', () => {
    const slots = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(backupSlot(`instance${i}`))))
    expect(slots.size).toBeGreaterThan(40)
  })

  it('builds valid crons that round-trip to their interval', () => {
    for (const id of ['abc123def456ghi', 'zzzzzzzzzzzzzzz', 'a']) {
      for (const { id: interval } of BACKUP_INTERVALS) {
        const cron = backupCron(id, interval)
        expect(validateCronExpression(cron)).toBe(true)
        expect(backupIntervalForCron(id, cron)).toBe(interval)
      }
    }
  })

  it('runs every 6 and 12 hours at the instance minute', () => {
    const id = 'abc123def456ghi'
    const { minute, hour } = backupSlot(id)
    const six = backupCron(id, 'every-6-hours').split(' ') as [string, string]
    expect(six[0]).toBe(String(minute))
    expect(six[1].split(',')).toHaveLength(4)
    expect(six[1].split(',').map(Number)).toContain(hour)
    expect(backupCron(id, 'every-12-hours').split(' ')[1]!.split(',')).toHaveLength(2)
  })

  it('treats a hand-written schedule as custom', () => {
    expect(backupIntervalForCron('abc123def456ghi', '0 3 * * *')).toBeUndefined()
  })

  it('recognizes the backup endpoint', () => {
    expect(isBackupWebhook('/api/ph/backup')).toBe(true)
    expect(isBackupWebhook(' /api/ph/backup ')).toBe(true)
    expect(isBackupWebhook('/api/ph/backup?x=1')).toBe(false)
  })
})

describe('withSavedBackupWebhook', () => {
  it('keeps the saved backup webhook and ignores an edited one', async () => {
    const { withSavedBackupWebhook } = await import('./backupWebhook')
    const saved = [
      { endpoint: '/api/a', value: '0 * * * *' },
      { endpoint: '/api/ph/backup', value: '5 3 * * *' },
    ]
    expect(withSavedBackupWebhook([{ endpoint: '/api/b', value: '@daily' }], saved)).toEqual([
      { endpoint: '/api/b', value: '@daily' },
      { endpoint: '/api/ph/backup', value: '5 3 * * *' },
    ])
    expect(withSavedBackupWebhook([], undefined)).toEqual([])
  })
})
