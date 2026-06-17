/** Midnight UTC when Flounder lifetime sales stop. */
export const FLOUNDER_SALES_END_MS = Date.UTC(2026, 6, 1)

export const FLOUNDER_SALES_END_LABEL = 'July 1, 2026'

export function daysUntilFlounderSunset(now = new Date()): number {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diffDays = (FLOUNDER_SALES_END_MS - todayUtc) / 86_400_000
  return Math.max(0, Math.ceil(diffDays))
}

export function isFlounderSalesOpen(now = new Date()): boolean {
  return daysUntilFlounderSunset(now) > 0
}

export function flounderDaysLeftLabel(days: number): string {
  if (days === 0) return 'Sales ended'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
