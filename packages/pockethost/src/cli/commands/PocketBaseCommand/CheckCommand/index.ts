import { DISCORD_ALERT_CHANNEL_URL, logger } from '@'
import { Command } from 'commander'
import { manifestVersions } from '../../../../services/PocketBaseBinaryService/releases'
import { fetchUpstreamVersions, findMissingVersions } from '../../../../services/PocketBaseBinaryService/upstream'

/** Alerts Discord when upstream has PocketBase releases that versions.json doesn't list yet. */
export const CheckCommand = () =>
  new Command(`check`)
    .description(`Alert when upstream has PocketBase releases missing from versions.json`)
    .action(async () => {
      logger().context({ cli: 'pocketbase:check' })
      const { info, warn, error } = logger()
      try {
        const missing = findMissingVersions(manifestVersions(), await fetchUpstreamVersions())
        if (!missing.length) {
          info('versions.json is up to date with upstream')
          return
        }

        const message =
          `New PocketBase release(s) not in versions.json yet: ${missing.join(', ')}. ` +
          `Add them with \`pnpm pb:versions add ${missing.join(' ')}\` in packages/pockethost, then commit.`
        warn(message)

        const url = DISCORD_ALERT_CHANNEL_URL()
        if (!url) {
          warn('DISCORD_ALERT_CHANNEL_URL not set; alert not sent')
          return
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message }),
        })
        if (!res.ok) throw new Error(`Discord alert failed (${res.status})`)
      } catch (e) {
        error(`PocketBase check failed: ${e}`)
        process.exitCode = 1
      }
    })
