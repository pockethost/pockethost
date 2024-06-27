routerAdd('POST', '/api/ls', (c) => {
  const dao = $app.dao()
  const { audit, mkLog, enqueueNotification } = /** @type {Lib} */ (
    require(`${__hooks}/lib.js`)
  )

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

    const userRec = (() => {
      try {
        return dao.findFirstRecordByData('users', 'id', user_id)
      } catch (e) {}
    })()
    if (!userRec) {
      throw new Error(`User ${user_id} not found`)
    } else {
      log(`user record ok`, userRec)
    }

    /** @type{{[_:number]: ()=>void}} */
    const editions = {
      // Founder's annual
      159792: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`isFounder`, true)
      },
      // Founder's lifetime
      159794: () => {
        userRec.set(`subscription`, `lifetime`)
        userRec.set(`isFounder`, true)
      },
      // Pro annual
      159791: () => {
        userRec.set(`subscription`, `premium`)
      },
      // Pro monthly
      159790: () => {
        userRec.set(`subscription`, `premium`)
      },
    }

    const applyEditionSpecifics = editions[product_id]
    if (!applyEditionSpecifics) {
      throw new Error(`Product ID not found: ${product_id}`)
    } else {
      log(`product id ok`, product_id)
    }
    applyEditionSpecifics()

    const payment = new Record(dao.findCollectionByNameOrId('payments'), {
      user: user_id,
      payment_id: `ls_${order_number}`,
    })

    dao.runInTransaction((txDao) => {
      log(`transaction started`)
      if (!userRec.getDateTime(`welcome`)) {
        enqueueNotification(`email`, `welcome`, user_id, { log, dao: txDao })
        userRec.set(`welcome`, new DateTime())
      }
      txDao.saveRecord(userRec)
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

      log(`about to enqueue email`)
      enqueueNotification(`email`, `lemon_order_email`, user_id, {
        dao: txDao,
        log,
      })
      log(`about to enqueue lemonbot`)
      enqueueNotification(`lemonbot`, `lemon_order_discord`, user_id, {
        dao: txDao,
        log,
      })

      log(`saved discord notice`)
    })
    log(`database updated`)
    audit(`LS`, `Order ${order_number} ${product_name} processed.`, {
      log,
      dao,
      extra: {
        email,
        user: user_id,
      },
    })
  } catch (e) {
    audit(`LS_ERR`, `${e}`, {
      log,
      dao,
      extra: {
        email,
        user: user_id,
        raw_payload: raw,
      },
    })
    return c.json(500, `${e}`)
  }

  return c.json(200, { status: 'ok' })
})
