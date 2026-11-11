/**
 * Bulk mail on the legacy mothership, on the PocketBase CE ext/bulkmail schema (_bulkmail_campaigns, _bulkmail_sends,
 * _bulkmail_suppressions, _params "bulkmail"). Same routes, statuses, ledger and unsubscribe tokens as the CE plugin,
 * so the Pocker mothership can take over the same database with nothing to convert.
 *
 * PocketHost specifics (the EE part): recipients must be verified users, and users.unsubscribe stays in sync with the
 * suppression list both ways (see sync.ts).
 */
import { mkLog } from '$util/Logger'
import {
  convertLegacyTemplate,
  footerHtml,
  footerText,
  htmlToText,
  normalizeEmail,
  parseTemplate,
  renderTemplate,
} from '$util/bulkmail/template'
import { parseUnsubscribeToken, unsubscribeToken } from '$util/bulkmail/token'

export { convertLegacyTemplate }

export const BM_CAMPAIGNS = '_bulkmail_campaigns'
export const BM_SENDS = '_bulkmail_sends'
export const BM_SUPPRESSIONS = '_bulkmail_suppressions'

const MAX_ATTEMPTS = 3
const BRAKE_MIN = 100
const BRAKE_RATE = 0.05

const nowStr = () => new Date().toISOString().replace('T', ' ')

export const bulkMailLimits = () => {
  const rate = parseFloat(`${process.env.BULKMAIL_RATE || ''}`) || 10
  const daily = parseInt(`${process.env.BULKMAIL_DAILY || ''}`, 10) || 50000
  return { rate, daily }
}

// --- settings (_params "bulkmail", same JSON as CE) ------------------------------------------------------------

export type BulkMailSettings = {
  fromName: string
  fromAddress: string
  postalAddress: string
  unsubscribeMailto: string
  snsTopicArns: string[]
  secret: string
  webhookSecret: string
}

export const getSettings = (app: typeof $app = $app): BulkMailSettings => {
  const s: BulkMailSettings = {
    fromName: '',
    fromAddress: '',
    postalAddress: '',
    unsubscribeMailto: '',
    snsTopicArns: [],
    secret: '',
    webhookSecret: '',
  }
  const row = new DynamicModel({ value: '' }) as { value: string }
  try {
    app.db().newQuery(`SELECT value FROM _params WHERE id = 'bulkmail'`).one(row)
    Object.assign(s, JSON.parse(row.value || '{}'))
  } catch (_e) {
    // no row yet
  }
  if (!s.secret) {
    s.secret = $security.randomStringWithAlphabet(64, '0123456789abcdef')
    saveSettings(s, app)
  }
  return s
}

export const saveSettings = (s: BulkMailSettings, app: typeof $app = $app) => {
  const value = JSON.stringify(s)
  const now = nowStr()
  app
    .db()
    .newQuery(
      `INSERT INTO _params (id, value, created, updated) VALUES ('bulkmail', {:value}, {:now}, {:now})
       ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated = excluded.updated`
    )
    .bind({ value, now })
    .execute()
}

const publicUrl = () => `${$app.settings().meta.appURL || 'https://mothership.pockethost.io'}`.replace(/\/+$/, '')

export const unsubscribeUrl = (email: string, campaignId: string) =>
  `${publicUrl()}/api/bulkmail/unsubscribe?t=${encodeURIComponent(
    unsubscribeToken($security.hs256, getSettings().secret, email, campaignId)
  )}`

export const parseToken = (token: string) => parseUnsubscribeToken($security.hs256, getSettings().secret, token)

// --- suppressions -----------------------------------------------------------------------------------------------

export const isSuppressed = (email: string, app: typeof $app = $app) => {
  const e = normalizeEmail(email)
  if (!e) return false
  try {
    app.findFirstRecordByData(BM_SUPPRESSIONS, 'email', e)
    return true
  } catch (_e) {
    return false
  }
}

