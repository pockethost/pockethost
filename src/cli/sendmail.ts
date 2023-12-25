import {
  DEBUG,
  DefaultSettingsService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  SETTINGS,
} from '$constants'
import { LogLevelName, LoggerService } from '$src/shared'
import Bottleneck from 'bottleneck'
import PocketBase, { RecordModel } from 'pocketbase'
;(async () => {
  DefaultSettingsService(SETTINGS)
  LoggerService({
    level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
  })

  const logger = LoggerService().create(`mail.ts`)

  const { dbg, error, info, warn } = logger
  info(MOTHERSHIP_URL())

  const client = new PocketBase(
    `http://pockethost-central.pockethost.lvh.me:3000`,
  )
  await client.admins.authWithPassword(
    MOTHERSHIP_ADMIN_USERNAME(),
    MOTHERSHIP_ADMIN_PASSWORD(),
  )

  const membershipCount = await client
    .collection('settings')
    .getFirstListItem(`name = 'founders-edition-count'`)

  const MESSAGE = [
    `Hello, this message is going out to anyone who is already a PocketHost user…`,
    `<p>In case you missed <a href="https://discord.com/channels/1128192380500193370/1179854182363173005/1184769442618552340">the Discord announcement</a>, PocketHost is rolling out a paid tier of unlimited (fair use) bandwidth, storage, and projects.`,
    `<p>New free users are limited to one project. To keep things fair, I made you a Legacy user which means all your existing projects still work but you can’t create new ones.`,
    `<p>As a way of saying thank you to all of you who supported PocketHost in the early days, I made a Founder’s Edition membership where you can pay once ($299) for lifetime access, or pay yearly ($99/yr) which is a 50% discount.`,
    `<p>There are only <span style="text-decoration: line-through;">100</span> ${membershipCount.value} Founder’s Edition memberships. If you want one, please grab one from the PocketHost dashboard (https://app.pockethost.io/dashboard) before I announce it publicly.`,
    `<p>Happy coding! `,
    `<p>~Ben`,
  ]

  const TRAUNCH_SIZE = 1
  const MESSAGE_ID = `founder-announce-1`
  const TBL_SENT_MESSAGES = `sent_messages`
  const TBL_USERS = 'users'

  const users = (
    await client.collection(TBL_USERS).getFullList(undefined, {
      filter: `verified=1 && subscription='legacy'`,
      expand: `sent_messages(user)`,
    })
  )
    .filter((user) => {
      const sent = user.expand?.[`sent_messages(user)`] as
        | RecordModel
        | undefined
      if (sent?.find((rec: RecordModel) => rec.message === MESSAGE_ID)) {
        dbg(`Skipping ${user.email}`)
        return false
      }
      return true
    })
    .slice(0, TRAUNCH_SIZE)
  info(`user count ${users.length}`)

  const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 100 })
  await Promise.all(
    users.map((user) =>
      limiter.schedule(async () => {
        info(`Sending to ${user.email}`)
        await client.send(`/api/mail`, {
          method: 'POST',
          body: {
            to: user.email,
            subject: `Grab your Founder's Edition membership before they're gone (${membershipCount.value} remaining)`,
            body: MESSAGE.join(`<p>`),
          },
        })
        await client
          .collection(TBL_SENT_MESSAGES)
          .create({ user: user.id, message: MESSAGE_ID })
      }),
    ),
  )
})()
