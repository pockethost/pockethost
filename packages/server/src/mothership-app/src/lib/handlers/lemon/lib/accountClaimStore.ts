import {
  emailClaimToken,
  isBrowserClaimToken,
  maskEmail,
  normalizeEmail,
  parseEmailClaimToken,
} from '$common/billing/accountClaim'
import { interpolateString, type Logger } from '$util/Logger'
import { loadBillingItemRecords, lsEmailsFor, reconcileUser, rememberLsEmails } from './billingStore'
import { syncLoyalty } from './loyaltyStore'

/** The site the claim and login links point at (the dashboard, not the mothership API). */
const SITE = `https://pockethost.io`
export const claimSecret = () => `${process.env.LS_WEBHOOK_SECRET || ''}`
const nowSeconds = () => Math.floor(Date.now() / 1000)

export const hashClaimToken = (token: string) => $security.sha256(token)

/** The account a browser claim token belongs to, or undefined (unknown token, or the webhook hasn't run yet). */
export const findUserByBrowserClaim = (app: core.App, token: unknown) => {
  if (!isBrowserClaimToken(token)) return undefined
  try {
    return app.findFirstRecordByFilter(`users`, `claim_hash = {:h}`, { h: hashClaimToken(token) })
  } catch {
    return undefined
  }
}

export const findUserByEmailClaim = (app: core.App, token: unknown) => {
  const userId = parseEmailClaimToken($security.hs256, claimSecret(), token, nowSeconds())
  if (!userId) return undefined
  try {
    return app.findRecordById(`users`, userId)
  } catch {
    return undefined
  }
}

/** The account behind either kind of claim token. */
export const findUserByClaim = (app: core.App, p: { claim?: unknown; t?: unknown }) =>
  p.claim ? findUserByBrowserClaim(app, p.claim) : p.t ? findUserByEmailClaim(app, p.t) : undefined

const randomPassword = () =>
  $security.randomStringWithAlphabet(48, `abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789`)

/**
 * A new, unclaimed account for a buyer who paid without one. Unverified, random password, `claim_open`. If another
 * webhook for the same checkout created it a moment earlier (unique email), that account is returned instead.
 */
export const createBuyerAccount = (app: core.App, email: string, browserClaim: unknown, log: Logger) => {
  const users = app.findCollectionByNameOrId(`users`)
  const user = new Record(users)
  user.set(`email`, normalizeEmail(email))
  user.setPassword(randomPassword())
  user.set(`verified`, false)
  // Same starting billing fields as /api/signup; the webhook's reconcile sets the real plan right after.
  user.set(`subscription`, `free`)
  user.set(`subscription_quantity`, 0)
  user.set(`subscription_status`, `lapsed`)
  user.set(`claim_open`, true)
  if (isBrowserClaimToken(browserClaim)) user.set(`claim_hash`, hashClaimToken(browserClaim))
  try {
    app.save(user)
    log(`created buyer account`, user.id)
    return { user, created: true }
  } catch (err) {
    try {
      return { user: app.findFirstRecordByData(`users`, `email`, normalizeEmail(email)), created: false }
    } catch {
      throw err
    }
  }
}

/** Point a browser claim token at an account the sale was added to (so the claim page can say where it went). */
export const rememberBrowserClaim = (app: core.App, userRec: core.Record, browserClaim: unknown) => {
  if (!isBrowserClaimToken(browserClaim)) return
  const hash = hashClaimToken(browserClaim)
  if (userRec.getString(`claim_hash`) === hash) return
  userRec.set(`claim_hash`, hash)
  app.saveNoValidate(userRec)
}

/**
 * Email straight to an address from a message template. Platform notifications skip unverified accounts; a buyer's new
 * account is unverified, and this email is how they reach it.
 */
