import { client } from '$src/pocketbase-client'
import { derived, get, writable, type Readable } from 'svelte/store'

/** Where an edge is, as customers see it. `country` is ISO 3166-1 alpha-2 (for a flag); may be ''. */
export type Region = { id: string; name: string; country: string }

/**
 * Edge record id -> its region, from the mothership's `edge_regions` view (the only fleet data customers can read).
 * Views send no realtime events, so it's loaded once and refetched when an instance names an edge not in it.
 */
const edgeRegions = writable<Record<string, Region>>({})

const REFETCH_MIN_MS = 30_000
let loaded = false
let inFlight: Promise<void> | undefined
let lastFetch = 0

type EdgeRegionRow = { id: string; region: string; name: string; country: string }

const load = () => {
  if (inFlight) return inFlight
  lastFetch = Date.now()
  inFlight = client()
    .client.collection('edge_regions')
    .getFullList<EdgeRegionRow>()
    .then((rows) =>
      edgeRegions.set(Object.fromEntries(rows.map((r) => [r.id, { id: r.region, name: r.name, country: r.country }])))
    )
    .catch((e) => console.error('Failed to load edge regions', e))
    .finally(() => {
      inFlight = undefined
    })
  return inFlight
}

/** The region an instance on `edgeId` runs in, or undefined while unknown. */
export const regionOfEdge = (edgeId: string | undefined): Readable<Region | undefined> => {
  if (!loaded) {
    loaded = true
    load()
  } else if (edgeId && !(edgeId in get(edgeRegions)) && Date.now() - lastFetch >= REFETCH_MIN_MS) {
    load() // a new edge, or an instance just moved to one we haven't seen
  }
  return derived(edgeRegions, ($edgeRegions) => (edgeId ? $edgeRegions[edgeId] : undefined))
}
