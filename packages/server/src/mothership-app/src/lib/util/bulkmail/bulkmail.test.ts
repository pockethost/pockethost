import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { convertLegacyTemplate, normalizeEmail, parseTemplate, renderTemplate } from './template'
import { parseUnsubscribeToken, unsubscribeToken } from './token'

const hs256 = (text: string, secret: string) => createHmac('sha256', secret).update(text, 'utf8').digest('hex')
const secret = '0123456789abcdef0123456789abcdef'

describe('unsubscribe tokens', () => {
  it('match the PocketBase CE ext/bulkmail Go implementation byte for byte', () => {
    // from bm.UnsubscribeToken("Ann.Ü@Example.test", "w1vjr1edr5tsam3") with the same secret (Go, ext/bulkmail)
    const fromGo = 'YW5uLsO8QGV4YW1wbGUudGVzdAp3MXZqcjFlZHI1dHNhbTM.7B65tepDQ-iJdohh-MX5IA'
    expect(unsubscribeToken(hs256, secret, 'Ann.Ü@Example.test', 'w1vjr1edr5tsam3')).toBe(fromGo)
    expect(parseUnsubscribeToken(hs256, secret, fromGo)).toEqual({
      email: 'ann.ü@example.test',
      campaignId: 'w1vjr1edr5tsam3',
    })
  })

  it('rejects tampered tokens and other secrets', () => {
    const t = unsubscribeToken(hs256, secret, 'a@b.test', 'c1')
    expect(parseUnsubscribeToken(hs256, secret, t.slice(0, -2) + 'xx')).toBeNull()
    expect(parseUnsubscribeToken(hs256, 'other', t)).toBeNull()
    expect(parseUnsubscribeToken(hs256, secret, 'nope')).toBeNull()
  })
})

describe('templates (same semantics as CE template.go)', () => {
  const data = { record: { name: '<Ann>', has_sftp: true, plan: '' }, promo: 'X' }
  it.each([
    ['Hi {{record.name}}', 'Hi &lt;Ann&gt;'],
    ['{{if record.has_sftp}}A{{else}}B{{end}}', 'A'],
    ['{{if record.plan}}A{{else}}B{{end}}', 'B'],
    ['{{if !record.plan}}free{{end}}', 'free'],
    ['{{if record.has_sftp}}{{if promo}}{{promo}}{{end}}{{end}}', 'X'],
    ['{{ missing.path }}|', '|'],
  ])('%s', (src, want) => {
    expect(renderTemplate(src, data, true)).toBe(want)
  })

  it('rejects bad syntax', () => {
    for (const bad of ['{{if x}}', '{{end}}', '{{else}}', '{{a b}}', '{{if x}}{{else}}{{else}}{{end}}']) {
      expect(() => parseTemplate(bad)).toThrow()
    }
  })

  it('converts legacy {$Var} placeholders (keys were matched lowercased)', () => {
    expect(convertLegacyTemplate('Hi {$Name}, {$count} left')).toBe('Hi {{name}}, {{count}} left')
  })

  it('normalizes emails', () => {
    expect(normalizeEmail('  Ann@Example.TEST ')).toBe('ann@example.test')
    expect(normalizeEmail('not an email')).toBe('')
  })
})