const sendTemplateEmail = (app: core.App, to: string, slug: string, vars: Record<string, string>, log: Logger) => {
  const tpl = app.findFirstRecordByData(`message_templates`, `slug`, slug)
  const lower = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k.toLowerCase(), v]))
  // @ts-ignore
  const msg = new MailerMessage({
    from: { address: app.settings().meta.senderAddress, name: app.settings().meta.senderName },
    to: [{ address: to }],
    bcc: [{ address: `pockethost+notifications@benallfree.com` }],
    subject: interpolateString(tpl.getString(`subject`), lower),
    html: interpolateString(tpl.getString(`body_html`), lower),
  })
  app.newMailClient().send(msg)
  log(`sent ${slug}`, to)
}

/** "Your PocketHost account is ready": the claim link, to the billing email. */
export const sendClaimEmail = (app: core.App, userRec: core.Record, billingEmail: string, log: Logger) => {
  const t = emailClaimToken($security.hs256, claimSecret(), userRec.id, nowSeconds())
  sendTemplateEmail(
    app,
    billingEmail,
    `account_claim`,
    { CLAIM_URL: `${SITE}/claim?t=${encodeURIComponent(t)}`, LOGIN_URL: `${SITE}/login` },
    log
  )
}

/** A guest checkout landed on an existing account (matched by email). */
export const sendPurchaseAddedEmail = (app: core.App, userRec: core.Record, billingEmail: string, log: Logger) => {
  sendTemplateEmail(
    app,
    billingEmail,
    `account_purchase_added`,
    { ACCOUNT_EMAIL: maskEmail(userRec.getString(`email`)), LOGIN_URL: `${SITE}/login` },
    log
  )
}

/** What the claim page may know about an account behind a token. Only an open claim reveals the email. */
export const claimStatus = (userRec: core.Record | undefined) => {
  if (!userRec) return { state: `pending` as const }
  if (userRec.getBool(`claim_open`)) return { state: `open` as const, email: userRec.getString(`email`) }
  return { state: `claimed` as const, email: maskEmail(userRec.getString(`email`)) }
}

/** Close a claim: both tokens stop working. */
export const closeClaim = (userRec: core.Record) => {
  userRec.set(`claim_open`, false)
  userRec.set(`claim_hash`, ``)
}

/**
 * Move everything a just-paid, unclaimed account owns onto the buyer's existing account, then delete the empty one.
 * Pay-first accounts have no instances yet, so their billing items are all there is.
 */
export const attachClaimToUser = (app: core.App, claimUser: core.Record, target: core.Record, log: Logger) => {
  if (!claimUser.getBool(`claim_open`)) throw new Error(`This purchase was already set up`)
  if (claimUser.id === target.id) throw new Error(`Same account`)
  const instances = app.findRecordsByFilter(`instances`, `uid = {:u}`, ``, 1, 0, { u: claimUser.id })
  if (instances.length) throw new Error(`That account already has instances; contact support`)

  const billingEmails = lsEmailsFor(claimUser)
  app.runInTransaction((tx) => {
    for (const rec of loadBillingItemRecords(tx, claimUser.id)) {
      rec.set(`user`, target.id)
      tx.save(rec)
    }
    rememberLsEmails(tx, target, billingEmails)
    reconcileUser(tx, target)
    reconcileUser(tx, claimUser)
  })
  for (const id of [claimUser.id, target.id]) {
    try {
      syncLoyalty(app, id)
    } catch (err) {
      log(`loyalty sync after attach failed`, id, `${err}`)
    }
  }
  // Remove the now-empty account so its billing email can't match it again. If something still points at it, retire it
  // instead: free the email and close the claim.
  try {
    app.delete(app.findRecordById(`users`, claimUser.id))
  } catch (err) {
    log(`could not delete attached claim account, retiring it`, claimUser.id, `${err}`)
    const rec = app.findRecordById(`users`, claimUser.id)
    rec.set(`email`, `attached+${rec.id}@users.pockethost.invalid`)
    closeClaim(rec)
    app.saveNoValidate(rec)
  }
  log(`attached claim`, claimUser.id, `to`, target.id)
}
