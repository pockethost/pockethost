import { ClientResponseError, PocketBase, adminAuthWithPassword, logger, withAdminAuthRetry } from '@'
import { Command, InvalidArgumentError } from 'commander'
import { MOTHERSHIP_ADMIN_PASSWORD, MOTHERSHIP_ADMIN_USERNAME, MOTHERSHIP_URL, TEST_EMAIL } from '../../..'

/**
 * Thin client of the mothership's bulk mail routes (PocketBase CE ext/bulkmail shape). The mothership resolves the
 * audience, keeps the ledger and sends in the background; this command never reads the database file.
 *
 * Campaign ids: legacy campaign_messages kept their ids when they became _bulkmail_campaigns, so `mail send
 * <messageId>` still works.
 */

function myParseInt(value: string) {
  const parsedValue = parseInt(value, 10)
  if (isNaN(parsedValue) || parsedValue < 0) {
    throw new InvalidArgumentError('Not a number.')
  }
  return parsedValue
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Campaign = {
  id: string
  name: string
  subject: string
  status: string
  status_reason: string
  audience: unknown
  queued: number
  sent: number
  skipped: number
  failed: number
}

const progress = (c: Campaign) =>
  `${c.status}: ${c.sent} sent, ${c.queued} queued, ${c.skipped} skipped, ${c.failed} failed${
    c.status_reason ? ` (${c.status_reason})` : ''
  }`

export const SendMailCommand = () =>
  new Command(`send`)
    .description(`Send a PocketHost bulk mail campaign (test send to TEST_EMAIL unless --confirm)`)
    .argument(`<campaignId>`, `ID of the campaign (legacy message ids still work)`)
    .option('--limit <number>', `Max new recipients to queue (0 = everyone in the audience)`, myParseInt, 1)
    .option('--confirm', `Really send messages`, false)
    .option('--watch', `Follow progress until the mothership has sent everything queued`, false)

    .action(async (campaignId, { limit, confirm, watch }) => {
      logger().context({ cli: 'sendmail' })
      const { info } = logger()

      const adminEmail = MOTHERSHIP_ADMIN_USERNAME()
      const adminPassword = MOTHERSHIP_ADMIN_PASSWORD()
      info(MOTHERSHIP_URL())

      const client = new PocketBase(MOTHERSHIP_URL())
      await adminAuthWithPassword(client, adminEmail, adminPassword)
      const auth = <T>(fn: () => Promise<T>) => withAdminAuthRetry(client, adminEmail, adminPassword, fn)
      const call = async <T>(path: string, body?: unknown): Promise<T> => {
        try {
          return await auth(() => client.send(path, { method: 'POST', body }) as Promise<T>)
        } catch (e) {
          const detail = e instanceof ClientResponseError ? `${e.status}: ${e.message}` : String(e)
          throw new Error(`${path}: ${detail}`)
        }
      }
      const load = () => auth(() => client.collection(`_bulkmail_campaigns`).getOne<Campaign>(campaignId))

      const campaign = await load()
      info(`Campaign ${campaign.id}: ${campaign.name}`)
      info(`Subject: ${campaign.subject}`)
      info(progress(campaign))

      const count = await call<{ count: number; suppressed: number; sample: string[] }>(
        `/api/bulkmail/audience/count`,
        {
          audience: campaign.audience,
        }
      )
      info(`Audience: ${count.count} recipient(s), ${count.suppressed} suppressed`)

      if (!confirm) {
        const to = TEST_EMAIL()
        await call(`/api/bulkmail/campaigns/${campaignId}/test`, { to })
        info(`Test sent to ${to}. Add --confirm to send for real.`)
        return
      }

      const started = await call<Campaign>(`/api/bulkmail/campaigns/${campaignId}/start`, { limit })
      info(`Started (${limit ? `up to ${limit} new recipient(s)` : 'whole audience'}): ${progress(started)}`)
      info(`The mothership sends in the background (a cron, every minute). Progress: ${MOTHERSHIP_URL()}/_/`)

      while (watch) {
        await sleep(10000)
        const c = await load()
        info(progress(c))
        if (c.status !== 'sending' || c.queued === 0) break
      }
    })
