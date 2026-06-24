import { INSTANCE_MONTHLY_PV_ID, lemonSqueezyVariantId } from '$common/lemonSqueezy'
import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'

const lsJsonHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  Accept: `application/vnd.api+json`,
  'Content-Type': `application/vnd.api+json`,
})

export const HandleLemonSqueezyCancel = (e: core.RequestEvent) => {
  const log = mkLog(`ls-cancel`)
  const audit = mkAudit(log, $app)

  try {
    const authRecord = e.auth
    if (!authRecord) {
      throw new UnauthorizedError(`Authentication required`)
    }

    const subscription = authRecord.get(`subscription`)
    const interval = authRecord.get(`subscription_interval`)
    if (subscription !== `premium` || interval !== `month`) {
      throw new BadRequestError(`No cancellable membership on this account`)
    }

    const apiKey = process.env.LS_API_KEY || $os.getenv(`LS_API_KEY`)
    if (!apiKey) {
      throw new BadRequestError(`Billing is not configured (set LS_API_KEY on mothership)`)
    }

    const email = authRecord.get(`email`)
    const variantId = lemonSqueezyVariantId(INSTANCE_MONTHLY_PV_ID)
    if (!variantId) {
      throw new Error(`Missing variant id for ${INSTANCE_MONTHLY_PV_ID}`)
    }

    const listUrl =
      `https://api.lemonsqueezy.com/v1/subscriptions` +
      `?filter[user_email]=${encodeURIComponent(email)}` +
      `&filter[variant_id]=${variantId}` +
      `&filter[status]=active`

    const listRes = $http.send({
      url: listUrl,
      method: `GET`,
      headers: lsJsonHeaders(apiKey),
      timeout: 30,
    })

    if (listRes.statusCode < 200 || listRes.statusCode >= 300) {
      const detail =
        listRes.json?.errors?.[0]?.detail || listRes.json?.errors?.[0]?.title || JSON.stringify(listRes.json)
      log(`LS list subscriptions failed`, listRes.statusCode, detail)
      throw new BadRequestError(`Could not look up subscription: ${detail}`)
    }

    const subscriptions = listRes.json?.data || []
    if (subscriptions.length === 0) {
      throw new BadRequestError(`No active subscription found for this account`)
    }

    const subscriptionId = `${subscriptions[0].id || ''}`.trim()
    if (!subscriptionId) {
      throw new Error(`Subscription id missing in Lemon Squeezy response`)
    }

    const cancelRes = $http.send({
      url: `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      method: `DELETE`,
      headers: lsJsonHeaders(apiKey),
      timeout: 30,
    })

    if (cancelRes.statusCode < 200 || cancelRes.statusCode >= 300) {
      const detail =
        cancelRes.json?.errors?.[0]?.detail || cancelRes.json?.errors?.[0]?.title || JSON.stringify(cancelRes.json)
      log(`LS cancel failed`, cancelRes.statusCode, detail)
      throw new BadRequestError(`Could not cancel subscription: ${detail}`)
    }

    const endsAt = cancelRes.json?.data?.attributes?.ends_at || null
    log(`subscription cancelled`, authRecord.id, subscriptionId, endsAt)
    audit(`LS`, `Membership cancelled via dashboard.`, {
      user_id: authRecord.id,
      subscription_id: subscriptionId,
      ends_at: endsAt,
    })

    return e.json(200, { status: `cancelled`, endsAt })
  } catch (err) {
    log(`${err}`)
    throw err
  }
}