/** Adds or updates a suppression (record hooks then mirror it into users.unsubscribe). */
export const suppress = (email: string, reason: string, source: string, campaignId = '', app: typeof $app = $app) => {
  const e = normalizeEmail(email)
  if (!e) return null
  let rec: core.Record
  try {
    rec = app.findFirstRecordByData(BM_SUPPRESSIONS, 'email', e)
  } catch (_e) {
    rec = new Record(app.findCollectionByNameOrId(BM_SUPPRESSIONS))
    rec.set('email', e)
  }
  rec.set('reason', reason)
  rec.set('source', source)
  rec.set('campaign', campaignId)
  app.save(rec)
  return rec
}

// --- audience ----------------------------------------------------------------------------------------------------

type Audience = { collection?: string; filter?: string; email_field?: string; sql?: string }
type Recipient = { email: string; recordRef: string; data: { [k: string]: any } }

export const parseAudience = (raw: any): Audience => {
  let a: Audience = {}
  if (typeof raw === 'string') a = raw ? JSON.parse(raw) : {}
  else if (raw) a = JSON.parse(JSON.stringify(raw))
  if (!a.sql && !a.collection) throw new Error('audience needs a collection or a SQL query')
  if (!a.email_field) a.email_field = 'email'
  return a
}

/** Runs a superuser-authored SELECT read-only (SQLite query_only) in a transaction that is always rolled back. */
const queryReadOnly = <T>(sql: string, model: T): T[] => {
  sql = sql.trim().replace(/;+\s*$/, '')
  if (!/^\s*(select|with)\b/i.test(sql)) throw new Error('audience SQL must be a single SELECT')
  if (sql.includes(';')) throw new Error('audience SQL must be a single statement')
  const rows = arrayOf(model) as unknown as T[]
  let queryErr: any = null
  try {
    $app.runInTransaction((tx) => {
      tx.db().newQuery('PRAGMA query_only = ON').execute()
      try {
        tx.db().newQuery(sql).all(rows)
      } catch (e) {
        queryErr = e
      }
      tx.db().newQuery('PRAGMA query_only = OFF').execute()
      throw new Error('__rollback__')
    })
  } catch (e) {
    if (!`${e}`.includes('__rollback__')) throw e
  }
  if (queryErr) throw queryErr
  return rows
}

const userData = (u: core.Record) => {
  const data = JSON.parse(JSON.stringify(u.publicExport())) as { [k: string]: any }
  data.email = u.email()
  data.verified = u.verified()
  return data
}

const eachRecipient = (a: Audience, fn: (r: Recipient) => boolean | void) => {
  if (a.sql) {
    // legacy audiences are usersQuery SQL returning user rows; id lets the sender load the full user
    const rows = queryReadOnly(a.sql, new DynamicModel({ id: '', email: '' })) as { id: string; email: string }[]
    for (const row of rows) {
      const recordRef = row.id ? `users:${row.id}` : ''
      if (fn({ email: row.email, recordRef, data: { id: row.id, email: row.email } }) === false) return
    }
    return
  }
  const col = $app.findCollectionByNameOrId(a.collection!)
  let lastId = ''
  for (;;) {
    const filter = a.filter?.trim() ? `(${a.filter}) && id > {:lastId}` : 'id > {:lastId}'
    const recs = $app.findRecordsByFilter(col.id, filter, 'id', 500, 0, { lastId })
    for (const r of recs) {
      if (!r) continue
      const data = JSON.parse(JSON.stringify(r.publicExport()))
      data.email = r.getString(a.email_field!)
      if (fn({ email: r.getString(a.email_field!), recordRef: `${col.name}:${r.id}`, data }) === false) return
    }
    if (recs.length < 500) return
    lastId = recs[recs.length - 1]!.id
  }
}

const suppressedSet = () => {
  const rows = arrayOf(new DynamicModel({ email: '' })) as unknown as { email: string }[]
  $app.db().newQuery(`SELECT email FROM ${BM_SUPPRESSIONS}`).all(rows)
  const set: { [e: string]: true } = {}
  rows.forEach((r) => (set[r.email] = true))
  return set
}

