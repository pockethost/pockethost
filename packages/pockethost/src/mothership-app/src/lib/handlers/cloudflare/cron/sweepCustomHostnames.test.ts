import { describe, expect, it } from 'vitest'
import { reasonToDelete } from './sweepCustomHostnames'

const DAY = 86_400_000
const now = Date.parse('2026-11-07T00:00:00Z')
const h = (status: string, ssl: string, ageDays = 100) => ({
  id: 'x',
  hostname: 'api.example.com',
  status,
  created_at: new Date(now - ageDays * DAY).toISOString(),
  ssl: { status: ssl },
})
const live = { suspension: '' }

describe('reasonToDelete', () => {
  it('keeps a working hostname owned by a live instance', () => {
    expect(reasonToDelete(h('active', 'active'), live, now)).toBeNull()
  })
  it('keeps an active hostname whose cert is mid-renewal', () => {
    expect(reasonToDelete(h('active', 'pending_validation'), live, now)).toBeNull()
    expect(reasonToDelete(h('active', 'pending_issuance'), live, now)).toBeNull()
  })
  it('deletes orphans, even when active', () => {
    expect(reasonToDelete(h('active', 'active'), undefined, now)).toBe('orphan')
  })
  it('deletes hostnames of archived instances', () => {
    expect(reasonToDelete(h('active', 'active'), { suspension: 'Archived: gone' }, now)).toBe('archived')
  })
  it('keeps hostnames of instances suspended for other reasons', () => {
    expect(reasonToDelete(h('active', 'active'), { suspension: 'Fair use' }, now)).toBeNull()
  })
  it('deletes dead hostnames', () => {
    expect(reasonToDelete(h('active', 'expired'), live, now)).toMatch(/^dead/)
    expect(reasonToDelete(h('active', 'deleted'), live, now)).toMatch(/^dead/)
    expect(reasonToDelete(h('active', 'validation_timed_out'), live, now)).toMatch(/^dead/)
    expect(reasonToDelete(h('moved', 'active'), live, now)).toMatch(/^dead/)
  })
  it('gives never-activated hostnames 14 days', () => {
    expect(reasonToDelete(h('pending', 'pending_validation', 3), live, now)).toBeNull()
    expect(reasonToDelete(h('pending', 'pending_validation', 15), live, now)).toMatch(/^not active/)
  })
})
