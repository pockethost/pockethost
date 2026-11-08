import { describe, expect, it } from 'vitest'
import { applySecretsPatch, instanceNameError, invalidSecretKey, patDenial } from './instancePolicy'

const all = { scopes: ['read', 'write'], instanceIds: null }
const scoped = { scopes: ['read', 'write'], instanceIds: ['a1'] }
const readOnly = { scopes: ['read'], instanceIds: null }

describe('patDenial', () => {
  it('lets a write token for all instances change any instance and create', () => {
    expect(patDenial(all, { kind: 'instance', instanceId: 'zz' })).toBeNull()
    expect(patDenial(all, { kind: 'create' })).toBeNull()
  })

  it('lets a scoped write token change only its instances', () => {
    expect(patDenial(scoped, { kind: 'instance', instanceId: 'a1' })).toBeNull()
    expect(patDenial(scoped, { kind: 'instance', instanceId: 'b2' })).toMatchObject({ status: 404 })
  })

  it('refuses create for a scoped token', () => {
    expect(patDenial(scoped, { kind: 'create' })).toMatchObject({ status: 403 })
  })

  it('refuses every write for a read-only token', () => {
    expect(patDenial(readOnly, { kind: 'instance', instanceId: 'a1' })).toMatchObject({ status: 403 })
    expect(patDenial(readOnly, { kind: 'create' })).toMatchObject({ status: 403 })
  })
})

describe('applySecretsPatch', () => {
  it('sets, replaces and removes keys without touching the rest', () => {
    expect(applySecretsPatch({ A: '1', B: '2', C: '3' }, { B: 'two', C: null, D: '4' })).toEqual({
      A: '1',
      B: 'two',
      D: '4',
    })
  })

  it('starts from nothing when there are no secrets yet', () => {
    expect(applySecretsPatch(null, { A: '1' })).toEqual({ A: '1' })
  })

  it('does not mutate the input', () => {
    const current = { A: '1' }
    applySecretsPatch(current, { A: null })
    expect(current).toEqual({ A: '1' })
  })
})

describe('invalidSecretKey', () => {
  it('accepts upper-case names and rejects others', () => {
    expect(invalidSecretKey(['API_KEY', 'X1'])).toBeNull()
    expect(invalidSecretKey(['API_KEY', 'lower'])).toBe('lower')
    expect(invalidSecretKey(['1ABC'])).toBe('1ABC')
  })
})

describe('instanceNameError', () => {
  it.each(['abc', 'my-app', 'a12345678901234567890123456789012345678'])('accepts %s', (n) =>
    expect(instanceNameError(n)).toBeNull()
  )
  it.each(['ab', 'My-App', '1abc', 'a_b', 'a'.repeat(41), ''])('rejects %s', (n) =>
    expect(instanceNameError(n)).not.toBeNull()
  )
})
