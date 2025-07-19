import { PocketBase, UserFields, logger } from '@'
import { map } from '@s-libs/micro-dash'
import Database from 'better-sqlite3'
import Bottleneck from 'bottleneck'
import { Command, InvalidArgumentError } from 'commander'
import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_DATA_DB,
  MOTHERSHIP_URL,
  TEST_EMAIL,
} from '../../..'

const TBL_SENT_MESSAGES = `sent_messages`

function myParseInt(value: string) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10)
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.')
  }
  return parsedValue
}

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

      const db = new Database(MOTHERSHIP_DATA_DB())

      info(MOTHERSHIP_URL())

      const client = new PocketBase(MOTHERSHIP_URL())
      await client.admins.authWithPassword(MOTHERSHIP_ADMIN_USERNAME(), MOTHERSHIP_ADMIN_PASSWORD())

      const message = await client.collection(`campaign_messages`).getOne(messageId, { expand: 'campaign' })
      const { campaign } = message.expand || {}
      dbg({ messageId, limit, message, campaign })

      const vars: { [_: string]: string } = {
        messageId,
      }
      await Promise.all(
        map(campaign.vars, async (sql, k) => {
          const result = db.prepare(sql).get() as { value: string }
          vars[k.toLocaleLowerCase()] = result.value
        })
      )

      dbg({ vars })
      const subject = interpolateString(message.subject, vars)
      const body = interpolateString(message.body, vars)

      const sql = `SELECT u.*
    FROM (${campaign.usersQuery}) u
    LEFT JOIN sent_messages sm ON u.id = sm.user AND sm.campaign_message = '${messageId}'
    WHERE sm.id IS NULL;
     `
      dbg(sql)
      const users = db.prepare(sql).all().slice(0, limit) as UserFields[]

      // dbg({ users })

      const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 100 })
      await Promise.all(
        users.map((user) => {
          return limiter.schedule(async () => {
            if (!confirm) {
              const old = user.email
              user.email = TEST_EMAIL()
              info(`Sending to ${user.email} masking ${old}`)
            } else {
              info(`Sending to ${user.email}`)
            }
            await client.send(`/api/mail`, {
              method: 'POST',
              body: {
                to: user.email,
                subject,
                body: `${body}<hr/>[[<a href="https://pockethost-central.pockethost.io/api/unsubscribe?e=${user.id}">unsub</a>]]`,
              },
            })
            info(`Sent`)
            if (confirm) {
              await client.collection(TBL_SENT_MESSAGES).create({
                user: user.id,
                message: messageId,
                campaign_message: messageId,
              })
            }
          })
        })
      )

      db.close()
    })
