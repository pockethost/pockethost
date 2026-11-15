import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  EMAIL_CLAIM_TTL_SECONDS,
  emailClaimToken,
  isBrowserClaimToken,
  looksLikeEmail,
  maskEmail,
  parseEmailClaimToken,
} from './accountClaim'

const hs256 = (data: string, key: string) => createHmac(`sha256`, key).update(data).digest(`hex`)
const SECRET = `s3cret`
const NOW = 1_800_000_000

describe(`email claim token`, () => {
  it(`round-trips to the user id`, () => {
    const t = emailClaimToken(hs256, SECRET, `user123`, NOW)
    expect(parseEmailClaimToken(hs256, SECRET, t, NOW)).toBe(`user123`)
    expect(parseEmailClaimToken(hs256, SECRET, t, NOW + EMAIL_CLAIM_TTL_SECONDS)).toBe(`user123`)
  })

  it(`expires`, () => {
    const t = emailClaimToken(hs256, SECRET, `user123`, NOW)
    expect(parseEmailClaimToken(hs256, SECRET, t, NOW + EMAIL_CLAIM_TTL_SECONDS + 1)).toBeUndefined()
  })

  it(`rejects tampering, other secrets and junk`, () => {
    const t = emailClaimToken(hs256, SECRET, `user123`, NOW)
    const [, exp, sig] = t.split(`.`)
    expect(parseEmailClaimToken(hs256, SECRET, `user999.${exp}.${sig}`, NOW)).toBeUndefined()
    expect(parseEmailClaimToken(hs256, SECRET, `user123.${Number(exp) + 999}.${sig}`, NOW)).toBeUndefined()
    expect(parseEmailClaimToken(hs256, `other`, t, NOW)).toBeUndefined()
    expect(parseEmailClaimToken(hs256, ``, t, NOW)).toBeUndefined()
    expect(parseEmailClaimToken(hs256, SECRET, `${t}.x`, NOW)).toBeUndefined()
    expect(parseEmailClaimToken(hs256, SECRET, undefined, NOW)).toBeUndefined()
    expect(parseEmailClaimToken(hs256, SECRET, `abc`, NOW)).toBeUndefined()
  })
})

describe(`browser claim token`, () => {
  it(`accepts 40 alphanumerics only`, () => {
    expect(isBrowserClaimToken(`a`.repeat(40))).toBe(true)
    expect(isBrowserClaimToken(`a`.repeat(39))).toBe(false)
    expect(isBrowserClaimToken(`a`.repeat(39) + `-`)).toBe(false)
    expect(isBrowserClaimToken(undefined)).toBe(false)
  })
})

describe(`helpers`, () => {
  it(`masks emails`, () => {
    expect(maskEmail(`ben@example.com`)).toBe(`b***@example.com`)
    expect(maskEmail(`nope`)).toBe(`***`)
  })
  it(`checks email shape`, () => {
    expect(looksLikeEmail(`a@b.co`)).toBe(true)
    expect(looksLikeEmail(`a@b`)).toBe(false)
    expect(looksLikeEmail(`a b@c.de`)).toBe(false)
  })
})
