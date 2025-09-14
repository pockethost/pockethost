import { mkLog } from '$util/Logger'

export const HandleMailSend = (c: core.RequestEvent) => {
  const log = mkLog(`mail`)

  let data = new DynamicModel({
    to: '',
    subject: '',
    body: '',
  }) as { to: string; subject: string; body: string }

  log(`before bind`)

  c.bindBody(data)

  log(`after bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  log(`bind parsed`, JSON.stringify(data))

  const { to, subject, body } = data

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

  return c.json(200, { status: 'ok' })
}
