import { describe, expect, it } from 'vitest'
import { isLegacyPocketBaseVersion, legacyInstances, summarizeLegacyInstances } from './legacySunset'

describe('isLegacyPocketBaseVersion', () => {
  it('flags 0.22 and older', () => {
    expect(isLegacyPocketBaseVersion('0.22.*')).toBe(true)
    expect(isLegacyPocketBaseVersion('0.22.58')).toBe(true)
    expect(isLegacyPocketBaseVersion('0.7.*')).toBe(true)
  })

  it('leaves 0.23 and later alone', () => {
    expect(isLegacyPocketBaseVersion('0.23.*')).toBe(false)
    expect(isLegacyPocketBaseVersion('0.41.1')).toBe(false)
    expect(isLegacyPocketBaseVersion('1.0.*')).toBe(false)
  })

  it('ignores missing or malformed versions', () => {
    expect(isLegacyPocketBaseVersion(undefined)).toBe(false)
    expect(isLegacyPocketBaseVersion('')).toBe(false)
    expect(isLegacyPocketBaseVersion('latest')).toBe(false)
  })
})

const inst = (subdomain: string, version: string) => ({ id: `id-${subdomain}`, subdomain, version })

describe('legacyInstances', () => {
  it('keeps only 0.22 and older, sorted by name, from a record or an array', () => {
    const byId = {
      a: inst('zeta', '0.22.*'),
      b: inst('alpha', '0.41.*'),
      c: inst('cornage', '0.19.3'),
    }
    expect(legacyInstances(byId).map((i) => i.subdomain)).toEqual(['cornage', 'zeta'])
    expect(legacyInstances(Object.values(byId)).map((i) => i.subdomain)).toEqual(['cornage', 'zeta'])
  })

  it('is empty when nothing is affected', () => {
    expect(legacyInstances({ a: inst('alpha', '0.23.*') })).toEqual([])
    expect(legacyInstances({})).toEqual([])
  })
})

describe('summarizeLegacyInstances', () => {
  const names = (list: { subdomain: string }[]) => list.map((i) => i.subdomain)

  it('names every instance when there are few', () => {
    const s = summarizeLegacyInstances([inst('a', '0.22.*'), inst('b', '0.22.*')])
    expect(s.current).toBeUndefined()
    expect(names(s.named)).toEqual(['a', 'b'])
    expect(s.hidden).toEqual([])
    expect(s.total).toBe(2)
  })

  it('puts the open instance first and counts it against the limit', () => {
    const list = ['a', 'b', 'c', 'd', 'e'].map((n) => inst(n, '0.22.*'))
    const s = summarizeLegacyInstances(list, 'id-c', 3)
    expect(s.current?.subdomain).toBe('c')
    expect(names(s.named)).toEqual(['a', 'b'])
    expect(names(s.hidden)).toEqual(['d', 'e'])
    expect(s.total).toBe(5)
  })

  it('collapses the rest behind "and N more" past the limit', () => {
    const list = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => inst(n, '0.22.*'))
    const s = summarizeLegacyInstances(list, undefined, 3)
    expect(names(s.named)).toEqual(['a', 'b', 'c'])
    expect(names(s.hidden)).toEqual(['d', 'e', 'f'])
  })

  it('never hides a single instance behind "and 1 more"', () => {
    const list = ['a', 'b', 'c', 'd'].map((n) => inst(n, '0.22.*'))
    const s = summarizeLegacyInstances(list, undefined, 3)
    expect(names(s.named)).toEqual(['a', 'b', 'c', 'd'])
    expect(s.hidden).toEqual([])
  })

  it('ignores an open instance that is not affected', () => {
    const s = summarizeLegacyInstances([inst('a', '0.22.*')], 'id-other')
    expect(s.current).toBeUndefined()
    expect(names(s.named)).toEqual(['a'])
  })

  it('handles the open instance being the only one', () => {
    const s = summarizeLegacyInstances([inst('a', '0.22.*')], 'id-a')
    expect(s.current?.subdomain).toBe('a')
    expect(s.named).toEqual([])
    expect(s.hidden).toEqual([])
    expect(s.total).toBe(1)
  })
})
