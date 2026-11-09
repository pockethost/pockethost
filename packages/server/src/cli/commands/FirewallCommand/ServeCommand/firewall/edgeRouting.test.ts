import { describe, expect, it } from 'vitest'
import type { EdgeFields } from '../../../../../common'
import { decideRoute } from './edgeRouting'

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
