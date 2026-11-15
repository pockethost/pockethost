import { parseResumeToken } from '$common/billing/loyalty'
import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { findBillingItemRecord, reconcileUser, upsertLsSubscription } from '../lib/billingStore'
import { syncLoyalty } from '../lib/loyaltyStore'
import { lsRequest } from '../lib/lsApi'

/**
 * One-click resume from the "sorry to see you go" email: `GET /api/loyalty/resume?t=<token>` shows a confirm button (a
 * GET never changes anything, because link scanners open every URL in a message); the button POSTs back and the
 * cancelled Lemon Squeezy subscription is resumed (`cancelled: false`), keeping its chain and bonus instances.
 */
const page = (title: string, body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5}` +
  `button{font-size:1rem;padding:.6rem 1.2rem;border-radius:.4rem;border:0;background:#2563eb;color:#fff;cursor:pointer}</style></head>` +
  `<body><h1>${title}</h1>${body}</body></html>`

const secret = () => `${process.env.LS_WEBHOOK_SECRET || ''}`

const ACCOUNT = `<p><a href="https://pockethost.io/account">Go to your account</a></p>`

export const HandleLoyaltyResumePage = (e: core.RequestEvent) => {
  const token = e.request!.url!.query().get('t')
  if (!parseResumeToken($security.hs256, secret(), token)) {
    return e.html(400, page(`Invalid link`, `<p>This resume link isn't valid.</p>${ACCOUNT}`))
  }
  return e.html(
    200,
    page(
      `Resume your subscription`,
      `<p>Pick up right where you left off. You keep every bonus instance and keep earning.</p>` +
        `<form method="post"><input type="hidden" name="t" value="${token.replace(/"/g, '&quot;')}">` +
        `<button type="submit">Resume my subscription</button></form>`
    )
  )
}

export const HandleLoyaltyResume = (e: core.RequestEvent) => {
  const log = mkLog(`loyalty-resume`)
  const audit = mkAudit(log, $app)
  let token = e.request!.url!.query().get('t')
  try {
    const form = e.requestInfo().body || {}
    if (form['t']) token = `${form['t']}`
  } catch (_e) {}
  const subscriptionId = parseResumeToken($security.hs256, secret(), token)
  if (!subscriptionId) return e.html(400, page(`Invalid link`, `<p>This resume link isn't valid.</p>${ACCOUNT}`))

  const rec = findBillingItemRecord($app, {
    provider: `lemonsqueezy`,
    kind: `subscription`,
    external_id: subscriptionId,
  })
  if (!rec) return e.html(404, page(`Not found`, `<p>We couldn't find that subscription.</p>${ACCOUNT}`))
  if (rec.getString(`status`) !== `cancelled`) {
    const ended = [`expired`, `unpaid`].includes(rec.getString(`status`))
    return e.html(
      200,
      page(
        ended ? `This subscription has ended` : `You're all set`,
        ended
          ? `<p>It can't be resumed anymore, but you can <a href="https://pockethost.io/pricing">subscribe again</a>.</p>`
          : `<p>Your subscription is already active.</p>${ACCOUNT}`
      )
    )
  }
  try {
    const sub = lsRequest(`PATCH`, `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      data: { type: `subscriptions`, id: subscriptionId, attributes: { cancelled: false } },
    })?.data
    const userId = rec.getString(`user`)
    if (sub) upsertLsSubscription($app, userId, sub)
    reconcileUser($app, $app.findRecordById(`users`, userId))
    syncLoyalty($app, userId)
    audit(`LS`, `Resumed subscription ${subscriptionId} from the loyalty email.`, { user: userId, subscriptionId })
    return e.html(
      200,
      page(
        `Welcome back!`,
        `<p>Your subscription is active again, and your bonus instances stay with you.</p>${ACCOUNT}`
      )
    )
  } catch (err) {
    log(`resume failed`, `${err}`)
    return e.html(
      500,
      page(
        `Something went wrong`,
        `<p>We couldn't resume it automatically. Just reply to the email and we'll sort it out.</p>`
      )
    )
  }
}
