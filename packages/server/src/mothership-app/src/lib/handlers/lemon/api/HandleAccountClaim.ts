import { looksLikeEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from '$common/billing/accountClaim'
import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { attachClaimToUser, claimStatus, closeClaim, findUserByClaim } from '../lib/accountClaimStore'
import { rememberLsEmails } from '../lib/billingStore'

/**
 * Pay-first account claim (common/billing/accountClaim.ts). The body carries `claim` (browser token) or `t` (emailed
 * token).
 *
 * - `POST /api/claim/status`: pending (webhook not in yet) | open (with the billing email) | claimed (masked email).
 * - `POST /api/claim/complete` `{ email, password }`: set the account email and password, close the claim, log in.
 * - `POST /api/claim/attach` (logged in): move the purchase onto the caller's existing account instead.
 */

type ClaimBody = { claim?: string; t?: string; email?: string; password?: string }

/** Via requestInfo (cached): recordAuthResponse reads the request info again, so the raw body must not be consumed. */
const readBody = (e: core.RequestEvent): ClaimBody => (e.requestInfo().body || {}) as ClaimBody

const tokenOf = (b: ClaimBody) => ({ claim: b.claim, t: b.t })

export const HandleClaimStatus = (e: core.RequestEvent) => {
  const body = readBody(e)
  if (!body.claim && !body.t) throw new BadRequestError(`claim or t is required`)
  return e.json(200, claimStatus(findUserByClaim($app, tokenOf(body))))
}

export const HandleClaimComplete = (e: core.RequestEvent) => {
  const log = mkLog(`claim`)
  const audit = mkAudit(log, $app)
  const body = readBody(e)
  const user = findUserByClaim($app, tokenOf(body))
  if (!user) throw new BadRequestError(`This link isn't valid or has expired.`)
  if (!user.getBool(`claim_open`)) throw new BadRequestError(`This account is already set up. Log in instead.`)

  const email = normalizeEmail(body.email)
  const password = `${body.password || ''}`
  if (!looksLikeEmail(email)) throw new BadRequestError(`Enter a valid email address.`)
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(`Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  const billingEmail = normalizeEmail(user.getString(`email`))
  const changed = email !== billingEmail
  if (changed) {
    let taken = false
    try {
      $app.findFirstRecordByData(`users`, `email`, email)
      taken = true
    } catch {}
    if (taken) {
      throw new BadRequestError(`That email already has an account. Log in to add this purchase to it.`)
    }
    user.setEmail(email)
    user.setVerified(false)
    // Keep the billing email so renewals, refunds and later purchases still find this account. (After setEmail:
    // the account's own email counts as known.)
    rememberLsEmails($app, user, [billingEmail])
  } else if (body.t) {
    // The emailed link went to this address, so it's proven.
    user.setVerified(true)
  }
  user.setPassword(password)
  closeClaim(user)
  $app.save(user)

  if (!user.verified()) {
    try {
      $mails.sendRecordVerification($app, user)
    } catch (err) {
      log(`verification email failed`, `${err}`)
    }
  }
  audit(`CLAIM`, `Account claimed${changed ? ` with a different email than billing` : ``}.`, {
    user_id: user.id,
    via: body.t ? `email` : `browser`,
  })
  return $apis.recordAuthResponse(e, user, `password`, null)
}

export const HandleClaimAttach = (e: core.RequestEvent) => {
  const log = mkLog(`claim`)
  const audit = mkAudit(log, $app)
  const target = e.auth
  if (!target || target.collection().name !== `users`) throw new UnauthorizedError(`Log in first`)
  const body = readBody(e)
  const claimUser = findUserByClaim($app, tokenOf(body))
  if (!claimUser) throw new BadRequestError(`This link isn't valid or has expired.`)
  try {
    attachClaimToUser($app, claimUser, $app.findRecordById(`users`, target.id), log)
  } catch (err) {
    throw new BadRequestError(`${err}`.replace(/^Error: /, ``))
  }
  audit(`CLAIM`, `Purchase attached to an existing account.`, { user_id: target.id, from: claimUser.id })
  return e.json(200, { status: `ok` })
}
