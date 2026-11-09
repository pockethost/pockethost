/** How long an edge may go without a heartbeat before it can't take new instances. Same window the firewalls use. */
export const EDGE_HEALTHY_WINDOW_MS = 30_000

export type PlacementEdge = { id: string; region: string; status: string; last_seen: string }

const seenAt = (raw: string) => Date.parse(String(raw).replace(' ', 'T'))

export const isEdgeHealthyAt = (edge: PlacementEdge, nowMs: number) => {
  if (edge.status === 'offline' || !edge.last_seen) return false
  const seen = seenAt(edge.last_seen)
  return !Number.isNaN(seen) && nowMs - seen <= EDGE_HEALTHY_WINDOW_MS
}

/**
 * The edge a new instance in `region` goes to: a healthy edge in that region with the fewest instances (ties by id, so
 * the choice is stable). Undefined when the region has no healthy edge.
 */
export const pickEdgeForRegion = (
  edges: PlacementEdge[],
  instanceCounts: Record<string, number>,
  region: string,
  nowMs: number
): PlacementEdge | undefined =>
  edges
    .filter((edge) => edge.region === region && isEdgeHealthyAt(edge, nowMs))
    .sort((a, b) => (instanceCounts[a.id] ?? 0) - (instanceCounts[b.id] ?? 0) || (a.id < b.id ? -1 : 1))[0]

/** Regions customers may pick. A region is offered only while it has a healthy edge. */
export const DEFAULT_REGION = 'sfo'
export const isRegionName = (region: string) => /^[a-z][a-z0-9-]{1,31}$/.test(region)
