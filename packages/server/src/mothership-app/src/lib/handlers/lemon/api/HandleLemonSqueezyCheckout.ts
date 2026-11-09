import { lemonSqueezyVariantId } from '$common/lemonSqueezy'
import { mkLog } from '$util/Logger'

export const HandleLemonSqueezyCheckout = (e: core.RequestEvent) => {
  const log = mkLog(`ls-checkout`)

  try {
    const authRecord = e.auth
    if (!authRecord) {
      throw new UnauthorizedError(`Authentication required`)
    }

    const apiKey = process.env.LS_API_KEY || $os.getenv(`LS_API_KEY`)
    const storeId = process.env.LS_STORE_ID || $os.getenv(`LS_STORE_ID`)
    if (!apiKey || !storeId) {
      throw new BadRequestError(`Checkout is not configured (set LS_API_KEY and LS_STORE_ID on mothership)`)
    }

    const parsed = (() => {
      try {
        return JSON.parse(readerToString(e.request.body))
      } catch {
        throw new BadRequestError(`Invalid JSON body`)
      }
    })()

    const pvId = `${parsed.pvId || ''}`.trim()
    if (!pvId) {
      throw new BadRequestError(`pvId is required`)
    }

    const variantId = lemonSqueezyVariantId(pvId)
    if (!variantId) {
      throw new BadRequestError(`Unknown plan: ${pvId}`)
    }

    const email = authRecord.get(`email`)
    const userId = authRecord.id

    const res = $http.send({
      url: `https://api.lemonsqueezy.com/v1/checkouts`,
      method: `POST`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: `application/vnd.api+json`,
        'Content-Type': `application/vnd.api+json`,
      },
      body: JSON.stringify({
        data: {
          type: `checkouts`,
          attributes: {
            checkout_data: {
              email,
              custom: { user_id: userId },
            },
          },
          relationships: {
            store: { data: { type: `stores`, id: storeId } },
            variant: { data: { type: `variants`, id: variantId } },
          },
        },
      }),
      timeout: 30,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      const detail = res.json?.errors?.[0]?.detail || res.json?.errors?.[0]?.title || JSON.stringify(res.json)
      log(`LS checkout failed`, res.statusCode, detail)
      throw new BadRequestError(`Could not create checkout session: ${detail}`)
    }

    const url = res.json?.data?.attributes?.url
    if (!url) {
      throw new Error(`No checkout URL in Lemon Squeezy response`)
    }

    log(`checkout created`, userId, pvId)
    return e.json(200, { url })
  } catch (err) {
    log(`${err}`)
    throw err
  }
}
