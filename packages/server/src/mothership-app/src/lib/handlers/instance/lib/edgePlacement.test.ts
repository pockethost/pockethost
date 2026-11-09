import { describe, expect, it } from 'vitest'
import { isEdgeHealthyAt, isRegionName, pickEdgeForRegion, type PlacementEdge } from './edgePlacement'

const NOW = Date.parse('2026-11-09T19:00:00Z')
const ago = (s: number) => new Date(NOW - s * 1000).toISOString().replace('T', ' ')
const edge = (id: string, region: string, secondsAgo: number, status = 'online'): PlacementEdge => ({
  id,
  region,
  status,
  last_seen: ago(secondsAgo),
})

describe('isEdgeHealthyAt', () => {
  it('needs a heartbeat within 30 s and no clean-shutdown status', () => {
    expect(isEdgeHealthyAt(edge('a', 'sfo', 5), NOW)).toBe(true)
    expect(isEdgeHealthyAt(edge('a', 'sfo', 30), NOW)).toBe(true)
    expect(isEdgeHealthyAt(edge('a', 'sfo', 31), NOW)).toBe(false)
    expect(isEdgeHealthyAt(edge('a', 'sfo', 1, 'offline'), NOW)).toBe(false)
    expect(isEdgeHealthyAt({ id: 'a', region: 'sfo', status: 'online', last_seen: '' }, NOW)).toBe(false)
  })
})

describe('pickEdgeForRegion', () => {
  const edges = [edge('ams2', 'ams', 3), edge('ams1', 'ams', 3), edge('sfo', 'sfo', 3), edge('ams3', 'ams', 90)]
  it('picks a healthy edge in the region with the fewest instances', () => {
    expect(pickEdgeForRegion(edges, { ams1: 10, ams2: 2 }, 'ams', NOW)?.id).toBe('ams2')
    expect(pickEdgeForRegion(edges, { ams1: 1, ams2: 2 }, 'ams', NOW)?.id).toBe('ams1')
  })
  it('breaks ties by id and never picks a stale edge or another region', () => {
    expect(pickEdgeForRegion(edges, {}, 'ams', NOW)?.id).toBe('ams1')
    expect(pickEdgeForRegion([edge('ams3', 'ams', 90)], {}, 'ams', NOW)).toBeUndefined()
    expect(pickEdgeForRegion(edges, {}, 'fra', NOW)).toBeUndefined()
    expect(pickEdgeForRegion(edges, {}, 'sfo', NOW)?.id).toBe('sfo')
  })
})

describe('isRegionName', () => {
  it('accepts short lowercase names only', () => {
    expect(isRegionName('ams')).toBe(true)
    expect(isRegionName('us-east')).toBe(true)
    expect(isRegionName('AMS')).toBe(false)
    expect(isRegionName('a')).toBe(false)
    expect(isRegionName("ams' OR 1=1")).toBe(false)
  })
})
