import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { mkNotifier } from '$util/mkNotifier'
import { PartialDeep } from 'type-fest'

type LemonSqueezyDebugContext = PartialDeep<{
  secret: string
  raw: string
  body_hash: string
  xsignature_header: string
  data: {
    data: {
      attributes: {
        product_id: string
        product_name: string
        first_order_item: {
          product_id: string
          product_name: string
        }
      }
      type: string
    }
    meta: {
      event_name: string
      custom_data: {
        user_id: string
      }
    }
  }
  type: string
  event_name: string
  user_id: string
  product_id: number
  product_name: string
}>

export const HandleLemonSqueezySale = (c: echo.Context) => {
  const dao = $app.dao()

  const log = mkLog(`ls`)
  const audit = mkAudit(log, dao)
  const context: LemonSqueezyDebugContext = {}

  log(`Top of ls`)
  try {
    context.secret = process.env.LS_WEBHOOK_SECRET
    if (!context.secret) {
      throw new Error(`No secret`)
    }
    log(`Secret`, context.secret)

    context.raw = readerToString(c.request().body)

    context.body_hash = $security.hs256(context.raw, context.secret)
    log(`Body hash`, context.body_hash)

    context.xsignature_header = c.request().header.get('X-Signature')
    log(`Signature`, context.xsignature_header)

    if (
      context.xsignature_header == undefined ||
      !$security.equal(context.body_hash, context.xsignature_header)
    ) {
      throw new BadRequestError(`Invalid signature`)
    }
    log(`Signature verified`)

    context.data = JSON.parse(context.raw)
    log(`payload`, JSON.stringify(context.data, null, 2))

    context.type = context.data?.data?.type
    if (!context.type) {
      throw new Error(`No type`)
    } else {
      log(`type ok`, context.type)
    }

    context.event_name = context.data?.meta?.event_name
    if (!context.event_name) {
      throw new Error(`No event name`)
    } else {
      log(`event name ok`, context.event_name)
    }

    context.user_id = context.data?.meta?.custom_data?.user_id
    if (!context.user_id) {
      throw new Error(`No user ID`)
    } else {
      log(`user ID ok`, context.user_id)
    }

    context.product_id = parseInt(
      (context.type === 'orders'
        ? context.data?.data?.attributes?.first_order_item?.product_id
        : context.data?.data?.attributes?.product_id) || '0',
    )
    if (!context.product_id) {
      throw new Error(`No product ID`)
    } else {
      log(`product ID ok`, context.product_id)
    }

    context.product_name =
      context.type === 'orders'
        ? context.data?.data?.attributes?.first_order_item?.product_name
        : context.data?.data?.attributes?.product_name
    if (!context.product_name) {
      throw new Error(`No product name`)
    } else {
      log(`product name ok`, context.product_name)
    }

    const userRec = (() => {
      try {
        return dao.findFirstRecordByData('users', 'id', context.user_id)
      } catch (e) {
        throw new Error(`User ${context.user_id} not found`)
      }
    })()
    log(`user record ok`, userRec)

    const event_name_map = {
      order_created: () => {
        signup_finalizer()
      },
      order_refunded: () => {
        signup_canceller()
      },
      subscription_created: () => {
        signup_finalizer()
      },
      subscription_expired: () => {
        signup_canceller()
      },
    } as const
    const event_handler =
      event_name_map[context.event_name as keyof typeof event_name_map]
    if (!event_handler) {
      log(`unsupported event`, context.event_name)
      return c.json(200, {
        status: `warning: unsupported event ${context.event_name}`,
      })
    } else {
      log(`event handler ok`, event_handler)
    }

    const SUBSCRIPTION_PRODUCT_IDS = [159792, 159791, 159790, 367781]

    if (
      context.event_name === 'order_created' &&
      SUBSCRIPTION_PRODUCT_IDS.includes(context.product_id)
    ) {
      log(`ignoring order event for subscription`)
      return c.json(200, {
        status: `warning: order event ignored for subscription`,
      })
    }

    const product_handler_map = {
      // Founder's annual
      159792: () => {
        userRec.set(`subscription`, `founder`)
        userRec.set(`subscription_interval`, `year`)
      },
      // Founder's lifetime
      159794: () => {
        userRec.set(`subscription`, `founder`)
        userRec.set(`subscription_interval`, `life`)
      },
      // Pro annual
      159791: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`subscription_interval`, `year`)
      },
      // Pro monthly
      159790: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`subscription_interval`, `month`)
      },
      // Flounder lifetime
      306534: () => {
        userRec.set(`subscription`, `flounder`)
        userRec.set(`subscription_interval`, `life`)
      },
      // Flounder annual
      367781: () => {
        userRec.set(`subscription`, `flounder`)
        userRec.set(`subscription_interval`, `year`)
      },
    } as const
    const product_handler =
      product_handler_map[
        context.product_id as keyof typeof product_handler_map
      ]
    if (!product_handler) {
      throw new Error(`No product handler for ${context.product_id}`)
    } else {
      log(`product handler ok`, product_handler)
    }

    const signup_finalizer = () => {
      product_handler()
      dao.runInTransaction((txDao) => {
        log(`transaction started`)
        txDao.saveRecord(userRec)
        log(`saved user`)

        const notify = mkNotifier(log, txDao)
        const { user_id } = context
        if (!user_id) {
          throw new Error(`User ID expected here`)
        }
        notify(`lemonbot`, `lemon_order_discord`, user_id, context)
        log(`saved discord notice`)
      })
      log(`database updated`)
      audit(`LS`, `Signup processed.`, context)
    }

    const signup_canceller = () => {
      userRec.set(`subscription`, `free`)
      userRec.set(`subscription_interval`, ``)
      dao.runInTransaction((txDao) => {
        txDao.saveRecord(userRec)
        log(`saved user`)
      })
      log(`database updated`)
      audit(`LS`, `Signup cancelled.`, context)
    }

    event_handler()

    return c.json(200, { status: 'ok' })
  } catch (e) {
    audit(`LS_ERR`, `${e}`, context)
    return c.json(500, { status: `error`, error: e.message })
  }
}
