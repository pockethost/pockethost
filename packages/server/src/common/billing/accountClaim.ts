/**
 * Pay-first signup: a buyer checks out without an account, the Lemon Squeezy webhook creates one from the order email,
 * and the buyer claims it (picks their account email and a password) with a claim token.
 *
 * Two tokens can claim the same account:
 *
 * - **Browser token:** random, made when the guest checkout is created and passed through LS `custom_data.claim`. The
 *   browser keeps it; the webhook stores its hash on the account.
 * - **Email token:** signed `userId.expiry.sig`, sent to the billing email by the webhook. Valid about 7 days.
 *
 * Claiming with either one closes the claim, so the other stops working. JSVM-safe: plain functions, crypto passed in.
 */

type Hs256 = (data: string, key: string) => string

/** How long the emailed claim link works. */
export const EMAIL_CLAIM_TTL_SECONDS = 7 * 24 * 60 * 60

/** Browser claim tokens are 40 random alphanumerics; anything else is rejected before hashing. */
export const BROWSER_CLAIM_TOKEN_LENGTH = 40
export const isBrowserClaimToken = (token: unknown): token is string =>
  typeof token === `string` && new RegExp(`^[A-Za-z0-9]{${BROWSER_CLAIM_TOKEN_LENGTH}}$`).test(token)

const emailClaimSig = (hs256: Hs256, secret: string, userId: string, exp: number) =>
  hs256(`account-claim:${userId}:${exp}`, secret)

export const emailClaimToken = (hs256: Hs256, secret: string, userId: string, nowSeconds: number) => {
  const exp = Math.floor(nowSeconds) + EMAIL_CLAIM_TTL_SECONDS
  return `${userId}.${exp}.${emailClaimSig(hs256, secret, userId, exp)}`
}

/** The user id from a valid, unexpired email claim token, else undefined. */
export const parseEmailClaimToken = (hs256: Hs256, secret: string, token: unknown, nowSeconds: number) => {
  if (!secret || typeof token !== `string`) return undefined
  const [userId, expStr, sig, extra] = token.split(`.`)
  if (!userId || !expStr || !sig || extra !== undefined) return undefined
  const exp = Number(expStr)
  if (!Number.isInteger(exp) || exp < nowSeconds) return undefined
  return emailClaimSig(hs256, secret, userId, exp) === sig ? userId : undefined
}

/** `b***@example.com`, to say which account a purchase went to without revealing the address to anyone holding a link. */
export const maskEmail = (email: string) => {
  const [name = ``, domain = ``] = `${email}`.split(`@`)
  if (!domain) return `***`
  return `${name.slice(0, 1)}***@${domain}`
}

export const normalizeEmail = (email: unknown) => `${email ?? ``}`.trim().toLowerCase()

/** Loose check before PocketBase's own validation; enough to give a clear message on the claim form. */
export const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const MIN_PASSWORD_LENGTH = 8
