import { listSelectableVersions } from '$util/versions'

/** PocketBase versions a user may pick (0.23+). Legacy versions still run but are not offered. */
export const HandleVersionsRequest = (e: core.RequestEvent) => {
  return e.json(200, { versions: listSelectableVersions() })
}
