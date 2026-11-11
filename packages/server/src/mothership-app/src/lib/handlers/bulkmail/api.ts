/** Routes shaped exactly like PocketBase CE ext/bulkmail (routes.go). */
import { mkLog } from '$util/Logger'
import { escapeHtml } from '$util/bulkmail/template'
import {
  bulkMailLimits,
  cancelCampaign,
  countAudience,
  getSettings,
  isSuppressed,
  parseToken,
  pauseCampaign,
  previewCampaign,
  resumeCampaign,
  saveSettings,
  startCampaign,
  suppress,
  testCampaign,
} from './engine'

const body = (e: core.RequestEvent): any => {
  try {
    const info = e.requestInfo()
    return JSON.parse(JSON.stringify(info.body || {}))
  } catch (_e) {
    return {}
  }
}

const settingsResponse = () => {
  const s = getSettings()
  const { rate, daily } = bulkMailLimits()
  const row = new DynamicModel({ n: 0 }) as { n: number }
  $app
    .db()
    .newQuery(`SELECT COUNT(*) AS n FROM _bulkmail_sends WHERE status = 'sent' AND sent_at >= {:start}`)
    .bind({ start: new Date().toISOString().slice(0, 10) + ' 00:00:00.000Z' })
    .one(row)
  const base = `${$app.settings().meta.appURL || ''}`.replace(/\/+$/, '')
  return {
    ...s,
    secret: '',
    webhookSecret: '',
    hasWebhookSecret: !!s.webhookSecret,
    rate,
    daily,
    sentToday: row.n,
    allowed: true,
    sesEndpoint: `${base}/api/sns`,
    webhookEndpoint: `${base}/api/bulkmail/feedback/webhook`,
  }
}

export const HandleBulkMailGetSettings = (e: core.RequestEvent) => e.json(200, settingsResponse())

export const HandleBulkMailSaveSettings = (e: core.RequestEvent) => {
  const cur = getSettings()
  const b = body(e)
  for (const k of ['fromName', 'fromAddress', 'postalAddress', 'unsubscribeMailto'] as const) {
    if (typeof b[k] === 'string') cur[k] = b[k].trim()
  }
  if (Array.isArray(b.snsTopicArns)) cur.snsTopicArns = b.snsTopicArns.filter((v: any) => typeof v === 'string' && v)
  if (typeof b.webhookSecret === 'string' && b.webhookSecret) cur.webhookSecret = b.webhookSecret
  saveSettings(cur)
  return e.json(200, settingsResponse())
}

const wrap = (e: core.RequestEvent, fn: () => any) => {
  try {
    const res = fn()
    return res === undefined ? e.noContent(204) : e.json(200, res)
  } catch (err) {
    throw new BadRequestError(`${err}`.replace(/^Error: /, ''))
  }
}

export const HandleBulkMailCount = (e: core.RequestEvent) => wrap(e, () => countAudience(body(e).audience, 5))

export const HandleBulkMailCampaignAction = (e: core.RequestEvent) => {
  const id = e.request!.pathValue('id')
  const action = e.request!.pathValue('action')
  const b = body(e)
  return wrap(e, () => {
    switch (action) {
      case 'start':
        return startCampaign(id, parseInt(`${b.limit || 0}`, 10) || 0)
      case 'pause':
        return pauseCampaign(id)
      case 'resume':
        return resumeCampaign(id)
      case 'cancel':
        return cancelCampaign(id)
      case 'test':
        testCampaign(id, `${b.to || ''}`)
        return undefined
      case 'preview':
        return previewCampaign(id, `${b.email || ''}`)
    }
    throw new Error(`unknown action ${action}`)
  })
}

// --- public: signed unsubscribe links ----------------------------------------------------------------------------

const page = (title: string, html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>${escapeHtml(title)}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#222}` +
  `button{font:inherit;padding:.5rem 1.25rem;border:0;border-radius:6px;background:#222;color:#fff;cursor:pointer}</style></head><body>` +
  `<h1>${escapeHtml(title)}</h1>${html}</body></html>`

const notifyBen = (email: string) => {
  try {
    $app.newMailClient().send(
      new MailerMessage({
        from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
        to: [{ address: `ben@benallfree.com` }],
        subject: `UNSUBSCRIBE ${email}`,
      })
    )
  } catch (_e) {}
}

export const HandleBulkMailUnsubscribePage = (e: core.RequestEvent) => {
  const token = e.request!.url!.query().get('t')
  const parsed = parseToken(token)
  if (!parsed) return e.html(400, page('Invalid link', `<p>This unsubscribe link isn't valid.</p>`))
  if (isSuppressed(parsed.email)) {
    return e.html(200, page('Unsubscribed', `<p>${escapeHtml(parsed.email)} won't receive these emails anymore.</p>`))
  }
  // a GET never unsubscribes: link scanners open every URL in a message
  return e.html(
    200,
    page(
      'Unsubscribe',
      `<p>Stop sending these emails to <b>${escapeHtml(parsed.email)}</b>?</p>` +
        `<form method="post"><input type="hidden" name="t" value="${escapeHtml(token)}">` +
        `<button type="submit">Unsubscribe</button></form>`
    )
  )
}

/** The confirm form and RFC 8058 one-click POSTs from mail providers. */
export const HandleBulkMailUnsubscribe = (e: core.RequestEvent) => {
  const log = mkLog('bulkmail')
  let token = e.request!.url!.query().get('t')
  let oneClick = false
  try {
    const form = e.requestInfo().body || {}
    if (form['t']) token = `${form['t']}`
    oneClick = `${form['List-Unsubscribe'] || ''}` === 'One-Click'
  } catch (_e) {}
  const parsed = parseToken(token)
  if (!parsed) return e.html(400, page('Invalid link', `<p>This unsubscribe link isn't valid.</p>`))
  suppress(parsed.email, 'unsubscribed', oneClick ? 'one-click' : 'link', parsed.campaignId)
  log(`unsubscribed ${parsed.email} (${oneClick ? 'one-click' : 'link'})`)
  notifyBen(parsed.email)
  return e.html(200, page('Unsubscribed', `<p>${escapeHtml(parsed.email)} won't receive these emails anymore.</p>`))
}

/** {"type":"bounce|complaint|unsubscribe","email":"…","campaign":"…"} with X-Bulkmail-Secret. */
export const HandleBulkMailWebhook = (e: core.RequestEvent) => {
  const s = getSettings()
  const given = e.request!.header.get('X-Bulkmail-Secret')
  if (!s.webhookSecret || given !== s.webhookSecret) throw new UnauthorizedError('')
  const b = body(e)
  const reason = { bounce: 'bounced', complaint: 'complained', unsubscribe: 'unsubscribed' }[`${b.type}`.toLowerCase()]
  if (!reason) throw new BadRequestError('type must be bounce, complaint or unsubscribe')
  if (!suppress(`${b.email || ''}`, reason, 'webhook', `${b.campaign || ''}`))
    throw new BadRequestError('invalid email')
  return e.noContent(204)
}
