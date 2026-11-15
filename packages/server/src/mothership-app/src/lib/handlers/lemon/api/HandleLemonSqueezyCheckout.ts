import { BROWSER_CLAIM_TOKEN_LENGTH } from '$common/billing/accountClaim'
import { lemonSqueezyVariantId } from '$common/lemonSqueezy'
import { mkLog } from '$util/Logger'

const SITE = `https://pockethost.io`
const ALNUM = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`

export const HandleLemonSqueezyCheckout = (e: core.RequestEvent) => {
  const log = mkLog(`ls-checkout`)

  try {
    // Logged in: the purchase goes to this account. Logged out (pay-first signup): the webhook creates the account
    // from the order email, and the browser claims it with `claim` (common/billing/accountClaim.ts).
    const authRecord = e.auth

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

    const claim = authRecord ? `` : $security.randomStringWithAlphabet(BROWSER_CLAIM_TOKEN_LENGTH, ALNUM)
    const checkoutData = authRecord
      ? { email: authRecord.get(`email`), custom: { user_id: authRecord.id } }
      : { custom: { claim } }
    const redirectUrl = authRecord ? `${SITE}/dashboard?paid=1` : `${SITE}/claim`

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
            checkout_data: checkoutData,
            product_options: { redirect_url: redirectUrl },
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

    log(`checkout created`, authRecord ? authRecord.id : `guest`, pvId)
    return e.json(200, authRecord ? { url } : { url, claim })
  } catch (err) {
    log(`${err}`)
    throw err
  }
}
