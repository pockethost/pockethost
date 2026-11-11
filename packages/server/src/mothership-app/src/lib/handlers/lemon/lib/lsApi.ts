import type { LsOrderResource, LsSubscriptionResource } from '$common/billing/billingItems'
import { isPaidRenewalInvoice, type LsInvoiceAttributes } from '$common/billing/loyalty'

/** Overridable for local testing against a mock; production uses the real API. */
const LS_API = process.env.LS_API_BASE || `https://api.lemonsqueezy.com/v1`

export const lsApiKey = () => {
  const apiKey = process.env.LS_API_KEY || $os.getenv(`LS_API_KEY`)
  if (!apiKey) {
    throw new BadRequestError(`Billing is not configured (set LS_API_KEY on mothership)`)
  }
  return apiKey
}

const headers = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  Accept: `application/vnd.api+json`,
  'Content-Type': `application/vnd.api+json`,
})

const errorDetail = (json: any) => json?.errors?.[0]?.detail || json?.errors?.[0]?.title || JSON.stringify(json)

export const lsRequest = (method: 'GET' | 'DELETE' | 'PATCH', url: string, body?: unknown): any => {
  const res = $http.send({
    url: url.startsWith('http') ? url : `${LS_API}${url}`,
    method,
    headers: headers(lsApiKey()),
    body: body === undefined ? '' : JSON.stringify(body),
    timeout: 30,
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new BadRequestError(`Lemon Squeezy ${method} ${url} failed (${res.statusCode}): ${errorDetail(res.json)}`)
  }
  return res.json
}

/** GET a paginated LS list endpoint and return every `data` entry. */
const lsListAll = <T>(path: string): T[] => {
  const out: T[] = []
  let url: string | undefined = `${path}${path.includes('?') ? '&' : '?'}page[size]=100`
  for (let guard = 0; url && guard < 50; guard++) {
    const json = lsRequest(`GET`, url)
    out.push(...((json?.data as T[]) || []))
    url = json?.links?.next || undefined
  }
  return out
}

export const lsSubscriptionsByEmail = (email: string) =>
  lsListAll<LsSubscriptionResource>(`/subscriptions?filter[user_email]=${encodeURIComponent(email)}`)

export const lsOrdersByEmail = (email: string) =>
  lsListAll<LsOrderResource>(`/orders?filter[user_email]=${encodeURIComponent(email)}`)

export const lsSubscriptionsByOrderId = (orderId: string | number) =>
  lsListAll<LsSubscriptionResource>(`/subscriptions?filter[order_id]=${encodeURIComponent(`${orderId}`)}`)

export const lsSubscription = (subscriptionId: string | number): LsSubscriptionResource =>
  lsRequest(`GET`, `/subscriptions/${encodeURIComponent(`${subscriptionId}`)}`)?.data

/** Cancel at period end. Returns the updated subscription resource. */
export const lsCancelSubscription = (subscriptionId: string | number): LsSubscriptionResource =>
  lsRequest(`DELETE`, `/subscriptions/${encodeURIComponent(`${subscriptionId}`)}`)?.data

/** Paid (not refunded) renewal invoices on one subscription. */
export const lsPaidRenewalCount = (subscriptionId: string | number): number =>
  lsListAll<{ attributes?: LsInvoiceAttributes }>(
    `/subscription-invoices?filter[subscription_id]=${encodeURIComponent(`${subscriptionId}`)}`
  ).filter((inv) => isPaidRenewalInvoice(inv.attributes)).length
