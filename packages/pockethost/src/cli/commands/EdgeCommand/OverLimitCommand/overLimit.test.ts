import { describe, expect, it } from 'vitest'
import { fmtDeadline, instanceList } from './overLimit'

describe('over-limit email helpers', () => {
  it('formats the deadline in UTC to the minute', () => {
    expect(fmtDeadline(new Date(`2026-11-09T14:05:33Z`))).toBe(`2026-11-09 14:05 UTC`)
  })

  it('lists instances by name', () => {
    expect(instanceList([{ subdomain: `blog` }, { subdomain: `shop` }])).toBe(
      `<strong>blog</strong>, <strong>shop</strong>`
    )
  })
})