export const countAudience = (audience: any, sampleSize = 5) => {
  const a = parseAudience(audience)
  const sup = suppressedSet()
  const seen: { [e: string]: true } = {}
  let count = 0
  let suppressed = 0
  const sample: string[] = []
  eachRecipient(a, (r) => {
    const e = normalizeEmail(r.email)
    if (!e || seen[e]) return
    seen[e] = true
    if (sup[e]) return void suppressed++
    count++
    if (sample.length < sampleSize) sample.push(e)
  })
  return { count, suppressed, sample }
}

// --- campaigns ---------------------------------------------------------------------------------------------------

const campaign = (id: string) => {
  try {
    return $app.findRecordById(BM_CAMPAIGNS, id)
  } catch (_e) {
    throw new Error(`campaign "${id}" not found`)
  }
}

const fromAddress = (c: core.Record) => {
  const s = getSettings()
  let name = c.getString('from_name')
  let address = c.getString('from_address')
  if (!address) {
    address = s.fromAddress
    name = name || s.fromName
  }
  if (!address) {
    address = $app.settings().meta.senderAddress
    name = name || $app.settings().meta.senderName
  }
  return { name, address }
}

const resolveVars = (c: core.Record) => {
  const raw = JSON.parse(c.getString('vars') || '{}') || {}
  const out: { [k: string]: any } = {}
  for (const name of Object.keys(raw)) {
    const v = raw[name]
    if (v && typeof v === 'object' && typeof v.sql === 'string') {
      const rows = queryReadOnly(v.sql, new DynamicModel({ value: '' })) as { value: string }[]
      out[name] = rows[0]?.value ?? ''
    } else {
      out[name] = v
    }
  }
  return out
}

const varsCache: { [campaignId: string]: { [k: string]: any } } = {}

const validate = (c: core.Record) => {
  if (!c.getString('subject').trim()) throw new Error('the campaign needs a subject')
  if (!c.getString('html').trim() && !c.getString('text').trim()) throw new Error('the campaign needs a body')
  parseAudience(c.getString('audience'))
  for (const f of ['subject', 'html', 'text']) {
    try {
      parseTemplate(c.getString(f))
    } catch (e) {
      throw new Error(`${f}: ${e}`)
    }
  }
  if (!fromAddress(c).address) throw new Error('set a sender address')
}

export const refreshCounters = (c: core.Record) => {
  const rows = arrayOf(new DynamicModel({ status: '', n: 0 })) as unknown as { status: string; n: number }[]
  $app
    .db()
    .newQuery(`SELECT status, COUNT(*) AS n FROM ${BM_SENDS} WHERE campaign = {:id} GROUP BY status`)
    .bind({ id: c.id })
    .all(rows)
  const counts: { [s: string]: number } = {}
  rows.forEach((r) => (counts[r.status] = r.n))
  c.set('queued', counts.queued || 0)
  c.set('sent', counts.sent || 0)
  c.set('skipped', counts.skipped || 0)
  c.set('failed', counts.failed || 0)
  $app.save(c)
}

const setStatus = (c: core.Record, status: string, reason = '') => {
  c.set('status', status)
  c.set('status_reason', reason)
  if (status === 'done') c.set('finished_at', nowStr())
  $app.save(c)
}

