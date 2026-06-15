export const CUSTOM_CRON_PRESET_ID = 'custom'

export type CronPreset = {
  id: string
  label: string
  cron: string
  description: string
}

export const CRON_PRESETS: CronPreset[] = [
  {
    id: 'hourly',
    label: 'Every hour',
    cron: '0 * * * *',
    description: 'At minute 0 of every hour (UTC)',
  },
  {
    id: 'daily-midnight',
    label: 'Every day at midnight',
    cron: '0 0 * * *',
    description: 'Daily at 00:00 UTC',
  },
  {
    id: 'weekdays-9am',
    label: 'Every weekday at 9:00 AM',
    cron: '0 9 * * 1-5',
    description: 'Monday through Friday at 09:00 UTC',
  },
  {
    id: 'monday-noon',
    label: 'Every Monday at noon',
    cron: '0 12 * * 1',
    description: 'Mondays at 12:00 UTC',
  },
  {
    id: 'friday-6pm',
    label: 'Every Friday at 6:00 PM',
    cron: '0 18 * * 5',
    description: 'Fridays at 18:00 UTC',
  },
  {
    id: 'every-6-hours',
    label: 'Every 6 hours',
    cron: '0 */6 * * *',
    description: '00:00, 06:00, 12:00, and 18:00 UTC',
  },
  {
    id: 'weekly-sunday',
    label: 'Every Sunday at midnight',
    cron: '0 0 * * 0',
    description: 'Sundays at 00:00 UTC',
  },
  {
    id: 'monthly-first',
    label: 'First of every month at midnight',
    cron: '0 0 1 * *',
    description: 'Day 1 of each month at 00:00 UTC',
  },
  {
    id: 'macro-daily',
    label: '@daily',
    cron: '@daily',
    description: 'Once a day at midnight UTC',
  },
  {
    id: 'macro-hourly',
    label: '@hourly',
    cron: '@hourly',
    description: 'Once an hour at minute 0 UTC',
  },
  {
    id: 'macro-weekdays',
    label: '@weekdays',
    cron: '@weekdays',
    description: 'Every weekday at midnight UTC',
  },
  {
    id: CUSTOM_CRON_PRESET_ID,
    label: 'Custom expression…',
    cron: '',
    description: '',
  },
]

const CRON_MACROS = [
  '@yearly',
  '@annually',
  '@monthly',
  '@weekly',
  '@daily',
  '@midnight',
  '@hourly',
  '@minutely',
  '@secondly',
  '@weekdays',
  '@weekends',
] as const

export function validateCronExpression(cronExpression: string): boolean {
  if (!cronExpression || cronExpression.length === 0) return false

  const expression = cronExpression.trim()

  if (CRON_MACROS.includes(expression as (typeof CRON_MACROS)[number])) {
    return true
  }

  const parts = expression.split(/\s+/)
  if (parts.length !== 5) return false

  const validChars = /^[\d*,\-/?LW#]+$/
  return parts.every((part) => validChars.test(part))
}

export function findPresetIdForCron(cron: string): string {
  const trimmed = cron.trim()
  if (!trimmed) return ''

  const match = CRON_PRESETS.find((preset) => preset.id !== CUSTOM_CRON_PRESET_ID && preset.cron === trimmed)
  return match?.id ?? CUSTOM_CRON_PRESET_ID
}

export function getCronPreset(id: string): CronPreset | undefined {
  return CRON_PRESETS.find((preset) => preset.id === id)
}
