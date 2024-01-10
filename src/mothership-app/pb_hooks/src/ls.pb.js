routerAdd('POST', '/api/ls', (c) => {
  const { audit, mkLog } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))

  const log = mkLog(`ls`)

  const secret = $os.getenv('LS_WEBHOOK_SECRET')
  log(`Secret`, secret)

  const raw = readerToString(c.request().body)
  const data = JSON.parse(raw)
  log(`payload`, JSON.stringify(data, null, 2))

  /** @type {WebHook} */
  let {
    meta: {
      custom_data: { user_id },
    },
    data: {
      type,
      attributes: {
        order_number,
        first_order_item: { product_name, /** @type {number} */ product_id },
        status,
        user_email: email,
      },
    },
  } = data

  log({ user_id, order_number, product_name, product_id, status, email })

  try {
    if (!user_id) {
      throw new Error(`No user ID`)
    } else {
      log(`user ID ok`, user_id)
    }

    if (![`orders`].includes(type)) {
      throw new Error(`Unsupported event: ${type}`)
    } else {
      log(`event type ok`)
    }

    if (![`active`, `paid`].includes(status)) {
      throw new Error(`Unsupported status: ${status}`)
    } else {
      log(`status ok`, status)
    }

    if (!order_number) {
      throw new Error(`No order #`)
    } else {
      log(`order # ok`, order_number)
    }

    const user = (() => {
      try {
        return $app.dao().findFirstRecordByData('users', 'id', user_id)
      } catch (e) {}
    })()
    if (!user) {
      throw new Error(`User ${user_id} not found`)
    } else {
      log(`user record ok`, user)
    }

    /** @type{{[_:number]: ()=>void}} */
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
      throw new Error(`Product ID not found: ${product_id}`)
    } else {
      log(`product id ok`, product_id)
    }
    applyEditionSpecifics()

    const payment = new Record(
      $app.dao().findCollectionByNameOrId('payments'),
      {
        user: user_id,
        payment_id: `ls_${order_number}`,
      },
    )

    $app.dao().runInTransaction((txDao) => {
      txDao.saveRecord(user)
      log(`saved user`)
      txDao.saveRecord(payment)
      log(`saved payment`)
      txDao
        .db()
        .newQuery(
          `update settings set value=value-1 where name='founders-edition-count'`,
        )
        .execute()
      log(`saved founder count`)

      const emailTemplate = $app
        .dao()
        .findFirstRecordByData('message_templates', `slug`, `lemon_order_email`)
      const emailNotification = new Record(
        $app.dao().findCollectionByNameOrId('notifications'),
        {
          user: user_id,
          channel: `email`,
          message_template: emailTemplate.getId(),
          message_template_vars: { product_name },
          payload: {
            to: user.email(),
          },
        },
      )
      txDao.saveRecord(emailNotification)
      log(`saved email notice`)

      const discordTemplate = $app
        .dao()
        .findFirstRecordByData(
          'message_templates',
          `slug`,
          `lemon_order_discord`,
        )
      const discordNotification = new Record(
        $app.dao().findCollectionByNameOrId('notifications'),
        {
          user: user_id,
          channel: `lemonbot`,
          message_template: discordTemplate.getId(),
          message_template_vars: { product_name },
        },
      )
      txDao.saveRecord(discordNotification)
      log(`saved discord notice`)
    })
    log(`database updated`)
    audit(`LS`, `Order ${order_number} ${product_name} processed.`, {
      email,
      user: user_id,
    })
  } catch (e) {
    audit(`LS_ERR`, `${e}`, {
      email,
      user: user_id,
      raw_payload: raw,
    })
    return c.json(500, `${e}`)
  }

  return c.json(200, { status: 'ok' })
})
