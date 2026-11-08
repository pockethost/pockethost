import { logger } from '@'
import { Command } from 'commander'

const num = (v: string) => Number(v)

export const OverLimitCommand = () =>
  new Command(`over-limit`)
    .description(
      `Find accounts running more instances than their plan includes. Warn the owner, then power off the least recently used extras once the grace period has passed`
    )
    .option(`--apply`, `Write changes and send email (default is a dry run)`, false)
    .option(`--no-email`, `Don't email owners (records and power changes still apply)`)
    .option(`--grace-hours <n>`, `Hours between the warning and powering off`, num, 24)
    .action(async ({ apply, email, graceHours }) => {
      logger().context({ cli: 'edge:over-limit' })
      const { sweepOverLimit } = await import('./overLimit')
      await sweepOverLimit({ apply, email, graceMs: graceHours * 60 * 60 * 1000 })
    })