/** Queues audience members not yet in the ledger (at most limit new ones when limit > 0). */
const queue = (c: core.Record, limit = 0) => {
  const a = parseAudience(c.getString('audience'))
  const sup = suppressedSet()
  const existing = arrayOf(new DynamicModel({ email: '' })) as unknown as { email: string }[]
  $app.db().newQuery(`SELECT email FROM ${BM_SENDS} WHERE campaign = {:id}`).bind({ id: c.id }).all(existing)
  const seen: { [e: string]: true } = {}
  existing.forEach((r) => (seen[r.email] = true))

  const rows: { email: string; ref: string; status: string; reason: string }[] = []
  let queued = 0
  eachRecipient(a, (r) => {
    const e = normalizeEmail(r.email)
    if (!e || seen[e]) return
    seen[e] = true
    if (sup[e]) {
      rows.push({ email: e, ref: r.recordRef, status: 'skipped', reason: 'suppressed' })
      return
    }
    rows.push({ email: e, ref: r.recordRef, status: 'queued', reason: '' })
    queued++
    if (limit > 0 && queued >= limit) return false
  })

  const now = nowStr()
  $app.runInTransaction((tx) => {
    for (const r of rows) {
      tx.db()
        .newQuery(
          `INSERT OR IGNORE INTO ${BM_SENDS} (id, campaign, email, record_ref, status, reason, attempts, retry_at, sent_at, message_id, created, updated)
           VALUES ('r'||lower(hex(randomblob(7))), {:c}, {:email}, {:ref}, {:status}, {:reason}, 0, '', '', '', {:now}, {:now})`
        )
        .bind({ c: c.id, email: r.email, ref: r.ref, status: r.status, reason: r.reason, now })
        .execute()
    }
  })
  return queued
}

const queueAndSend = (c: core.Record, limit = 0) => {
  delete varsCache[c.id]
  varsCache[c.id] = resolveVars(c)
  queue(c, limit)
  c.set('status', 'sending')
  c.set('status_reason', '')
  if (!c.getString('started_at')) c.set('started_at', nowStr())
  c.set('finished_at', '')
  refreshCounters(c)
  return c
}

export const startCampaign = (id: string, limit = 0) => {
  const c = campaign(id)
  const status = c.getString('status')
  if (status === 'sending') return c
  if (status === 'canceled') throw new Error('this campaign was canceled; duplicate it to send again')
  validate(c)
  const at = c.getString('scheduled_at')
  if (at && new Date(at.replace(' ', 'T')).getTime() > Date.now()) {
    setStatus(c, 'scheduled')
    return c
  }
  return queueAndSend(c, limit)
}

export const pauseCampaign = (id: string) => {
  const c = campaign(id)
  if (!['sending', 'scheduled'].includes(c.getString('status')))
    throw new Error(`can't pause a ${c.getString('status')} campaign`)
  setStatus(c, 'paused', 'Paused by a superuser.')
  return c
}

export const resumeCampaign = (id: string) => {
  const c = campaign(id)
  if (c.getString('status') !== 'paused') throw new Error(`can't resume a ${c.getString('status')} campaign`)
  if (!c.getString('started_at')) {
    c.set('status', 'draft')
    $app.save(c)
    return startCampaign(id)
  }
  setStatus(c, 'sending')
  return c
}

export const cancelCampaign = (id: string) => {
  const c = campaign(id)
  if (['done', 'canceled'].includes(c.getString('status')))
    throw new Error(`can't cancel a ${c.getString('status')} campaign`)
  $app
    .db()
    .newQuery(
      `UPDATE ${BM_SENDS} SET status = 'skipped', reason = 'campaign canceled', updated = {:now} WHERE campaign = {:id} AND status = 'queued'`
    )
    .bind({ id: c.id, now: nowStr() })
    .execute()
  c.set('finished_at', nowStr())
  c.set('status', 'canceled')
  c.set('status_reason', 'Canceled by a superuser.')
  refreshCounters(c)
  return c
}

const loadRecipientData = (email: string, recordRef: string) => {
  let data: { [k: string]: any } = { email }
  const i = recordRef.indexOf(':')
  if (i > 0) {
    try {
      const rec = $app.findRecordById(recordRef.slice(0, i), recordRef.slice(i + 1))
      data = rec.collection().name === 'users' ? userData(rec) : JSON.parse(JSON.stringify(rec.publicExport()))
    } catch (_e) {
      // record gone; render with what we have
    }
  }
  return data
}

