/// <reference path="../types/types.d.ts" />

routerAdd('POST', '/api/ls', (c) => {
  const log = (...s) =>
    console.log(
      `*** [ls]`,
      ...s.map((p) => {
        if (typeof p === 'object') return JSON.stringify(p, null, 2)
        return p
      }),
    )
  const error = (...s) => console.error(`***`, ...s)

  const audit = (key, note) => {
    log(note)
    const collection = $app.dao().findCollectionByNameOrId('audit')

    const record = new Record(collection, {
      ...key,
      note,
    })

    $app.dao().saveRecord(record)
  }

  const secret = $os.getenv('LS_WEBHOOK_SECRET')
  log(`Secret`, secret)

  const raw = readerToString(c.request().body)
  const data = JSON.parse(raw)
  log(`payload`, JSON.stringify(data, null, 2))

  const {
    meta: {
      custom_data: { user_id },
    },
    data: {
      type,
      attributes: {
        order_number,
        product_name,
        product_id,
        status,
        user_email: email,
      },
    },
  } = data

  log({ user_id, order_number, product_name, product_id, status, email })

  if (![`active`, `paid`].includes(status)) {
    audit({ email, event: `LS_ERR` }, `Unsupported status ${status}: ${raw}`)
    return c.json(500, { status: 'unsupported status' })
  } else {
    log(`status`, status)
  }

  if (!user_id) {
    audit({ email, event: `LS_ERR` }, `No user ID: ${raw}`)
    return c.json(500, { status: 'no user ID' })
  } else {
    log(`user ID ok`, user_id)
  }

  if (!order_number) {
    audit({ email, event: `LS_ERR` }, `No order #: ${raw}`)
    return c.json(500, { status: 'no order #' })
  } else {
    log(`order # ok`, order_number)
  }

  const user = (() => {
    try {
      return $app.dao().findFirstRecordByData('users', 'id', user_id)
    } catch (e) {}
  })()
  if (!user) {
    audit({ email, event: `LS_ERR` }, `User ${user_id} not found: ${raw}`)
    return c.json(500, { status: 'no user ID' })
  } else {
    log(`user record ok`, user)
  }

  const editions = {
    // Founder's annual
    159792: () => {
      user.set(`subscription`, `premium`)
      user.set(`isFounder`, true)
    },
    // Founder's lifetime
    159794: () => {
      user.set(`subscription`, `lifetime`)
      user.set(`isFounder`, true)
    },
    // Pro annual
    159791: () => {
      user.set(`subscription`, `premium`)
    },
    // Pro monthly
    159790: () => {
      user.set(`subscription`, `premium`)
    },
  }

  const applyEditionSpecifics = editions[product_id]
  if (!applyEditionSpecifics) {
    audit(
      { email, user: user_id, event: `LS_ERR` },
      `Product edition ${product_id} not found: ${raw}`,
    )
    return c.json(500, { status: 'invalid product ID' })
  } else {
    log(`product id ok`, product_id)
  }
  applyEditionSpecifics()

  const collection = $app.dao().findCollectionByNameOrId('payments')
  const payment = new Record(collection, {
    user: user_id,
    payment_id: `ls_${order_number}`,
  })

  try {
    $app.dao().runInTransaction((txDao) => {
      txDao.saveRecord(user)
      txDao.saveRecord(payment)
      txDao
        .db()
        .newQuery(
          `update settings set value=value-1 where name='founders-edition-count'`,
        )
        .execute()
    })
    log(`database updated`)
  } catch (e) {
    audit(
      { email, user: user_id, event: `LS_ERR` },
      `Failed to update database: ${e}: ${raw}`,
    )
    return c.json(500, { status: 'failed to update database' })
  }

  try {
    const res = $http.send({
      url: `https://discord.com/api/webhooks/1193619183594901575/JVDfdUz2HPEUk-nG1RfI3BK2Czyx5vw1YmeH7cNfgvXbHNGPH0oJncOYqxMA_u5b2u57`,
      method: 'POST',
      body: JSON.stringify({
        content: `someone just subscribed to ${product_name}`,
      }),
      headers: { 'content-type': 'application/json' },
      timeout: 5, // in seconds
    })
  } catch (e) {
    audit({ email, event: `LS_ERR` }, `Failed to notify discord: ${e}: ${raw}`)
    return c.json(500, { status: 'failed to notify discord' })
  }
  log(`discord notified`)

  try {
    $app.newMailClient().send(
      new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName,
        },
        to: [{ address: user.email() }],
        subject: `Activated - ${product_name}`,
        html: [
          `<p>Hello, welcome to the PocketHost Pro family!`,
          `<p>Please go find @noaxis on <a href="https://discord.com/channels/1128192380500193370/1128192380500193373">Discord</a> and say hi.`,
          `<p>Thank you *so much!!!* for supporting PocketHost in these early days. If you have any questions or concerns, don't hesitate to reach out.`,
          `<p>~noaxis`,
        ].join(`\n`),
      }),
    )
  } catch (e) {
    audit({ email, event: `LS_ERR` }, `Failed to send email: ${e}: ${raw}`)
    return c.json(500, { status: 'failed to send email' })
  }

  log(`email sent`)
  audit({ email, user: user_id, event: `LS_OK` }, `Payment successful`)

  return c.json(200, { status: 'ok' })
})
