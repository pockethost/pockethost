import { describe, expect, it } from 'vitest'
import {
  daysUntilFlounderSunset,
  FLOUNDER_SALES_END_MS,
  flounderDaysLeftLabel,
  isFlounderSalesOpen,
} from './flounderSunset'

describe('flounderSunset', () => {
  it('counts calendar days until July 1, 2026 UTC', () => {
    expect(daysUntilFlounderSunset(new Date('2026-06-16T12:00:00Z'))).toBe(15)
    expect(daysUntilFlounderSunset(new Date('2026-06-30T23:59:59Z'))).toBe(1)
    expect(daysUntilFlounderSunset(new Date(FLOUNDER_SALES_END_MS))).toBe(0)
  })

  it('reports sales closed on and after July 1', () => {
    expect(isFlounderSalesOpen(new Date('2026-06-30T12:00:00Z'))).toBe(true)
    expect(isFlounderSalesOpen(new Date(FLOUNDER_SALES_END_MS))).toBe(false)
  })

  it('formats day labels', () => {
    expect(flounderDaysLeftLabel(15)).toBe('15 days left')
    expect(flounderDaysLeftLabel(1)).toBe('1 day left')
    expect(flounderDaysLeftLabel(0)).toBe('Sales ended')
  })
})
