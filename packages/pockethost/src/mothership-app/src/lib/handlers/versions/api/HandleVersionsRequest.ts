import { listVersions } from '$util/versions'

/** Return a list of available PocketBase versions */
export const HandleVersionsRequest = (e: core.RequestEvent) => {
  return e.json(200, { versions: listVersions() })
}
