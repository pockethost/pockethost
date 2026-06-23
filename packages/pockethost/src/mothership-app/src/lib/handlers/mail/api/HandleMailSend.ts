import { mkLog } from '$util/Logger'
import { mailRecipientSkipReason } from '$util/mailRecipient'

export const HandleMailSend = (e: core.RequestEvent) => {
  const log = mkLog(`mail`)

  let data = new DynamicModel({
    to: '',
    subject: '',
    body: '',
  }) as { to: string; subject: string; body: string }

  log(`before bind`)

  e.bindBody(data)

  log(`after bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  log(`bind parsed`, JSON.stringify(data))

  const { to, subject, body } = data

  try {
    const user = $app.findFirstRecordByData('users', 'email', to)
    const skipReason = mailRecipientSkipReason(user)
    if (skipReason) {
      log(`skipped ${to}: ${skipReason}`)
      return e.json(200, { status: 'skipped', reason: skipReason })
    }
  } catch (_e) {
    log(`no user record for ${to}, sending anyway`)
  }

  const email = new MailerMessage({
    from: {
      address: $app.settings().meta.senderAddress,
      name: $app.settings().meta.senderName,
    },
    to: [{ address: to }],
    bcc: [process.env.TEST_EMAIL].filter((e): e is string => !!e).map((e) => ({ address: e })),
    subject: subject,
    html: body,
  })

  $app.newMailClient().send(email)

  const msg = `Sent to ${to}`
  log(msg)

  return e.json(200, { status: 'ok' })
}
