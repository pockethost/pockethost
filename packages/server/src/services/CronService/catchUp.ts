import { CronTime } from 'cron'

/**
 * True when a webhook missed a scheduled run: its first due time after the last fire has already passed. Webhooks that
 * have never fired are left alone, so a new webhook doesn't run early. Invalid cron expressions return false.
 */
export const isCatchUpDue = (cronExpression: string, lastFiredMs: number | undefined, nowMs: number) => {
  if (!lastFiredMs) return false
  try {
    const nextDue = new CronTime(cronExpression).getNextDateFrom(new Date(lastFiredMs)).toMillis()
    return nextDue <= nowMs
  } catch {
    return false
  }
}