export const buildMessage = (c: core.Record, email: string, record: { [k: string]: any }) => {
  const s = getSettings()
  const vars = varsCache[c.id] || (varsCache[c.id] = resolveVars(c))
  const from = fromAddress(c)
  const unsub = unsubscribeUrl(email, c.id)
  const data = { ...vars, record, email, unsubscribe_url: unsub, campaign: { id: c.id, name: c.getString('name') } }

  const subject = renderTemplate(c.getString('subject'), data, false).replace(/\n/g, ' ').trim()
  let html = renderTemplate(c.getString('html'), data, true)
  let text = renderTemplate(c.getString('text'), data, false)
  if (!text.trim()) text = htmlToText(html)
  if (html.trim()) html += footerHtml(unsub, s.postalAddress)
  text += footerText(unsub, s.postalAddress)

  let listUnsub = `<${unsub}>`
  if (s.unsubscribeMailto) listUnsub += `, <mailto:${s.unsubscribeMailto}?subject=unsubscribe>`
  const domain = from.address.split('@')[1] || 'localhost'

  return new MailerMessage({
    from,
    to: [{ address: email }],
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': listUnsub,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Message-ID': `<bm.${$security.pseudorandomString(20)}@${domain}>`,
      'X-Bulkmail-Campaign': c.id,
    },
  })
}

const firstRecipient = (c: core.Record, email = '') => {
  const want = normalizeEmail(email)
  let found: Recipient | null = null
  eachRecipient(parseAudience(c.getString('audience')), (r) => {
    const e = normalizeEmail(r.email)
    if (!e || (want && e !== want)) return
    found = { ...r, email: e }
    return false
  })
  if (found) return found as Recipient
  if (want) return { email: want, recordRef: '', data: { email: want } }
  throw new Error('the audience matches nobody')
}

export const previewCampaign = (id: string, email = '') => {
  const c = campaign(id)
  delete varsCache[c.id]
  const r = firstRecipient(c, email)
  const msg = buildMessage(c, r.email, loadRecipientData(r.email, r.recordRef))
  return { to: r.email, from: msg.from, subject: msg.subject, html: msg.html, text: msg.text, headers: msg.headers }
}

export const testCampaign = (id: string, to = '') => {
  const c = campaign(id)
  to = to || c.getString('test_to')
  const addrs = to
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)
    .map((address) => ({ address }))
  if (!addrs.length) throw new Error('set a test address (test_to)')
  delete varsCache[c.id]
  const r = firstRecipient(c)
  const msg = buildMessage(c, r.email, loadRecipientData(r.email, r.recordRef))
  msg.to = addrs
  msg.subject = '[TEST] ' + msg.subject
  $app.newMailClient().send(msg)
}

// --- the sender (driven by a cron every minute) ---------------------------------------------------------------

const sentToday = () => {
  const row = new DynamicModel({ n: 0 }) as { n: number }
  const start = new Date().toISOString().slice(0, 10) + ' 00:00:00.000Z'
  $app
    .db()
    .newQuery(`SELECT COUNT(*) AS n FROM ${BM_SENDS} WHERE status = 'sent' AND sent_at >= {:start}`)
    .bind({ start })
    .one(row)
  return row.n
}

/** PocketHost rule (EE): only verified users get platform mail. Returns a skip reason or ''. */
const eeSkipReason = (recordRef: string) => {
  if (!recordRef.startsWith('users:')) return ''
  try {
    const u = $app.findRecordById('users', recordRef.slice(6))
    if (!u.verified()) return 'unverified'
    if (u.getBool('unsubscribe')) return 'unsubscribed'
  } catch (_e) {
    return 'user deleted'
  }
  return ''
}

