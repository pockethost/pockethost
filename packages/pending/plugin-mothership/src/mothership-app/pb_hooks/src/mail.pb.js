/// <reference path="../types/types.d.ts" />

routerAdd(
  'POST',
  '/api/mail',
  (c) => {
    const { mkLog, audit } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))
    const log = mkLog(`mail`)

    let data = /** @type {{ to: string; subject: string; body: string }} */ (
      new DynamicModel({
        to: '',
        subject: '',
        body: '',
      })
    )

    log(`before bind`)

    c.bind(data)

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
      subject: subject,
      html: body,
    })

    $app.newMailClient().send(email)

    const msg = `Sent to ${to}`
    log(msg)

    return c.json(200, { status: 'ok' })
  },
  $apis.requireAdminAuth(),
)
