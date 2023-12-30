import {
  DEBUG,
  DefaultSettingsService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_INTERNAL_URL,
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

  const client = new PocketBase(MOTHERSHIP_INTERNAL_URL())
  await client.admins.authWithPassword(
    MOTHERSHIP_ADMIN_USERNAME(),
    MOTHERSHIP_ADMIN_PASSWORD(),
  )

  const membershipCount = await client
    .collection('settings')
    .getFirstListItem(`name = 'founders-edition-count'`)

  const MESSAGES = {
    'founder-announce-1': {
      subject: `Grab your Founder's Edition membership before they're gone (${membershipCount.value} remaining)`,
      body: [
        `Hello, this message is going out to anyone who is already a PocketHost user…`,
        `<p>In case you missed <a href="https://discord.com/channels/1128192380500193370/1179854182363173005/1184769442618552340">the Discord announcement</a>, PocketHost is rolling out a paid tier of unlimited (fair use) bandwidth, storage, and projects.`,
        `<p>New free users are limited to one project. To keep things fair, I made you a Legacy user which means all your existing projects still work but you can’t create new ones.`,
        `<p>As a way of saying thank you to all of you who supported PocketHost in the early days, I made a Founder’s Edition membership where you can pay once ($299) for lifetime access, or pay yearly ($99/yr) which is a 50% discount.`,
        `<p>There are only <span style="text-decoration: line-through;">100</span> ${membershipCount.value} Founder’s Edition memberships. If you want one, please grab one from the PocketHost dashboard (https://app.pockethost.io/dashboard) before I announce it publicly.`,
        `<p>Happy coding! `,
        `<p>~Ben`,
      ],
    },
    'founder-announce-2': {
      subject: `${membershipCount.value} Founder's Memberships left`,
      body: [
        `<p>Just a reminder to anyone who is still thinking about a Founder's membership - they are my way of saying thank you to all of you who supported PocketHost in the early days. They haven't been announced publicly yet, they are just for you guys right now.`,
        `<p>You can grab one for $299 lifetime access, or $99/yr which is a 55% discount.`,
        `<p>There are <span style="text-decoration: line-through;">100</span> ${membershipCount.value} Founder’s Edition memberships available. If you want one, please grab one from your PocketHost account page (https://app.pockethost.io/account).`,
        `<p>Happy coding! `,
        `<p>~Ben`,
      ],
    },
  }

  const TEST = !!process.env.TEST
  const TRAUNCH_SIZE = 1000
  const MESSAGE_ID = `founder-announce-2`
  const TBL_SENT_MESSAGES = `sent_messages`
  const TBL_USERS = 'users'

  const { subject, body } = MESSAGES[MESSAGE_ID]

  const users = (
    await client.collection(TBL_USERS).getFullList(undefined, {
      filter: `verified=1 && unsubscribe=0 && subscription='legacy'`,
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
    users.map((user) => {
      if (TEST) {
        user.email = 'ben@benallfree.com'
      }
      return limiter.schedule(async () => {
        info(`Sending to ${user.email}`)
        await client.send(`/api/mail`, {
          method: 'POST',
          body: {
            to: user.email,
            subject,
            body: body.join(`<p>`),
          },
        })
        if (!TEST) {
          await client
            .collection(TBL_SENT_MESSAGES)
            .create({ user: user.id, message: MESSAGE_ID })
        }
      })
    }),
  )
})()
