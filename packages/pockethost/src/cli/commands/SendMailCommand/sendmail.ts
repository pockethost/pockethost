import { ClientResponseError, PocketBase, UserFields, adminAuthWithPassword, logger, withAdminAuthRetry } from '@'
import Database from 'better-sqlite3'
import { Command, InvalidArgumentError } from 'commander'
import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_DATA_DB,
  MOTHERSHIP_URL,
  TEST_EMAIL,
} from '../../..'

const TBL_SENT_MESSAGES = `sent_messages`
const SEND_INTERVAL_MS = 100

function myParseInt(value: string) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10)
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.')
  }
  return parsedValue
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const SendMailCommand = () =>
  new Command(`send`)
    .description(`Send a PocketHost bulk mail`)
    .argument(`<messageId>`, `ID of the message to send`)
    .option('--limit <number>', `Max messages to send`, myParseInt, 1)
    .option('--confirm', `Really send messages`, false)

    .action(async (messageId, { limit, confirm }) => {
      logger().context({ cli: 'sendmail' })
      const { dbg, info } = logger()

      function interpolateString(template: string, dict: { [key: string]: string }): string {
        return template.replace(/\{\$(\w+)\}/g, (match, key) => {
          dbg({ match, key })
          const lowerKey = key.toLowerCase()
          return dict.hasOwnProperty(lowerKey) ? dict[lowerKey]! : match
        })
      }

      dbg({ messageId, confirm, limit })

      const adminEmail = MOTHERSHIP_ADMIN_USERNAME()
      const adminPassword = MOTHERSHIP_ADMIN_PASSWORD()

      info(MOTHERSHIP_URL())

      const client = new PocketBase(MOTHERSHIP_URL())
      await adminAuthWithPassword(client, adminEmail, adminPassword)

      const message = await client.collection(`campaign_messages`).getOne(messageId, { expand: 'campaign' })
      const { campaign } = message.expand || {}
      dbg({ messageId, limit, message, campaign })

      const vars: { [_: string]: string } = { messageId }
      let subject: string
      let body: string
      let candidates: UserFields[]

      const db = new Database(MOTHERSHIP_DATA_DB(), { readonly: true })
      try {
        for (const [k, sql] of Object.entries(campaign.vars)) {
          const result = db.prepare(String(sql)).get() as { value: string }
          vars[k.toLocaleLowerCase()] = result.value
        }

        dbg({ vars })
        subject = interpolateString(message.subject, vars)
        body = interpolateString(message.body, vars)

        const audienceSql = `SELECT u.*
    FROM (${campaign.usersQuery}) u
     `
        dbg(audienceSql)
        candidates = db.prepare(audienceSql).all() as UserFields[]
      } finally {
        db.close()
      }

      const sentRecords = await client.collection(TBL_SENT_MESSAGES).getFullList({
        filter: `campaign_message = "${messageId}"`,
        fields: `user`,
      })
      const sentUserIds = new Set(sentRecords.map((r) => r.user))
      const users = candidates.filter((u) => !sentUserIds.has(u.id)).slice(0, limit)

      info(`${users.length} recipient(s) (${sentUserIds.size} already sent)`)

      const auth = <T>(fn: () => Promise<T>) => withAdminAuthRetry(client, adminEmail, adminPassword, fn)

      const recordSent = async (userId: string) => {
        try {
          await client.collection(TBL_SENT_MESSAGES).create({
            user: userId,
            campaign_message: messageId,
          })
        } catch (e) {
          if (!(e instanceof ClientResponseError && e.status === 400)) throw e
          const existing = await client.collection(TBL_SENT_MESSAGES).getList(1, 1, {
            filter: `user = "${userId}" && campaign_message = "${messageId}"`,
          })
          if (existing.items.length === 0) throw e
        }
      }

      for (let i = 0; i < users.length; i++) {
        const user = users[i]!
        const recipient = user.email

        if (!confirm) {
          user.email = TEST_EMAIL()
          info(`Sending to ${user.email} masking ${recipient}`)
        } else {
          info(`Sending to ${user.email}`)
        }

        try {
          await auth(async () => {
            await client.send(`/api/mail`, {
              method: 'POST',
              body: {
                to: user.email,
                subject,
                body: `${body}<hr/>[[<a href="https://pockethost-central.pockethost.io/api/unsubscribe?e=${user.id}">unsub</a>]]`,
              },
            })

            if (confirm) {
              await recordSent(user.id)
            }
          })
        } catch (e) {
          const detail = e instanceof ClientResponseError ? `${e.status}: ${e.message}` : String(e)
          throw new Error(`Failed sending to ${recipient}: ${detail}`)
        }

        info(`Sent`)

        if (i < users.length - 1) {
          await sleep(SEND_INTERVAL_MS)
        }
      }
    })
