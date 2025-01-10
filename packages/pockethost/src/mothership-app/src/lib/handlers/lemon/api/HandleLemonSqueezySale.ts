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
        product_id: number
        product_name: string
        variant_id: number
        variant_name: string
        first_order_item: {
          product_id: number
          product_name: string
          variant_id: number
          variant_name: string
          quantity: number
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
  variant_id: number
  product_name: string
  quantity: number
  variant_name: string
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

    context.product_id =
      context.data?.data?.attributes?.first_order_item?.product_id ||
      context.data?.data?.attributes?.product_id ||
      0

    if (!context.product_id) {
      throw new Error(`No product ID`)
    } else {
      log(`product ID ok`, context.product_id)
    }

    context.product_name =
      context.data?.data?.attributes?.first_order_item?.product_name ||
      context.data?.data?.attributes?.product_name ||
      ''
    log(`product name ok`, context.product_name)

    context.variant_id =
      context.data?.data?.attributes?.first_order_item?.variant_id ||
      context.data?.data?.attributes?.variant_id ||
      0
    if (!context.variant_id) {
      throw new Error(`No variant ID`)
    } else {
      log(`variant ID ok`, context.variant_id)
    }

    context.variant_name =
      context.data?.data?.attributes?.first_order_item?.variant_name ||
      context.data?.data?.attributes?.variant_name ||
      ''
    log(`variant name ok`, context.variant_name)

    context.quantity =
      context.data?.data?.attributes?.first_order_item?.quantity || 0
    log(`quantity ok`, context.quantity)

    const FLOUNDER_ANNUAL_PV_ID = `367781-200790`
    const FLOUNDER_LIFETIME_PV_ID = `306534-441845`
    const PRO_MONTHLY_PV_ID = `159790-200788`
    const PRO_ANNUAL_PV_ID = `159791-200789`
    const FOUNDER_ANNUAL_PV_ID = `159792-200790`
    const PAYWALL_INSTANCE_MONTHLY_PV_ID = `424532-651625`
    const PAYWALL_PRO_MONTHLY_PV_ID = `424532-651629`
    const PAYWALL_PRO_ANNUAL_PV_ID = `424532-651634`
    const PAYWALL_FLOUNDER_PV_ID = `424532-651627`

    const pv_id = `${context.product_id}-${context.variant_id}`

    if (
      ![
        FLOUNDER_ANNUAL_PV_ID,
        FLOUNDER_LIFETIME_PV_ID,
        PRO_MONTHLY_PV_ID,
        PRO_ANNUAL_PV_ID,
        FOUNDER_ANNUAL_PV_ID,
        PAYWALL_INSTANCE_MONTHLY_PV_ID,
        PAYWALL_PRO_MONTHLY_PV_ID,
        PAYWALL_PRO_ANNUAL_PV_ID,
        PAYWALL_FLOUNDER_PV_ID,
      ].includes(pv_id)
    ) {
      throw new Error(`Product and variant not found: ${pv_id}`)
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
      subscription_expired: () => {
        signup_canceller()
      },
      subscription_payment_refunded: () => {
        signup_canceller()
      },
    } as const

    const event_handler =
      event_name_map[context.event_name as keyof typeof event_name_map]
    if (!event_handler) {
      throw new Error(`Unsupported event: ${context.event_name}`)
    } else {
      log(`event handler ok`, event_handler)
    }

    const product_handler_map = {
      // Founder's annual
      [FOUNDER_ANNUAL_PV_ID]: () => {
        userRec.set(`subscription`, `founder`)
        userRec.set(`subscription_interval`, `year`)
      },
      // Pro annual
      [PRO_ANNUAL_PV_ID]: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`subscription_interval`, `year`)
      },
      // Pro monthly
      [PRO_MONTHLY_PV_ID]: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`subscription_interval`, `month`)
      },
      // Flounder lifetime
      [FLOUNDER_LIFETIME_PV_ID]: () => {
        userRec.set(`subscription`, `flounder`)
        userRec.set(`subscription_interval`, `life`)
      },
      // Flounder annual
      [FLOUNDER_ANNUAL_PV_ID]: () => {
        userRec.set(`subscription`, `flounder`)
        userRec.set(`subscription_interval`, `year`)
      },
      // Paywall instance
      [PAYWALL_INSTANCE_MONTHLY_PV_ID]: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`subscription_interval`, `month`)
        userRec.set(`subscription_quantity`, context.quantity)
      },
      // Paywall pro monthly
      [PAYWALL_PRO_MONTHLY_PV_ID]: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`subscription_interval`, `month`)
        userRec.set(`subscription_quantity`, 250)
      },
      // Paywall pro annual
      [PAYWALL_PRO_ANNUAL_PV_ID]: () => {
        userRec.set(`subscription`, `premium`)
        userRec.set(`subscription_interval`, `year`)
        userRec.set(`subscription_quantity`, 250)
      },
      // Paywall flounder
      [PAYWALL_FLOUNDER_PV_ID]: () => {
        userRec.set(`subscription`, `flounder`)
        userRec.set(`subscription_interval`, `life`)
        userRec.set(`subscription_quantity`, 250)
      },
    } as const

    const product_handler =
      product_handler_map[pv_id as keyof typeof product_handler_map]
    if (!product_handler) {
      throw new Error(`No product handler for ${pv_id}`)
    } else {
      log(`product handler ok`, pv_id)
    }

    const signup_finalizer = () => {
      product_handler()
      dao.saveRecord(userRec)
      log(`saved user`)

      const notify = mkNotifier(log, dao)
      const { user_id } = context
      if (!user_id) {
        throw new Error(`User ID expected here`)
      }
      notify(`lemonbot`, `lemon_order_discord`, user_id, context)
      log(`saved discord notice`)
      audit(`LS`, `Signup processed.`, context)
    }

    const signup_canceller = () => {
      userRec.set(`subscription`, `free`)
      userRec.set(`subscription_interval`, ``)
      dao.saveRecord(userRec)
      log(`saved user`)
      audit(`LS`, `Signup cancelled.`, context)
    }

    event_handler()

    return c.json(200, { status: 'ok' })
  } catch (e) {
    audit(`LS_ERR`, `${e}`, context)
    return c.json(500, { status: `error`, error: e.message })
  }
}
