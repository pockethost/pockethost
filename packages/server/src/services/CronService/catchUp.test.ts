import { describe, expect, it } from 'vitest'
import { isCatchUpDue } from './catchUp'

// Local times: cron reads expressions in the process's timezone, so the test holds in any TZ.
const t = (iso: string) => new Date(iso).getTime()

describe('isCatchUpDue', () => {
  it('is due when a scheduled run was missed', () => {
    // Last fired yesterday at midnight; today's midnight run was missed.
    expect(isCatchUpDue('0 0 * * *', t('2026-11-07T00:00:05'), t('2026-11-08T00:10:00'))).toBe(true)
  })

  it('is not due when the next run is still ahead', () => {
    expect(isCatchUpDue('0 0 * * *', t('2026-11-08T00:00:05'), t('2026-11-08T12:00:00'))).toBe(false)
  })

  it('fires once no matter how many runs were missed', () => {
    // The caller fires once; this only reports that something was missed.
    expect(isCatchUpDue('@hourly', t('2026-11-01T00:00:05'), t('2026-11-08T00:00:00'))).toBe(true)
  })

  it('ignores webhooks that have never fired', () => {
    expect(isCatchUpDue('0 0 * * *', undefined, t('2026-11-08T12:00:00'))).toBe(false)
  })

  it('ignores invalid cron expressions', () => {
    expect(isCatchUpDue('not a cron', t('2026-11-01T00:00:00'), t('2026-11-08T12:00:00'))).toBe(false)
  })
})
