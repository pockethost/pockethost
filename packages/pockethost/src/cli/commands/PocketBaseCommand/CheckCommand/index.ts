import { DISCORD_ALERT_CHANNEL_URL, logger } from '@'
import { Command } from 'commander'
import { addVersions, readManifest } from '../../../../services/PocketBaseBinaryService/manifest'
import { fetchUpstreamVersions, findMissingVersions } from '../../../../services/PocketBaseBinaryService/upstream'

/**
 * Adds upstream PocketBase releases missing from versions.json, then posts what happened to Discord. The hourly
 * `pocketbase update` job downloads the new entries and publishes them to the mothership.
 *
 * Single-server shortcut: it edits versions.json in the live checkout, leaving an uncommitted change to commit later.
 */
export const CheckCommand = () =>
  new Command(`check`).description(`Add upstream PocketBase releases missing from versions.json`).action(async () => {
    logger().context({ cli: 'pocketbase:check' })
    const { info, warn, error } = logger()
    try {
      const missing = findMissingVersions(Object.keys(readManifest().versions), await fetchUpstreamVersions())
      if (!missing.length) {
        info('versions.json is up to date with upstream')
        return
      }

      const { added, failed } = await addVersions(missing)
      const lines: string[] = []
      if (added.length) {
        const list = added.map(({ version, host }) => `${version} (${host})`).join(', ')
        lines.push(
          `Picked up PocketBase ${list}. The next hourly \`pocketbase update\` downloads it and adds it to the version picker. ` +
            `versions.json now has an uncommitted change on the server; commit it when convenient.`
        )
      }
      if (failed.length) {
        const list = failed.map(({ version, reason }) => `${version}: ${reason}`).join('; ')
        lines.push(`Couldn't add yet, will retry next run: ${list}`)
      }
      const message = lines.join('\n')
      if (failed.length) warn(message)
      else info(message)

      const url = DISCORD_ALERT_CHANNEL_URL()
      if (!url) {
        warn('DISCORD_ALERT_CHANNEL_URL not set; notice not sent')
        return
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })
      if (!res.ok) throw new Error(`Discord notice failed (${res.status})`)
    } catch (e) {
      error(`PocketBase check failed: ${e}`)
      process.exitCode = 1
    }
  })
