/// <reference path="../types/types.d.ts" />

routerAdd(
  'POST',
  '/api/mail',
  (c) => {
    let data = new DynamicModel({
      to: '',
      subject: '',
      body: '',
    })

    console.log(`***before bind`)

    c.bind(data)

    console.log(`***after bind`)

    // This is necessary for destructuring to work correctly
    data = JSON.parse(JSON.stringify(data))

    console.log(`***bind parsed`, JSON.stringify(data))

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

    const msg = `***Sent to ${to}`
    console.log(msg)

    return c.json(200, { status: 'ok' })
  },
  $apis.requireAdminAuth(),
)
