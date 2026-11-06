import { describe, expect, it } from 'vitest'
import { lsClaimsFromAudit, lsResourceKeyOfItem, lsResourceKeyOfWebhookData } from './lsClaims'

const webhook = (
  userId: string | undefined,
  type: string,
  id: string | number,
  attributes: { [k: string]: unknown } = {},
  extra: { [k: string]: unknown } = {}
) => ({
  ...extra,
  data: {
    meta: { event_name: 'x', ...(userId === undefined ? {} : { custom_data: { user_id: userId } }) },
    data: { type, id: `${id}`, attributes },
  },
})

describe('lsResourceKeyOfWebhookData', () => {
  it('keys orders, subscriptions and invoices', () => {
    expect(lsResourceKeyOfWebhookData({ type: 'orders', id: '3914363' })).toBe('order:3914363')
    expect(lsResourceKeyOfWebhookData({ type: 'subscriptions', id: 350486 })).toBe('subscription:350486')
    expect(
      lsResourceKeyOfWebhookData({ type: 'subscription-invoices', id: '9', attributes: { subscription_id: 77 } })
    ).toBe('subscription:77')
  })

  it('ignores other or incomplete payloads', () => {
    expect(lsResourceKeyOfWebhookData({ type: 'license-keys', id: '1' })).toBeUndefined()
    expect(lsResourceKeyOfWebhookData({ type: 'orders' })).toBeUndefined()
    expect(lsResourceKeyOfWebhookData({ type: 'subscription-invoices', id: '9' })).toBeUndefined()
    expect(lsResourceKeyOfWebhookData(undefined)).toBeUndefined()
  })
})

describe('lsResourceKeyOfItem', () => {
  it('matches the webhook key for the same resource', () => {
    expect(lsResourceKeyOfItem({ provider: 'lemonsqueezy', kind: 'order', external_id: '3914363' })).toBe(
      lsResourceKeyOfWebhookData({ type: 'orders', id: '3914363' })
    )
  })

  it('is undefined for manual rows', () => {
    expect(lsResourceKeyOfItem({ provider: 'manual', kind: 'manual', external_id: 'baseline:u1' })).toBeUndefined()
  })
})

describe('lsClaimsFromAudit', () => {
  it('ties a resource to the user named in custom_data, whatever the email', () => {
    const claims = lsClaimsFromAudit([
      webhook('u1', 'orders', 3914363, { user_email: ' Account@Example.com ' }),
      webhook('u1', 'subscription-invoices', 5, { subscription_id: 42, user_email: 'other@example.com' }),
    ])
    expect(claims.owners).toEqual({ 'order:3914363': 'u1', 'subscription:42': 'u1' })
    expect(claims.emails).toEqual({ u1: ['account@example.com', 'other@example.com'] })
    expect(claims.conflicts).toEqual([])
  })

  it('never trusts records the old handler matched by email', () => {
    const claims = lsClaimsFromAudit([
      webhook('u1', 'orders', 1, { user_email: 'a@example.com' }, { user_id_source: 'email' }),
    ])
    expect(claims.owners).toEqual({})
    expect(claims.emails).toEqual({})
  })

  it('skips records without custom_data and junk contexts', () => {
    const claims = lsClaimsFromAudit([webhook(undefined, 'orders', 1), null, 'nope', 42, {}, webhook('', 'orders', 2)])
    expect(claims).toEqual({ owners: {}, emails: {}, conflicts: [] })
  })

  it('drops a resource two users claim, even if a third record repeats one of them', () => {
    const claims = lsClaimsFromAudit([
      webhook('u1', 'subscriptions', 9),
      webhook('u2', 'subscriptions', 9),
      webhook('u1', 'subscriptions', 9),
      webhook('u1', 'orders', 10),
    ])
    expect(claims.owners).toEqual({ 'order:10': 'u1' })
    expect(claims.conflicts).toEqual(['subscription:9'])
  })

  it('repeated events for the same owner are not a conflict', () => {
    const claims = lsClaimsFromAudit([webhook('u1', 'subscriptions', 9), webhook('u1', 'subscriptions', 9)])
    expect(claims.owners).toEqual({ 'subscription:9': 'u1' })
    expect(claims.conflicts).toEqual([])
  })
})