const sendOne = (c: core.Record, send: core.Record) => {
  const email = send.getString('email')
  send.set('attempts', send.getInt('attempts') + 1)
  const save = () => {
    $app.save(send)
    refreshCounters(c)
    const done = c.getInt('sent') + c.getInt('failed')
    if (done >= BRAKE_MIN && c.getInt('failed') / done > BRAKE_RATE) {
      setStatus(
        c,
        'paused',
        `Paused automatically: ${c.getInt('failed')} of ${done} sends failed. Check the failures, then resume.`
      )
    }
  }

  const skip = isSuppressed(email) ? 'suppressed' : eeSkipReason(send.getString('record_ref'))
  if (skip) {
    send.set('status', 'skipped')
    send.set('reason', skip)
    return save()
  }

  try {
    const msg = buildMessage(c, email, loadRecipientData(email, send.getString('record_ref')))
    $app.newMailClient().send(msg)
    send.set('status', 'sent')
    send.set('reason', '')
    send.set('sent_at', nowStr())
    send.set('message_id', msg.headers['Message-ID'] || '')
  } catch (e) {
    const err = `${e}`
    send.set('reason', err)
    const permanent = /\b5\d\d\b/.test(err)
    if (permanent || send.getInt('attempts') >= MAX_ATTEMPTS) {
      send.set('status', 'failed')
    } else {
      const backoffMin = send.getInt('attempts') * send.getInt('attempts')
      send.set('retry_at', new Date(Date.now() + backoffMin * 60000).toISOString().replace('T', ' '))
    }
  }
  save()
}

/** One unit of sender work. Returns ms to wait before the next step, or -1 when there's nothing to do. */
export const senderStep = (): number => {
  const log = mkLog('bulkmail')
  const now = nowStr()
  const { rate, daily } = bulkMailLimits()

  const due = $app.findRecordsByFilter(
    BM_CAMPAIGNS,
    `status = 'scheduled' && scheduled_at <= {:now}`,
    'scheduled_at',
    1,
    0,
    { now }
  )
  if (due[0]) {
    try {
      queueAndSend(due[0])
    } catch (e) {
      setStatus(due[0], 'paused', `Couldn't start: ${e}`)
    }
    return 0
  }

  const sending = $app.findRecordsByFilter(BM_CAMPAIGNS, `status = 'sending'`, 'started_at', 0, 0)
  if (!sending.length) return -1
  if (sentToday() >= daily) {
    for (const c of sending) {
      if (c && !c.getString('status_reason').startsWith('Daily limit')) {
        setStatus(c, 'sending', `Daily limit of ${daily} reached; continues after midnight UTC.`)
      }
    }
    return -1
  }

  for (const c of sending) {
    if (!c) continue
    const next = $app.findRecordsByFilter(
      BM_SENDS,
      `campaign = {:c} && status = 'queued' && (retry_at = '' || retry_at <= {:now})`,
      'created',
      1,
      0,
      { c: c.id, now }
    )
    if (!next[0]) {
      const pending = $app.findRecordsByFilter(BM_SENDS, `campaign = {:c} && status = 'queued'`, '', 1, 0, { c: c.id })
      if (!pending.length) {
        refreshCounters(c)
        setStatus(c, 'done')
        log(`campaign ${c.id} done`)
      }
      continue
    }
    if (c.getString('status_reason').startsWith('Daily limit')) c.set('status_reason', '')
    sendOne(c, next[0])
    let r = rate
    const own = c.getFloat('rate_per_sec')
    if (own > 0 && own < r) r = own
    return Math.round(1000 / r)
  }
  return -1
}

const LOCK_KEY = 'bulkmail.sender.lock'

/** Cron body: send for up to ~55 s, one runner at a time. */
export const runBulkMailSender = () => {
  const log = mkLog('bulkmail')
  const held = $app.store().get(LOCK_KEY) as number | undefined
  if (held && Date.now() - held < 120000) return
  $app.store().set(LOCK_KEY, Date.now())
  const stopAt = Date.now() + 55000
  try {
    while (Date.now() < stopAt) {
      const wait = senderStep()
      if (wait < 0) break
      if (wait > 0) sleep(wait)
    }
  } catch (e) {
    log(`sender error: ${e}`)
  } finally {
    $app.store().remove(LOCK_KEY)
  }
}
