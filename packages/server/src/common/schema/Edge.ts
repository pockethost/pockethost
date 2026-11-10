import type { BaseFields, RecordId } from '.'

export const EDGE_COLLECTION = 'edges'

/** How long an edge may go without a heartbeat before routing treats it as down. */
export const EDGE_HEALTHY_WINDOW_MS = 30_000

export type EdgeStatus = 'online' | 'stale' | 'offline'

/** A hosting node. Edges register themselves through their heartbeat; the mothership mirror carries them to every edge. */
export type EdgeFields = BaseFields & {
  /** Stable name the edge reports (PH_EDGE_ID), e.g. `sfo`, `ams-1`. */
  edge_id: string
  label: string
  /** Region the edge serves: the slug (= id) of a `regions` record, e.g. `sfo`, `ams`. */
  region: string
  /** Where other edges reach this edge's daemon over the private network, e.g. `http://10.88.0.3:8080`. */
  internal_url: string
  last_seen: string
  status: EdgeStatus
}

export type EdgeRecordsById = { [_: RecordId]: EdgeFields }

/** True when the edge reported in within the window and did not announce a clean shutdown. */
export const isEdgeHealthy = (edge: Pick<EdgeFields, 'last_seen' | 'status'> | undefined, nowMs: number) => {
  if (!edge || edge.status === 'offline' || !edge.last_seen) return false
  const seen = Date.parse(String(edge.last_seen).replace(' ', 'T'))
  return !Number.isNaN(seen) && nowMs - seen <= EDGE_HEALTHY_WINDOW_MS
}

/** The edge every instance created before edges existed belongs to. */
export const LEGACY_EDGE_ID = 'sfo'

/**
 * Whether `instance` runs on the edge `myEdgeId` (PH_EDGE_ID), whose record is `myEdge` (undefined until its first
 * heartbeat reaches the mirror). Instances without an edge belong to the legacy `sfo` edge.
 */
export const isInstanceOnEdge = (
  instance: { edge?: string },
  myEdge: Pick<EdgeFields, 'id'> | undefined,
  myEdgeId: string
) => (instance.edge ? instance.edge === myEdge?.id : myEdgeId === LEGACY_EDGE_ID)
