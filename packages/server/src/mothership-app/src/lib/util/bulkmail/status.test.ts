import { describe, expect, it } from 'vitest'
import { statusAction } from './status'

describe('statusAction', () => {
  it('maps superuser status edits to engine calls', () => {
    expect(statusAction('draft', 'sending')).toBe('start')
    expect(statusAction('draft', 'scheduled')).toBe('start')
    expect(statusAction('paused', 'sending')).toBe('resume')
    expect(statusAction('sending', 'paused')).toBe('pause')
    expect(statusAction('scheduled', 'paused')).toBe('pause')
    expect(statusAction('sending', 'canceled')).toBe('cancel')
    expect(statusAction('draft', 'canceled')).toBe('cancel')
  })
  it('refuses the rest', () => {
    expect(statusAction('sending', 'done')).toMatch(/set by the sender/)
    expect(statusAction('sending', 'draft')).toMatch(/set by the sender/)
    expect(statusAction('done', 'sending')).toMatch(/can't start/)
    expect(statusAction('canceled', 'canceled')).toMatch(/can't cancel/)
    expect(statusAction('draft', 'paused')).toMatch(/can't pause/)
  })
})
