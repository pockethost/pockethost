import { describe, expect, it } from 'vitest'
import type { EdgeFields } from '../../../../../common'
import { createStaleEdgeProbe, decideRoute, edgeHeaders } from './edgeRouting'

const NOW = Date.parse('2026-11-09T19:00:00Z')
const seen = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString().replace('T', ' ')

const mkEdge = (id: string, edge_id: string, secondsAgo: number, status: EdgeFields['status'] = 'online'): EdgeFields =>
  ({
    id,
    edge_id,
    label: edge_id,
    region: edge_id.slice(0, 3),
    internal_url: `http://${edge_id}:8080`,
    last_seen: seen(secondsAgo),
    status,
  }) as EdgeFields

const mirrorWith = (edges: EdgeFields[]) => ({
  getEdge: (id: string) => edges.find((e) => e.id === id),
  getEdgeByEdgeId: (edgeId: string) => edges.find((e) => e.edge_id === edgeId),
})

describe('decideRoute', () => {
  const sfo = mkEdge('E_SFO', 'sfo', 2)
  const ams = mkEdge('E_AMS', 'ams-1', 2)

  it('serves unknown hosts and own instances locally', () => {
    const m = mirrorWith([sfo, ams])
    expect(decideRoute(undefined, m, 'sfo', NOW)).toEqual({ kind: 'local' })
    expect(decideRoute({ edge: 'E_SFO' }, m, 'sfo', NOW)).toEqual({ kind: 'local' })
    expect(decideRoute({ edge: 'E_AMS' }, m, 'ams-1', NOW)).toEqual({ kind: 'local' })
  })

  it('forwards to the owner edge when it is healthy', () => {
    const m = mirrorWith([sfo, ams])
    expect(decideRoute({ edge: 'E_AMS' }, m, 'sfo', NOW)).toMatchObject({ kind: 'remote', edge: { edge_id: 'ams-1' } })
    expect(decideRoute({ edge: 'E_SFO' }, m, 'ams-1', NOW)).toMatchObject({ kind: 'remote', edge: { edge_id: 'sfo' } })
  })

  it('treats instances without an edge as living on the legacy sfo edge', () => {
    const m = mirrorWith([sfo, ams])
    expect(decideRoute({ edge: '' }, m, 'sfo', NOW)).toEqual({ kind: 'local' })
    expect(decideRoute({}, m, 'ams-1', NOW)).toMatchObject({ kind: 'remote', edge: { edge_id: 'sfo' } })
  })

  it('fails fast when the owner is silent past 30 s, shut down cleanly, unknown or has no address', () => {
    expect(decideRoute({ edge: 'E_AMS' }, mirrorWith([sfo, mkEdge('E_AMS', 'ams-1', 31)]), 'sfo', NOW).kind).toBe(
      'unavailable'
    )
    expect(
      decideRoute({ edge: 'E_AMS' }, mirrorWith([sfo, mkEdge('E_AMS', 'ams-1', 1, 'offline')]), 'sfo', NOW).kind
    ).toBe('unavailable')
    expect(decideRoute({ edge: 'E_GONE' }, mirrorWith([sfo]), 'sfo', NOW).kind).toBe('unavailable')
    expect(decideRoute({ edge: 'E_AMS' }, mirrorWith([sfo, { ...ams, internal_url: '' }]), 'sfo', NOW).kind).toBe(
      'unavailable'
    )
  })

  it('still forwards within the 30 s window (the proxy holds and retries if it cannot connect)', () => {
    expect(decideRoute({ edge: 'E_AMS' }, mirrorWith([sfo, mkEdge('E_AMS', 'ams-1', 29)]), 'sfo', NOW).kind).toBe(
      'remote'
    )
  })
})

describe('edgeHeaders', () => {
  it('reports the entry edge and the edge the request resolved to', () => {
    expect(edgeHeaders({ name: 'ams-1', region: 'ams' }, { name: 'sfo', region: 'sfo' })).toEqual({
      'X-PocketHost-Edge-Name': 'ams-1',
      'X-PocketHost-Edge-Region': 'ams',
      'X-PocketHost-Origin-Name': 'sfo',
      'X-PocketHost-Origin-Region': 'sfo',
    })
  })

  it('leaves out the origin when the owner edge is unknown', () => {
    expect(edgeHeaders({ name: 'sfo', region: 'sfo' }, undefined)).toEqual({
      'X-PocketHost-Edge-Name': 'sfo',
      'X-PocketHost-Edge-Region': 'sfo',
    })
  })
})

describe('createStaleEdgeProbe', () => {
  const edge = { id: 'E_AMS', internal_url: 'http://ams-1:8080' }

  it('asks the edge directly and reuses the answer within the ttl', async () => {
    let t = 0
    let calls = 0
    const probe = createStaleEdgeProbe(
      async () => {
        calls++
        return true
      },
      5000,
      () => t
    )
    expect(await probe(edge)).toBe(true)
    t = 4999
    expect(await probe(edge)).toBe(true)
    expect(calls).toBe(1)
    t = 5000
    await probe(edge)
    expect(calls).toBe(2)
  })

  it('shares one in-flight probe between concurrent callers', async () => {
    let calls = 0
    let release!: (v: boolean) => void
    const probe = createStaleEdgeProbe(() => {
      calls++
      return new Promise<boolean>((r) => (release = r))
    })
    const a = probe(edge)
    const b = probe(edge)
    release(true)
    expect(await Promise.all([a, b])).toEqual([true, true])
    expect(calls).toBe(1)
  })

  it('treats a missing address or a failing probe as down', async () => {
    const probe = createStaleEdgeProbe(async () => {
      throw new Error('ECONNREFUSED')
    })
    expect(await probe({ id: 'E_X', internal_url: '' })).toBe(false)
    expect(await probe(edge)).toBe(false)
  })
})
