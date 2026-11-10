import { mkLog } from '$util/Logger'
import { listSelectableVersions } from '$util/versions'
import { isAvailable } from '../../signup/isAvailable'
import { DEFAULT_REGION, isRegionName, pickEdgeForRegion, type PlacementEdge } from '../lib/edgePlacement'
import { resolveInstanceCaller } from '../lib/instanceCaller'
import { assertCanCreateInstance } from '../lib/instanceLimits'
import { instanceNameError } from '../lib/instancePolicy'

/** POST /api/instance. Dashboard (JWT) or a personal access token for all instances with write access. */
export const HandleInstanceCreate = (e: core.RequestEvent) => {
  const log = mkLog(`POST:instance`)
  const caller = resolveInstanceCaller(e, { kind: 'create' })
  log(`caller`, JSON.stringify(caller))

  log(`TOP OF POST`)
  let data = new DynamicModel({
    subdomain: '',
    version: listSelectableVersions()[0],
    region: DEFAULT_REGION,
  }) as { subdomain?: string; version?: string; region?: string }

  log(`before bind`)

  e.bindBody(data)

  log(`after bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const { subdomain, version } = data
  const region = String(data.region || DEFAULT_REGION).trim()

  log(`vars`, JSON.stringify({ subdomain }))

  if (!subdomain) {
    throw new BadRequestError(`Subdomain is required when creating an instance.`)
  }
  const nameError = instanceNameError(subdomain)
  if (nameError) throw new BadRequestError(nameError)
  if (!isAvailable(subdomain)) throw new BadRequestError(`Instance name ${subdomain} is not available.`)

  assertCanCreateInstance(caller.userId)

  // The customer picks the region; the mothership picks the edge inside it.
  if (!isRegionName(region)) throw new BadRequestError(`Unknown region ${region}.`)
  try {
    $app.findRecordById('regions', region)
  } catch {
    throw new BadRequestError(`Unknown region ${region}.`)
  }
  const edges: PlacementEdge[] = $app
    .findRecordsByFilter('edges', 'region = {:region}', '', 0, 0, { region })
    .filter((r): r is models.Record => !!r)
    .map((r) => ({
      id: r.id,
      region: r.getString('region'),
      status: r.getString('status'),
      last_seen: r.getString('last_seen'),
    }))
  if (edges.length === 0) throw new BadRequestError(`Unknown region ${region}.`)
  const counts: Record<string, number> = {}
  for (const edge of edges) {
    counts[edge.id] = $app.countRecords('instances', $dbx.hashExp({ edge: edge.id }))
  }
  const edge = pickEdgeForRegion(edges, counts, region, Date.now())
  if (!edge) throw new BadRequestError(`The ${region} region is temporarily unavailable. Please try again in a minute.`)

  const collection = $app.findCollectionByNameOrId('instances')
  const record = new Record(collection)
  record.set('uid', caller.userId)
  record.set('subdomain', subdomain)
  record.set('power', true)
  record.set('status', 'idle')
  record.set('version', version)
  record.set('edge', edge.id)
  record.set('dev', true)
  record.set('syncAdmin', true)
  record.set('autoVacuum', true)

  $app.save(record)

  return e.json(200, { instance: record })
}
